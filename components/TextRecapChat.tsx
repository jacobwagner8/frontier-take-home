"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onDone: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function TextRecapChat({ onDone }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
          context: "voice_fallback",
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
            "Sorry, the chat service is unavailable right now. Try again in a moment.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="log"
        aria-live="polite"
        aria-atomic="false"
        className="rounded-lg border border-slate-200 bg-slate-50 p-3 min-h-[140px] flex flex-col gap-2"
      >
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Recap what you learned in your own words.
          </p>
        )}
        {messages.map((m, i) => (
          <p key={i} className="text-sm leading-relaxed">
            <span className="font-semibold mr-1">
              {m.role === "user" ? "You:" : "Tutor:"}
            </span>
            {m.content}
          </p>
        ))}
        {busy && (
          <p className="text-sm text-slate-400" aria-live="polite">
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
      <button
        type="button"
        onClick={onDone}
        className="self-end px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium"
      >
        Done
      </button>
    </div>
  );
}
