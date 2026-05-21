import { NextResponse } from "next/server";
import { buildTutorSystemPrompt } from "@/lib/tutorPrompt";

export const runtime = "nodejs";

const REALTIME_MODEL = "gpt-realtime";
const REALTIME_VOICE = "verse";
const UPSTREAM_TIMEOUT_MS = 10_000;

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model: REALTIME_MODEL,
            instructions: buildTutorSystemPrompt(),
            audio: {
              input: {
                turn_detection: { type: "semantic_vad", eagerness: "low" },
              },
              output: { voice: REALTIME_VOICE },
            },
          },
        }),
        signal: controller.signal,
      },
    );
  } catch (err) {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      console.error(
        `[realtime-session] upstream timed out after ${UPSTREAM_TIMEOUT_MS}ms`,
      );
      return NextResponse.json(
        { error: "Realtime upstream timed out" },
        { status: 504 },
      );
    }
    console.error("[realtime-session] upstream fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to mint Realtime session" },
      { status: 502 },
    );
  }
  clearTimeout(timer);

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    console.error(
      `[realtime-session] upstream returned ${resp.status}: ${detail}`,
    );
    return NextResponse.json(
      { error: "Failed to mint Realtime session" },
      { status: 502 },
    );
  }

  const data = await resp.json();
  return NextResponse.json(data);
}
