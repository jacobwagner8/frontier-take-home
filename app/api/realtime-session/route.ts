import { NextResponse } from "next/server";
import { buildTutorSystemPrompt } from "@/lib/tutorPrompt";

export const runtime = "nodejs";

const REALTIME_MODEL = "gpt-realtime";
const REALTIME_VOICE = "verse";

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const resp = await fetch(
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
            output: { voice: REALTIME_VOICE },
          },
        },
      }),
    },
  );

  if (!resp.ok) {
    const detail = await resp.text();
    return NextResponse.json(
      { error: "Failed to mint Realtime session", status: resp.status, detail },
      { status: 502 },
    );
  }

  const data = await resp.json();
  return NextResponse.json(data);
}
