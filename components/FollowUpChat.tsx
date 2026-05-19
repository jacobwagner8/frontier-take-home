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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    inputRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  function requestClose() {
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) requestClose();
      }}
      aria-labelledby={titleId}
      className="w-full max-w-md max-h-[80dvh] bg-surface rounded-3xl p-0 m-auto backdrop:bg-[#1C1917]/40"
    >
      <div className="flex flex-col max-h-[80dvh]">
        <header className="px-5 py-4 border-b border-border flex justify-between items-center">
          <h3 id={titleId} className="font-semibold text-base text-text-strong">
            Ask a follow-up
          </h3>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close follow-up chat"
            className="text-text-subtle text-sm hover:text-text-strong"
          >
            Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <p className="text-[14px] text-text-subtle">
              Ask anything about why this is wrong.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`text-[14px] leading-relaxed ${
                m.role === "user" ? "text-text-strong" : "text-text"
              }`}
            >
              <span className="font-semibold mr-1">
                {m.role === "user" ? "You:" : "Tutor:"}
              </span>
              {m.content}
            </div>
          ))}
          {busy && (
            <p className="text-[14px] text-text-subtle" aria-live="polite">
              Thinking...
            </p>
          )}
        </div>
        <div className="p-4 border-t border-border flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Type your question"
            aria-label="Your question"
            className="flex-1 border border-border rounded-xl px-4 py-3 text-base bg-canvas focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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
      </div>
    </dialog>
  );
}
