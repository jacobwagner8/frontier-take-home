import { describe, it, expect, vi } from "vitest";
import { computeOverallVerdict } from "@/experimental/eval-engine/orchestrator/verdict";
import { runEvaluation } from "@/experimental/eval-engine/orchestrator/runEvaluation";
import type { EvaluatorResult } from "@/experimental/eval-engine/evaluators/types";
import { loadKG, type LoadedKG } from "@/experimental/eval-engine/kg";
import type { Curriculum } from "@/lib/curriculum.types";

const baseCurriculum: Curriculum = {
  reading1: { id: "r1", title: "T", body: "B" },
  mcq1: { id: "m1", prompt: "P", options: [{ id: "a", text: "x", isCorrect: true }] },
  simulationCaptions: { oneBond: "o", twoBond: { mechanism: "m", consequence: "c", hazard: "h" } },
  mcq2: { id: "m2", prompt: "P", options: [{ id: "a", text: "x", isCorrect: true }] },
  voiceTutor: { groundingFacts: [], openingPrompt: "open" },
};

function makeResult(opts: { id: string; rating: 1 | 2 | 3 | 4; unexpectedContradictions: number; unsureCount?: number }): EvaluatorResult<string> {
  const perItem = [];
  for (let i = 0; i < opts.unexpectedContradictions; i++) {
    perItem.push({
      target: { slot: { kind: "reading" as const, field: "body" as const }, excerpt: "x" },
      verdict: "contradicted-unexpected",
      reasoning: "x",
      citedKGNodeIds: [],
      confidence: "high" as const,
    });
  }
  const unsure = [];
  for (let i = 0; i < (opts.unsureCount ?? 0); i++) {
    unsure.push({
      target: { slot: { kind: "reading" as const, field: "body" as const }, excerpt: "x" },
      verdict: "unsupported",
      reasoning: "x",
      citedKGNodeIds: [],
      confidence: "low" as const,
    });
  }
  return {
    evaluatorId: opts.id,
    dimension: opts.id,
    rating: opts.rating,
    reasoning: "test",
    perItem,
    unsureItems: unsure,
    runMetadata: { model: "test", runs: 1, timestampISO: "2026-05-20T00:00:00.000Z" },
  };
}

describe("computeOverallVerdict", () => {
  it("passes when all evaluators rating>=3 and no unexpected contradictions", () => {
    const v = computeOverallVerdict([
      makeResult({ id: "a", rating: 4, unexpectedContradictions: 0 }),
      makeResult({ id: "b", rating: 3, unexpectedContradictions: 0 }),
    ]);
    expect(v.pass).toBe(true);
    expect(v.minRating).toBe(3);
  });

  it("fails when any evaluator rates <3", () => {
    const v = computeOverallVerdict([
      makeResult({ id: "a", rating: 4, unexpectedContradictions: 0 }),
      makeResult({ id: "b", rating: 2, unexpectedContradictions: 0 }),
    ]);
    expect(v.pass).toBe(false);
    expect(v.minRating).toBe(2);
  });

  it("fails when any contradicted-unexpected exists even if ratings>=3", () => {
    const v = computeOverallVerdict([
      makeResult({ id: "a", rating: 3, unexpectedContradictions: 1 }),
    ]);
    expect(v.pass).toBe(false);
  });

  it("hard-fails on empty evaluator list (misconfiguration safety)", () => {
    const v = computeOverallVerdict([]);
    expect(v.pass).toBe(false);
    expect(v.summary).toMatch(/no evaluators/i);
  });

  it("does NOT fail solely because of unsureItems (decision-support)", () => {
    const v = computeOverallVerdict([
      makeResult({ id: "a", rating: 4, unexpectedContradictions: 0, unsureCount: 3 }),
    ]);
    expect(v.pass).toBe(true);
    expect(v.needsHumanReview).toBe(3);
  });
});

describe("runEvaluation", () => {
  it("runs all registered evaluators in parallel and assembles a report", async () => {
    const kg = loadKG({
      learningGoals: [
        { type: "LearningGoal", id: "lg.t", question: "?", summary: "S", prerequisites: [], teaches: [], addresses: [] },
      ],
      atomicFacts: [],
      misconceptions: [],
      sources: [],
    });
    const stub1 = {
      id: "e1",
      dimension: "Dim1",
      rubric: { dimension: "Dim1", levels: [] as never },
      evaluate: vi.fn(async () => makeResult({ id: "e1", rating: 4, unexpectedContradictions: 0 })),
    };
    const stub2 = {
      id: "e2",
      dimension: "Dim2",
      rubric: { dimension: "Dim2", levels: [] as never },
      evaluate: vi.fn(async () => makeResult({ id: "e2", rating: 4, unexpectedContradictions: 0 })),
    };
    const report = await runEvaluation(baseCurriculum, "lg.t", { kg: kg as LoadedKG, evaluators: [stub1, stub2] as any });
    expect(stub1.evaluate).toHaveBeenCalledOnce();
    expect(stub2.evaluate).toHaveBeenCalledOnce();
    expect(report.evaluatorResults).toHaveLength(2);
    expect(report.overallVerdict.pass).toBe(true);
    expect(report.learningGoalId).toBe("lg.t");
  });

  it("propagates the fail-closed verdict policy in the report", async () => {
    const kg = loadKG({
      learningGoals: [
        { type: "LearningGoal", id: "lg.t", question: "?", summary: "S", prerequisites: [], teaches: [], addresses: [] },
      ],
      atomicFacts: [],
      misconceptions: [],
      sources: [],
    });
    const failing = {
      id: "e1",
      dimension: "Dim1",
      rubric: { dimension: "Dim1", levels: [] as never },
      evaluate: vi.fn(async () => makeResult({ id: "e1", rating: 2, unexpectedContradictions: 0 })),
    };
    const report = await runEvaluation(baseCurriculum, "lg.t", { kg: kg as LoadedKG, evaluators: [failing] as any });
    expect(report.overallVerdict.pass).toBe(false);
    expect(report.overallVerdict.minRating).toBe(2);
  });
});
