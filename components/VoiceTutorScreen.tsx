"use client";

import { useEffect, useRef, useState } from "react";
import {
  startRealtimeSession,
  type RealtimeSession,
} from "@/lib/realtimeClient";

interface Props {
  onAdvance: () => void;
  onFallbackToText: () => void;
}

type Status = "idle" | "connecting" | "live" | "error" | "stopped";

interface TranscriptLine {
  role: "user" | "assistant";
  text: string;
}

export function VoiceTutorScreen({ onAdvance, onFallbackToText }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const sessionRef = useRef<RealtimeSession | null>(null);

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
            const last = prev[prev.length - 1];
            if (last && last.role === role && role === "assistant") {
              return [
                ...prev.slice(0, -1),
                { role, text: last.text + text },
              ];
            }
            return [...prev, { role, text }];
          });
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
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Talk it back</h2>
      <p className="text-sm text-slate-700">
        Last step: have a quick voice conversation with the tutor to make sure
        the concept stuck. Tap Start, allow microphone access, and explain in
        your own words.
      </p>

      <div
        role="log"
        aria-live="polite"
        aria-atomic="false"
        className="rounded-lg border border-slate-200 bg-slate-50 p-3 min-h-[140px]"
      >
        {transcript.length === 0 && (
          <p className="text-sm text-slate-500">
            {status === "idle" && "Tap Start to begin."}
            {status === "connecting" && "Connecting..."}
            {status === "live" && "Listening..."}
            {status === "stopped" && "Conversation ended."}
            {status === "error" && (errorMsg ?? "Something went wrong.")}
          </p>
        )}
        {transcript.map((line, i) => (
          <p key={i} className="text-sm leading-relaxed">
            <span className="font-semibold mr-1">
              {line.role === "user" ? "You:" : "Tutor:"}
            </span>
            {line.text}
          </p>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        {inactive ? (
          <>
            <button
              type="button"
              onClick={onFallbackToText}
              className="px-4 py-2.5 rounded-lg border border-slate-300 font-medium"
            >
              Type instead
            </button>
            <button
              type="button"
              onClick={startCall}
              className="px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium"
            >
              {status === "stopped" || status === "error" ? "Try again" : "Start"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={stopCall}
              className="px-4 py-2.5 rounded-lg border border-slate-300 font-medium"
            >
              Stop
            </button>
            <button
              type="button"
              onClick={() => {
                stopCall();
                onAdvance();
              }}
              className="px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium"
            >
              Done
            </button>
          </>
        )}
      </div>
    </section>
  );
}
