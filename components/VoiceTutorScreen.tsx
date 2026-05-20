"use client";

import { useEffect, useRef, useState } from "react";
import {
  startRealtimeSession,
  type RealtimeSession,
} from "@/lib/realtimeClient";
import { LessonFooter } from "./LessonFooter";
import { TextRecapChat } from "./TextRecapChat";

interface Props {
  onAdvance: () => void;
  onBack?: () => void;
}

type Status = "idle" | "connecting" | "live" | "error" | "stopped";
type Mode = "voice" | "text";

interface TranscriptLine {
  role: "user" | "assistant";
  text: string;
}

export function VoiceTutorScreen({ onAdvance, onBack }: Props) {
  const [mode, setMode] = useState<Mode>("voice");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const sessionRef = useRef<RealtimeSession | null>(null);
  /** True while the assistant is mid-turn — incoming deltas append to the
   * last line. Closed by response.audio_transcript.done so a fresh
   * assistant turn (with no user transcript between them) starts a new
   * line instead of merging. */
  const assistantTurnOpenRef = useRef(false);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  async function startCall() {
    setStatus("connecting");
    setErrorMsg(null);
    try {
      const tokenResp = await fetch("/api/realtime-session", {
        method: "POST",
      });
      if (!tokenResp.ok) {
        const detail = await tokenResp.text().catch(() => "");
        throw new Error(
          `Could not mint session token (${tokenResp.status})${detail ? `: ${detail}` : ""}`,
        );
      }
      const session = await tokenResp.json();
      // GA shape: ephemeral token lives at `value`.
      const ephemeralKey: string | undefined = session.value;
      if (!ephemeralKey) {
        throw new Error("Missing ephemeral key on session response");
      }

      const rt = await startRealtimeSession({
        ephemeralKey,
        onTranscript: (text, role) => {
          setTranscript((prev) => {
            if (role === "user") {
              assistantTurnOpenRef.current = false;
              return [...prev, { role, text }];
            }
            if (assistantTurnOpenRef.current) {
              const last = prev[prev.length - 1];
              return [
                ...prev.slice(0, -1),
                { role, text: last.text + text },
              ];
            }
            assistantTurnOpenRef.current = true;
            return [...prev, { role, text }];
          });
        },
        onAssistantTurnComplete: () => {
          assistantTurnOpenRef.current = false;
        },
        onError: (err) => {
          setErrorMsg(err.message);
          setStatus("error");
        },
      });
      sessionRef.current = rt;
      setStatus("live");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  function stopCall() {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setStatus("stopped");
  }

  const inactive =
    status === "idle" || status === "stopped" || status === "error";

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-text-strong leading-tight tracking-[-0.005em]">
        Talk it back
      </h2>
      <p className="text-[14px] text-text-muted leading-relaxed">
        {mode === "voice"
          ? "Last step: have a quick voice conversation with the tutor to make sure the concept stuck. Tap Start, allow microphone access, and explain in your own words."
          : "Type a recap of what you learned in your own words. The tutor will respond."}
      </p>

      {mode === "text" ? (
        <TextRecapChat
          onDone={onAdvance}
          onBack={onBack ? () => {
            stopCall();
            onBack();
          } : undefined}
        />
      ) : (
        <>
          <p
            role="status"
            aria-live="polite"
            className="text-[13px] text-text-subtle"
          >
            {status === "idle" && "Tap Start to begin."}
            {status === "connecting" && "Connecting..."}
            {status === "live" && "Listening..."}
            {status === "stopped" && "Conversation ended."}
            {status === "error" && (errorMsg ?? "Something went wrong.")}
          </p>

          <div
            role="log"
            aria-live="polite"
            aria-atomic="false"
            className="rounded-2xl border border-border bg-surface-muted px-4 py-3 min-h-[140px] flex flex-col gap-2"
          >
            {transcript.map((line, i) => (
              <p key={i} className="text-[14px] leading-relaxed text-text">
                <span className="font-semibold mr-1 text-text-strong">
                  {line.role === "user" ? "You:" : "Tutor:"}
                </span>
                {line.text}
              </p>
            ))}
          </div>

          <LessonFooter
            onBack={
              onBack
                ? () => {
                    stopCall();
                    onBack();
                  }
                : undefined
            }
          >
            <div className="flex gap-2">
            {inactive ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    stopCall();
                    setMode("text");
                  }}
                  className="px-4 py-3 rounded-2xl border border-border text-text-strong font-medium hover:bg-canvas"
                >
                  Type instead
                </button>
                <button
                  type="button"
                  onClick={startCall}
                  className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
                >
                  {status === "stopped" || status === "error"
                    ? "Try again"
                    : "Start"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={stopCall}
                  className="px-4 py-3 rounded-2xl border border-border text-text-strong font-medium hover:bg-canvas"
                >
                  Stop
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCall();
                    onAdvance();
                  }}
                  className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
                >
                  Done
                </button>
              </>
            )}
            </div>
          </LessonFooter>
        </>
      )}
    </section>
  );
}
