import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import {
  learningGoalCoverageEvaluator,
  coverageResponseSchema,
  buildCoverageCriteria,
} from "@/experimental/eval-engine/evaluators/learningGoalCoverage";
import { loadKG } from "@/experimental/eval-engine/kg";
import type { Curriculum } from "@/lib/curriculum.types";

type CoverageShape = z.infer<typeof coverageResponseSchema>;

const minimalCurriculum: Curriculum = {
  reading1: { id: "r1", title: "T", body: "The summary." },
  mcq1: { id: "m1", prompt: "Q?", options: [{ id: "a", text: "ok", isCorrect: true }] },
  mcq1b: { id: "m1b", prompt: "Q1b?", options: [{ id: "a", text: "ok", isCorrect: true }] },
  mcq1c: { id: "m1c", prompt: "Q1c?", options: [{ id: "a", text: "ok", isCorrect: true }] },
  simulationCaptions: { oneBond: "o", twoBond: { mechanism: "m", consequence: "c", hazard: "h" } },
  mcq2: { id: "m2", prompt: "Q2?", options: [{ id: "a", text: "ok", isCorrect: true }] },
  voiceTutor: { groundingFacts: [], openingPrompt: "open" },
};

const kg = loadKG({
  learningGoals: [
    {
      type: "LearningGoal",
      id: "lg.test",
      question: "Q",
      summary: "the summary",
      prerequisites: [],
      teaches: ["fact.a", "fact.b"],
      addresses: ["misc.x", "misc.y"],
    },
  ],
  atomicFacts: [
    { type: "AtomicFact", id: "fact.a", statement: "A", scope: "test", confidence: "high", cites: [] },
    { type: "AtomicFact", id: "fact.b", statement: "B", scope: "test", confidence: "high", cites: [] },
  ],
  misconceptions: [
    { type: "Misconception", id: "misc.x", name: "X", statement: "x", correction: "c", correctedBy: [] },
    { type: "Misconception", id: "misc.y", name: "Y", statement: "y", correction: "c", correctedBy: [] },
  ],
  sources: [],
});
const ctx = kg.resolveContext("lg.test");

describe("buildCoverageCriteria", () => {
  it("yields 1 summary + 1-per-fact + 1-per-misconception", () => {
    const criteria = buildCoverageCriteria(ctx);
    const ids = criteria.map((c) => c.id);
    expect(ids).toContain("summary");
    expect(ids).toContain("teaches:fact.a");
    expect(ids).toContain("teaches:fact.b");
    expect(ids).toContain("addresses:misc.x");
    expect(ids).toContain("addresses:misc.y");
    expect(criteria).toHaveLength(5);
  });
});

function mockJudgeWith(response: CoverageShape) {
  return vi.fn(async () => ({ parsed: response, raw: {} }));
}

