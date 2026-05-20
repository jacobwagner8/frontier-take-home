import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { callJudge, type OpenAIClientLike } from "@/experimental/eval-engine/judge/openaiJudge";
import { majorityVote } from "@/experimental/eval-engine/judge/majorityVote";

const Schema = z.object({ verdict: z.enum(["yes", "no"]), reason: z.string() });

function makeMockClient(parsed: unknown): OpenAIClientLike {
  return {
    beta: {
      chat: {
        completions: {
          parse: vi.fn(async () => ({
            choices: [{ message: { parsed, refusal: null }, finish_reason: "stop" }],
          })),
        },
      },
    },
  };
}

describe("callJudge", () => {
  it("returns parsed structured output on success", async () => {
    const client = makeMockClient({ verdict: "yes", reason: "because" });
    const { parsed } = await callJudge(
      { systemMessage: "sys", userMessage: "u", responseSchema: Schema, schemaName: "v" },
      { model: "gpt-4o", client },
    );
    expect(parsed).toEqual({ verdict: "yes", reason: "because" });
  });

  it("throws a clear error when the model refuses", async () => {
    const client: OpenAIClientLike = {
      beta: {
        chat: {
          completions: {
            parse: vi.fn(async () => ({
              choices: [{ message: { parsed: null, refusal: "I cannot." }, finish_reason: "stop" }],
            })),
          },
        },
      },
    };
    await expect(
      callJudge(
        { systemMessage: "s", userMessage: "u", responseSchema: Schema, schemaName: "v" },
        { model: "gpt-4o", client },
      ),
    ).rejects.toThrow(/refus/i);
  });

  it("retries once on parse failure and succeeds the second time", async () => {
    let n = 0;
    const client: OpenAIClientLike = {
      beta: {
        chat: {
          completions: {
            parse: vi.fn(async () => {
              n++;
              if (n === 1) throw new Error("zod parse failed");
              return { choices: [{ message: { parsed: { verdict: "no", reason: "x" }, refusal: null }, finish_reason: "stop" }] };
            }),
          },
        },
      },
    };
    const { parsed } = await callJudge(
      { systemMessage: "s", userMessage: "u", responseSchema: Schema, schemaName: "v" },
      { model: "gpt-4o", client },
    );
    expect(parsed).toEqual({ verdict: "no", reason: "x" });
    expect(n).toBe(2);
  });
});

describe("majorityVote", () => {
  it("returns the most common result across N runs (keyed)", async () => {
    const results = ["a", "b", "a"];
    let i = 0;
    const result = await majorityVote(async () => results[i++], { n: 3, keyOf: (r) => r });
    expect(result).toBe("a");
  });

  it("breaks ties by returning the first occurrence", async () => {
    const results = ["a", "b"];
    let i = 0;
    const result = await majorityVote(async () => results[i++], { n: 2, keyOf: (r) => r });
    expect(result).toBe("a");
  });
});
