export interface RealtimeSession {
  pc: RTCPeerConnection;
  remoteAudio: HTMLAudioElement;
  dataChannel: RTCDataChannel;
  stop: () => void;
}

interface StartArgs {
  ephemeralKey: string;
  onTranscript?: (text: string, role: "user" | "assistant") => void;
  /** Fires when the assistant finishes a turn — use to close the current
   * transcript line so the next delta starts a new line. */
  onAssistantTurnComplete?: () => void;
  onError?: (err: Error) => void;
}

const SDP_TIMEOUT_MS = 10_000;

/**
 * Opens a WebRTC peer connection to the OpenAI Realtime API.
 *
 * The ephemeral token already encodes the model + session config that the
 * server-side /api/realtime-session route registered, so we don't pass
 * model here.
 *
 * If any step after mic acquisition fails, the mic tracks are stopped and
 * the peer connection is closed before the error propagates — otherwise
 * the OS mic indicator would stay lit.
 */
export async function startRealtimeSession({
  ephemeralKey,
  onTranscript,
  onAssistantTurnComplete,
  onError,
}: StartArgs): Promise<RealtimeSession> {
  const pc = new RTCPeerConnection();

  const remoteAudio = document.createElement("audio");
  remoteAudio.autoplay = true;
  pc.ontrack = (e) => {
    remoteAudio.srcObject = e.streams[0];
  };

  const mic = await navigator.mediaDevices.getUserMedia({ audio: true });

  const teardown = () => {
    for (const t of mic.getTracks()) t.stop();
    pc.close();
    remoteAudio.srcObject = null;
  };

  let dataChannel: RTCDataChannel;
  try {
    for (const track of mic.getTracks()) pc.addTrack(track, mic);

    dataChannel = pc.createDataChannel("oai-events");
    dataChannel.addEventListener("message", (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "response.audio_transcript.delta") {
          onTranscript?.(msg.delta ?? "", "assistant");
        } else if (msg.type === "response.audio_transcript.done") {
          onAssistantTurnComplete?.();
        } else if (
          msg.type === "conversation.item.input_audio_transcription.completed"
        ) {
          onTranscript?.(msg.transcript ?? "", "user");
        } else if (msg.type === "error") {
          onError?.(new Error(msg.error?.message ?? "Realtime error"));
        }
      } catch {
        // ignore non-JSON frames
      }
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpController = new AbortController();
    const sdpTimer = setTimeout(
      () => sdpController.abort(),
      SDP_TIMEOUT_MS,
    );
    let sdpResp: Response;
    try {
      sdpResp = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
        signal: sdpController.signal,
      });
    } catch (err) {
      if (sdpController.signal.aborted) {
        throw new Error(
          `Realtime SDP exchange timed out after ${SDP_TIMEOUT_MS}ms`,
        );
      }
      throw err;
    } finally {
      clearTimeout(sdpTimer);
    }

    if (!sdpResp.ok) {
      const text = await sdpResp.text();
      throw new Error(
        `Realtime SDP exchange failed: ${sdpResp.status} ${text}`,
      );
    }

    const answer: RTCSessionDescriptionInit = {
      type: "answer",
      sdp: await sdpResp.text(),
    };
    await pc.setRemoteDescription(answer);
  } catch (err) {
    teardown();
    throw err;
  }

  const stop = () => {
    dataChannel.close();
    teardown();
  };

  return { pc, remoteAudio, dataChannel, stop };
}