describe("learningGoalCoverageEvaluator aggregation", () => {
  it("rates 4 when all teaches met and 80%+ addresses met-or-partial", async () => {
    const judge = mockJudgeWith({
      criteria: [
        { criterion_id: "summary", verdict: "met", reasoning: "s", evidence_excerpts: ["x"] },
        { criterion_id: "teaches:fact.a", verdict: "met", reasoning: "a", evidence_excerpts: ["y"] },
        { criterion_id: "teaches:fact.b", verdict: "met", reasoning: "b", evidence_excerpts: ["z"] },
        { criterion_id: "addresses:misc.x", verdict: "met", reasoning: "x", evidence_excerpts: ["w"] },
        { criterion_id: "addresses:misc.y", verdict: "partial", reasoning: "y", evidence_excerpts: [] },
      ],
    });
    const result = await learningGoalCoverageEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(4);
  });

  it("rates 2 / Gaps when any non-summary teaches criterion is missing", async () => {
    const judge = mockJudgeWith({
      criteria: [
        { criterion_id: "summary", verdict: "met", reasoning: "s", evidence_excerpts: [] },
        { criterion_id: "teaches:fact.a", verdict: "met", reasoning: "a", evidence_excerpts: [] },
        { criterion_id: "teaches:fact.b", verdict: "missing", reasoning: "b not taught", evidence_excerpts: [] },
        { criterion_id: "addresses:misc.x", verdict: "met", reasoning: "x", evidence_excerpts: [] },
        { criterion_id: "addresses:misc.y", verdict: "met", reasoning: "y", evidence_excerpts: [] },
      ],
    });
    const result = await learningGoalCoverageEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(2);
  });

  it("rates 1 / Off-target when the summary criterion is missing", async () => {
    const judge = mockJudgeWith({
      criteria: [
        { criterion_id: "summary", verdict: "missing", reasoning: "no summary", evidence_excerpts: [] },
        { criterion_id: "teaches:fact.a", verdict: "met", reasoning: "a", evidence_excerpts: [] },
        { criterion_id: "teaches:fact.b", verdict: "met", reasoning: "b", evidence_excerpts: [] },
        { criterion_id: "addresses:misc.x", verdict: "met", reasoning: "x", evidence_excerpts: [] },
        { criterion_id: "addresses:misc.y", verdict: "met", reasoning: "y", evidence_excerpts: [] },
      ],
    });
    const result = await learningGoalCoverageEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(1);
  });

  it("calls the judge N times when runs > 1 (majority vote)", async () => {
    const judge = vi.fn(async () => ({
      parsed: {
        criteria: [
          { criterion_id: "summary", verdict: "met" as const, reasoning: "s", evidence_excerpts: ["x"] },
          { criterion_id: "teaches:fact.a", verdict: "met" as const, reasoning: "a", evidence_excerpts: [] },
          { criterion_id: "teaches:fact.b", verdict: "met" as const, reasoning: "b", evidence_excerpts: [] },
          { criterion_id: "addresses:misc.x", verdict: "met" as const, reasoning: "x", evidence_excerpts: [] },
          { criterion_id: "addresses:misc.y", verdict: "met" as const, reasoning: "y", evidence_excerpts: [] },
        ],
      },
      raw: {},
    }));
    await learningGoalCoverageEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      runs: 2,
      __judge: judge,
    } as any);
    expect(judge).toHaveBeenCalledTimes(2);
  });

  it("rates 4 when the learning goal has zero addressed misconceptions (vacuous coverage)", async () => {
    const kgNoMisc = loadKG({
      learningGoals: [
        {
          type: "LearningGoal",
          id: "lg.no-misc",
          question: "?",
          summary: "no misconceptions here",
          prerequisites: [],
          teaches: ["fact.a"],
          addresses: [],
        },
      ],
      atomicFacts: [
        { type: "AtomicFact", id: "fact.a", statement: "A", scope: "test", confidence: "high", cites: [] },
      ],
      misconceptions: [],
      sources: [],
    });
    const ctxNoMisc = kgNoMisc.resolveContext("lg.no-misc");
    const judge = vi.fn(async () => ({
      parsed: {
        criteria: [
          { criterion_id: "summary", verdict: "met" as const, reasoning: "s", evidence_excerpts: [] },
          { criterion_id: "teaches:fact.a", verdict: "met" as const, reasoning: "a", evidence_excerpts: [] },
        ],
      },
      raw: {},
    }));
    const result = await learningGoalCoverageEvaluator.evaluate(minimalCurriculum, ctxNoMisc, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(4);
  });

  it("rates 3 / Adequate when teaches are met-or-partial and 50%+ misconceptions covered", async () => {
    const judge = mockJudgeWith({
      criteria: [
        { criterion_id: "summary", verdict: "met", reasoning: "s", evidence_excerpts: [] },
        { criterion_id: "teaches:fact.a", verdict: "partial", reasoning: "a", evidence_excerpts: [] },
        { criterion_id: "teaches:fact.b", verdict: "met", reasoning: "b", evidence_excerpts: [] },
        { criterion_id: "addresses:misc.x", verdict: "met", reasoning: "x", evidence_excerpts: [] },
        { criterion_id: "addresses:misc.y", verdict: "missing", reasoning: "y", evidence_excerpts: [] },
      ],
    });
    const result = await learningGoalCoverageEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(3);
  });
});
