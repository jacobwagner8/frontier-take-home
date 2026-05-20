import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ZodSchema } from "zod";

export interface OpenAIClientLike {
  chat: {
    completions: {
      parse: (req: unknown) => Promise<{
        choices: Array<{
          message: { parsed: unknown; refusal: string | null };
          finish_reason: string;
        }>;
      }>;
    };
  };
}

export interface CallJudgeRequest<T> {
  systemMessage: string;
  userMessage: string;
  responseSchema: ZodSchema<T>;
  schemaName: string;
}

export interface CallJudgeOptions {
  model: string;
  client?: OpenAIClientLike;
}

let defaultClient: OpenAIClientLike | null = null;
function getDefaultClient(): OpenAIClientLike {
  if (!defaultClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env.local or your shell before running the eval engine.",
      );
    }
    defaultClient = new OpenAI({ apiKey }) as unknown as OpenAIClientLike;
  }
  return defaultClient;
}

export async function callJudge<T>(
  req: CallJudgeRequest<T>,
  opts: CallJudgeOptions,
): Promise<{ parsed: T; raw: unknown }> {
  const client = opts.client ?? getDefaultClient();
  const responseFormat = zodResponseFormat(req.responseSchema, req.schemaName);

  const doCall = async () =>
    client.chat.completions.parse({
      model: opts.model,
      messages: [
        { role: "system", content: req.systemMessage },
        { role: "user", content: req.userMessage },
      ],
      response_format: responseFormat,
    });

  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  let response;
  try {
    response = await doCall();
  } catch (firstErr) {
    await wait(500);
    try {
      response = await doCall();
    } catch (secondErr) {
      throw new Error(
        `Judge call failed twice. First: ${(firstErr as Error).message}. Second: ${(secondErr as Error).message}`,
      );
    }
  }

  const choice = response.choices[0];
  if (choice.message.refusal) {
    throw new Error(`Judge model refused: ${choice.message.refusal}`);
  }
  if (choice.message.parsed == null) {
    throw new Error("Judge returned no parsed output and no refusal");
  }
  return { parsed: choice.message.parsed as T, raw: response };
}
