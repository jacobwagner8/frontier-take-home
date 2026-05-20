"use client";

import { useState } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseChatOptions {
  /** Returns the body to POST to /api/chat for a given conversation. */
  buildBody: (messages: ChatMessage[]) => unknown;
  /** Fires once per accepted user send, after input/busy guards pass. */
  onUserSent?: () => void;
}

interface UseChatResult {
  messages: ChatMessage[];
  input: string;
  setInput: (s: string) => void;
  busy: boolean;
  send: () => Promise<void>;
}

export function useChat({ buildBody, onUserSent }: UseChatOptions): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!input.trim() || busy) return;
    onUserSent?.();
    const next: ChatMessage[] = [
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
        body: JSON.stringify(buildBody(next)),
      });
      if (!resp.ok) throw new Error("chat failed");
      const data = await resp.json();
      const reply = typeof data.reply === "string" ? data.reply.trim() : "";
      if (!reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "The tutor didn't have a response — try rephrasing your question.",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: reply },
        ]);
      }
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

  return { messages, input, setInput, busy, send };
}
