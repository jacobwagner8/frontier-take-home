export interface RealtimeSession {
  pc: RTCPeerConnection;
  remoteAudio: HTMLAudioElement;
  dataChannel: RTCDataChannel;
  stop: () => void;
}

interface StartArgs {
  ephemeralKey: string;
  onTranscript?: (text: string, role: "user" | "assistant") => void;
  onError?: (err: Error) => void;
}

/**
 * Opens a WebRTC peer connection to the OpenAI Realtime API.
 *
 * The ephemeral token already encodes the model + session config that the
 * server-side /api/realtime-session route registered, so we don't pass
 * model here.
 */
export async function startRealtimeSession({
  ephemeralKey,
  onTranscript,
  onError,
}: StartArgs): Promise<RealtimeSession> {
  const pc = new RTCPeerConnection();

  const remoteAudio = document.createElement("audio");
  remoteAudio.autoplay = true;
  pc.ontrack = (e) => {
    remoteAudio.srcObject = e.streams[0];
  };

  const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
  for (const track of mic.getTracks()) pc.addTrack(track, mic);

  const dataChannel = pc.createDataChannel("oai-events");
  dataChannel.addEventListener("message", (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === "response.audio_transcript.delta") {
        onTranscript?.(msg.delta ?? "", "assistant");
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

  const sdpResp = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ephemeralKey}`,
      "Content-Type": "application/sdp",
    },
    body: offer.sdp,
  });

  if (!sdpResp.ok) {
    const text = await sdpResp.text();
    throw new Error(`Realtime SDP exchange failed: ${sdpResp.status} ${text}`);
  }

  const answer: RTCSessionDescriptionInit = {
    type: "answer",
    sdp: await sdpResp.text(),
  };
  await pc.setRemoteDescription(answer);

  const stop = () => {
    dataChannel.close();
    pc.close();
    for (const t of mic.getTracks()) t.stop();
    remoteAudio.srcObject = null;
  };

  return { pc, remoteAudio, dataChannel, stop };
}
