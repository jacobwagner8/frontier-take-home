import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import {
  factualAccuracyEvaluator,
  factualAccuracyResponseSchema,
} from "@/experimental/eval-engine/evaluators/factualAccuracy";
import { loadKG } from "@/experimental/eval-engine/kg";
import type { Curriculum } from "@/lib/curriculum.types";

type JudgeShape = z.infer<typeof factualAccuracyResponseSchema>;

const minimalCurriculum: Curriculum = {
  reading1: { id: "r1", title: "T", body: "Subpanels keep N and EGC isolated." },
  mcq1: {
    id: "m1",
    prompt: "Q?",
    options: [
      { id: "a", text: "Correct.", isCorrect: true },
      {
        id: "b",
        text: "Subpanels need their own bond.",
        isCorrect: false,
        remediation: "No.",
        misconceptionTag: "misc.subpanels-need-own-bond",
      },
    ],
  },
  simulationCaptions: { oneBond: "o", twoBond: { mechanism: "m", consequence: "c", hazard: "h" } },
  mcq2: { id: "m2", prompt: "Q2?", options: [{ id: "a", text: "ok", isCorrect: true }] },
  voiceTutor: { groundingFacts: ["fact1"], openingPrompt: "open" },
};

const kg = loadKG({
  learningGoals: [
    {
      type: "LearningGoal",
      id: "lg.test",
      question: "Q?",
      summary: "S",
      prerequisites: [],
      teaches: ["fact.a"],
      addresses: ["misc.subpanels-need-own-bond"],
    },
  ],
  atomicFacts: [
    {
      type: "AtomicFact",
      id: "fact.a",
      statement: "A is true.",
      scope: "test",
      confidence: "high",
      cites: [],
    },
  ],
  misconceptions: [
    {
      type: "Misconception",
      id: "misc.subpanels-need-own-bond",
      name: "Subpanels need their own bond",
      statement: "wrong",
      correction: "right",
      correctedBy: ["fact.a"],
    },
  ],
  sources: [],
});
const ctx = kg.resolveContext("lg.test");

function mockJudgeWith(response: JudgeShape) {
  return vi.fn(async () => ({ parsed: response, raw: {} }));
}

describe("factualAccuracyEvaluator aggregation", () => {
  it("rates 4 / Accurate when all claims supported and no unexpected contradictions", async () => {
    const judge = mockJudgeWith({
      items: [
        {
          slot_kind: "reading",
          slot_detail: "body",
          claim_text: "Subpanels keep N and EGC isolated.",
          verdict: "supported",
          reasoning: "matches fact.a",
          cited_kg_ids: ["fact.a"],
          confidence: "high",
        },
      ],
    });
    const result = await factualAccuracyEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(4);
    expect(result.unsureItems).toHaveLength(0);
  });

  it("rates 2 / Concerns on one contradicted-unexpected", async () => {
    const judge = mockJudgeWith({
      items: [
        {
          slot_kind: "reading",
          slot_detail: "body",
          claim_text: "wrong",
          verdict: "contradicted-unexpected",
          reasoning: "x",
          cited_kg_ids: ["fact.a"],
          confidence: "high",
        },
        {
          slot_kind: "reading",
          slot_detail: "body",
          claim_text: "ok",
          verdict: "supported",
          reasoning: "y",
          cited_kg_ids: ["fact.a"],
          confidence: "high",
        },
      ],
    });
    const result = await factualAccuracyEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(2);
  });

  it("rates 1 / Failing on >=2 contradicted-unexpected", async () => {
    const judge = mockJudgeWith({
      items: [
        { slot_kind: "reading", slot_detail: "body", claim_text: "x", verdict: "contradicted-unexpected", reasoning: "x", cited_kg_ids: [], confidence: "high" },
        { slot_kind: "reading", slot_detail: "body", claim_text: "y", verdict: "contradicted-unexpected", reasoning: "y", cited_kg_ids: [], confidence: "high" },
      ],
    });
    const result = await factualAccuracyEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(1);
  });

  it("treats contradicted-expected on wrong MCQ options as non-failing", async () => {
    const judge = mockJudgeWith({
      items: [
        {
          slot_kind: "mcqOption",
          slot_detail: "m1.b.text",
          claim_text: "Subpanels need their own bond.",
          verdict: "contradicted-expected",
          reasoning: "matches misc.subpanels-need-own-bond",
          cited_kg_ids: ["misc.subpanels-need-own-bond"],
          confidence: "high",
        },
        {
          slot_kind: "reading",
          slot_detail: "body",
          claim_text: "ok",
          verdict: "supported",
          reasoning: "y",
          cited_kg_ids: [],
          confidence: "high",
        },
      ],
    });
    const result = await factualAccuracyEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(4);
  });

  it("calls the judge N times when runs > 1 (majority vote)", async () => {
    const judge = vi.fn(async () => ({
      parsed: {
        items: [
          {
            slot_kind: "reading",
            slot_detail: "body",
            claim_text: "x",
            verdict: "supported" as const,
            reasoning: "y",
            cited_kg_ids: [],
            confidence: "high" as const,
          },
        ],
      },
      raw: {},
    }));
    await factualAccuracyEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      runs: 2,
      __judge: judge,
    } as any);
    expect(judge).toHaveBeenCalledTimes(2);
  });

  it("surfaces unsupported claims into unsureItems but does not auto-fail", async () => {
    const judge = mockJudgeWith({
      items: [
        { slot_kind: "reading", slot_detail: "body", claim_text: "novel claim", verdict: "unsupported", reasoning: "not in KG", cited_kg_ids: [], confidence: "low" },
        { slot_kind: "reading", slot_detail: "body", claim_text: "ok", verdict: "supported", reasoning: "y", cited_kg_ids: ["fact.a"], confidence: "high" },
      ],
    });
    const result = await factualAccuracyEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.unsureItems).toHaveLength(1);
    expect(result.unsureItems[0].verdict).toBe("unsupported");
    expect(result.rating).toBeGreaterThanOrEqual(3);
  });
});
