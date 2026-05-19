"use client";

import { useEffect, useId, useRef, useState } from "react";

interface Props {
  misconceptionTag: string;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function FollowUpChat({ misconceptionTag, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
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

  async function send() {
    if (!input.trim() || busy) return;
    const next: Message[] = [
      ...messages,
      { role: "user", content: input.trim() },
    ];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: "follow_up",
          misconceptionTag,
          messages: next,
        }),
      });
      if (!resp.ok) throw new Error("chat failed");
      const data = await resp.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "(no reply)" },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, the follow-up service is unavailable right now. Try again in a moment.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

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
