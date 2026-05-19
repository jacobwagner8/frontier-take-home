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
        // Click on the dialog's backdrop has target === the dialog itself
        // (clicks on inner content have inner targets).
        if (e.target === dialogRef.current) requestClose();
      }}
      aria-labelledby={titleId}
      className="w-full max-w-md max-h-[80dvh] bg-white rounded-2xl p-0 m-auto backdrop:bg-black/40"
    >
      <div className="flex flex-col max-h-[80dvh]">
        <header className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h3 id={titleId} className="font-semibold text-sm">
            Ask a follow-up
          </h3>
          <button
            type="button"
            onClick={requestClose}
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
    </dialog>
  );
}
