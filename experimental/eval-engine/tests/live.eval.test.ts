import { describe, it, expect } from "vitest";
import { runEvaluation } from "@/experimental/eval-engine/orchestrator/runEvaluation";

const hasKey = !!process.env.OPENAI_API_KEY;
const liveIt = hasKey ? it : it.skip;

describe("live OpenAI integration (skipped without OPENAI_API_KEY)", () => {
  liveIt(
    "good-bonding-lesson passes both evaluators",
    async () => {
      const { curriculum } = await import("@/experimental/eval-engine/fixtures/good-bonding-lesson");
      const report = await runEvaluation(curriculum, "lg.ng-bonding-one-point");
      expect(report.overallVerdict.pass).toBe(true);
      expect(report.overallVerdict.minRating).toBeGreaterThanOrEqual(3);
    },
    60_000,
  );

  liveIt(
    "bad-factual-bonding-lesson fails on a contradicted-unexpected claim",
    async () => {
      const { curriculum } = await import("@/experimental/eval-engine/fixtures/bad-factual-bonding-lesson");
      const report = await runEvaluation(curriculum, "lg.ng-bonding-one-point");
      expect(report.overallVerdict.pass).toBe(false);
      const factual = report.evaluatorResults.find((r) => r.evaluatorId === "factual-accuracy")!;
      const hasUnexpected = factual.perItem.some((p) => p.verdict === "contradicted-unexpected");
      expect(hasUnexpected).toBe(true);
    },
    60_000,
  );

  liveIt(
    "off-topic-bonding-lesson fails on Learning Goal Coverage",
    async () => {
      const { curriculum } = await import("@/experimental/eval-engine/fixtures/off-topic-bonding-lesson");
      const report = await runEvaluation(curriculum, "lg.ng-bonding-one-point");
      expect(report.overallVerdict.pass).toBe(false);
      const coverage = report.evaluatorResults.find((r) => r.evaluatorId === "learning-goal-coverage")!;
      expect(coverage.rating).toBeLessThanOrEqual(2);
    },
    60_000,
  );

  liveIt(
    "bait-option-fixture still passes (wrong MCQ option produces contradicted-expected, not -unexpected)",
    async () => {
      const { curriculum } = await import("@/experimental/eval-engine/fixtures/bait-option-fixture");
      const report = await runEvaluation(curriculum, "lg.ng-bonding-one-point");
      const factual = report.evaluatorResults.find((r) => r.evaluatorId === "factual-accuracy")!;
      const baitItem = factual.perItem.find(
        (p) => "slot" in p.target && p.target.slot.kind === "mcqOption" && p.target.slot.optionId === "extra-bait",
      );
      expect(baitItem?.verdict === "contradicted-expected" || baitItem?.verdict === "supported").toBe(true);
      expect(report.overallVerdict.pass).toBe(true);
    },
    60_000,
  );

  liveIt(
    "unsupported-claim-lesson surfaces an unsureItem but can still pass",
    async () => {
      const { curriculum } = await import("@/experimental/eval-engine/fixtures/unsupported-claim-lesson");
      const report = await runEvaluation(curriculum, "lg.ng-bonding-one-point");
      const factual = report.evaluatorResults.find((r) => r.evaluatorId === "factual-accuracy")!;
      expect(factual.unsureItems.length).toBeGreaterThanOrEqual(1);
    },
    60_000,
  );
});
