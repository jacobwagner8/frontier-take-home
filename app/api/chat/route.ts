import { NextResponse } from "next/server";
import { buildTutorSystemPrompt } from "@/lib/tutorPrompt";
import {
  buildFollowUpSystemPrompt,
  findMcqByMisconceptionTag,
} from "@/lib/followUpPrompt";

export const runtime = "nodejs";

const CHAT_MODEL = "gpt-4o-mini";
const UPSTREAM_TIMEOUT_MS = 15_000;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatBody {
  context: "voice_fallback" | "follow_up";
  misconceptionTag?: string;
  messages: ChatMessage[];
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "messages is required and must be non-empty" },
      { status: 400 },
    );
  }

  if (body.context !== "follow_up" && body.context !== "voice_fallback") {
    return NextResponse.json(
      { error: "context must be 'follow_up' or 'voice_fallback'" },
      { status: 400 },
    );
  }

  let systemPrompt: string;
  if (body.context === "follow_up") {
    if (
      body.misconceptionTag &&
      !findMcqByMisconceptionTag(body.misconceptionTag)
    ) {
      console.warn(
        `[chat] follow_up tag "${body.misconceptionTag}" did not match any MCQ option; using generic follow-up prompt`,
      );
    }
    systemPrompt = buildFollowUpSystemPrompt(body.misconceptionTag);
  } else {
    systemPrompt = buildTutorSystemPrompt();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          ...body.messages,
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      console.error(
        `[chat] upstream timed out after ${UPSTREAM_TIMEOUT_MS}ms`,
      );
      return NextResponse.json(
        { error: "Chat upstream timed out" },
        { status: 504 },
      );
    }
    console.error("[chat] upstream fetch failed:", err);
    return NextResponse.json(
      { error: "Chat request failed" },
      { status: 502 },
    );
  }
  clearTimeout(timer);

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    console.error(`[chat] upstream returned ${resp.status}: ${detail}`);
    return NextResponse.json(
      { error: "Chat request failed" },
      { status: 502 },
    );
  }

  const data = await resp.json();
  const reply: string = data.choices?.[0]?.message?.content ?? "";
  return NextResponse.json({ reply });
}
