import { NextResponse } from "next/server";
import { buildTutorSystemPrompt } from "@/lib/tutorPrompt";
import { curriculum } from "@/lib/curriculum";

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

  let systemPrompt = buildTutorSystemPrompt();
  if (body.context === "follow_up" && body.misconceptionTag) {
    const tag = body.misconceptionTag;
    const target = [
      ...curriculum.mcq1.options,
      ...curriculum.mcq2.options,
    ].find((o) => !o.isCorrect && o.misconceptionTag === tag);
    if (target) {
      systemPrompt += `\n\n# Current student context
The student answered a comprehension question incorrectly, picking: "${target.text}".
The remediation they just read: "${target.remediation}"
Their follow-up question is below. Answer it briefly (1-3 sentences), using only the grounding facts above.`;
    }
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
