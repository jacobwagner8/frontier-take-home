"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@/lib/useChat";
import { LessonFooter } from "./LessonFooter";

interface Props {
  onDone: () => void;
  onBack?: () => void;
  onUserSent?: () => void;
}

export function TextRecapChat({ onDone, onBack, onUserSent }: Props) {
  const { messages, input, setInput, busy, send } = useChat({
    buildBody: (msgs) => ({
      context: "voice_fallback",
      messages: msgs,
    }),
    onUserSent,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div
        role="log"
        aria-live="polite"
        aria-atomic="false"
        className="rounded-2xl border border-border bg-surface-muted p-4 min-h-[140px] flex flex-col gap-2"
      >
        {messages.length === 0 && (
          <p className="text-[14px] text-text-subtle">
            Recap what you learned in your own words.
          </p>
        )}
        {messages.map((m, i) => (
          <p key={i} className="text-[14px] leading-relaxed text-text">
            <span className="font-semibold mr-1 text-text-strong">
              {m.role === "user" ? "You:" : "Tutor:"}
            </span>
            {m.content}
          </p>
        ))}
        {busy && (
          <p className="text-[14px] text-text-subtle" aria-live="polite">
            Thinking...
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Recap what you learned"
          aria-label="Your recap"
          className="flex-1 border border-border rounded-xl px-4 py-3 text-base bg-surface focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !input.trim()}
          className="px-4 py-3 rounded-xl bg-brand text-white font-semibold disabled:bg-border disabled:text-text-subtle disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
      <LessonFooter onBack={onBack}>
        <button
          type="button"
          onClick={onDone}
          className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
        >
          Done
        </button>
      </LessonFooter>
    </div>
  );
}
