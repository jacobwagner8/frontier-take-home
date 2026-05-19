"use client";

import { useEffect, useId, useRef } from "react";
import { useChat } from "@/lib/useChat";

interface Props {
  misconceptionTag: string;
  onClose: () => void;
}

export function FollowUpChat({ misconceptionTag, onClose }: Props) {
  const { messages, input, setInput, busy, send } = useChat({
    buildBody: (msgs) => ({
      context: "follow_up",
      misconceptionTag,
      messages: msgs,
    }),
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-2"
    >
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[80dvh]">
        <header className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h3 id={titleId} className="font-semibold text-sm">
            Ask a follow-up
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close follow-up chat"
            className="text-slate-500 text-sm"
          >
            Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {messages.length === 0 && (
            <p className="text-sm text-slate-500">
              Ask anything about why this is wrong.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`text-sm leading-relaxed ${
                m.role === "user" ? "text-slate-900" : "text-slate-700"
              }`}
            >
              <span className="font-semibold mr-1">
                {m.role === "user" ? "You:" : "Tutor:"}
              </span>
              {m.content}
            </div>
          ))}
          {busy && (
            <p className="text-sm text-slate-400" aria-live="polite">
              Thinking...
            </p>
          )}
        </div>
        <div className="p-3 border-t border-slate-200 flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Type your question"
            aria-label="Your question"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-base"
          />
          <button
            type="button"
            onClick={send}
            disabled={busy || !input.trim()}
            className="px-3 py-2 rounded-lg bg-slate-900 text-white font-medium disabled:bg-slate-300"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
