import { describe, it, expect } from "vitest";
import { renderMarkdownReport } from "@/experimental/eval-engine/reports/markdown";
import type { EvaluationReport } from "@/experimental/eval-engine/orchestrator/runEvaluation";

const passingReport: EvaluationReport = {
  learningGoalId: "lg.test",
  curriculumSummary: { readingTitle: "Bonding 101", mcqIds: ["m1", "m2"] },
  evaluatorResults: [
    {
      evaluatorId: "factual-accuracy",
      dimension: "Factual Accuracy",
      rating: 4,
      reasoning: "all good",
      perItem: [],
      unsureItems: [],
      runMetadata: { model: "gpt-4o", runs: 1, timestampISO: "2026-05-20T00:00:00.000Z" },
    },
  ],
  overallVerdict: { pass: true, minRating: 4, summary: "PASS", needsHumanReview: 0 },
  generatedAt: "2026-05-20T00:00:00.000Z",
};

const failingReport: EvaluationReport = {
  learningGoalId: "lg.test",
  curriculumSummary: { readingTitle: "Bonding 101", mcqIds: ["m1", "m2"] },
  evaluatorResults: [
    {
      evaluatorId: "factual-accuracy",
      dimension: "Factual Accuracy",
      rating: 2,
      reasoning: "one unexpected contradiction",
      perItem: [
        {
          target: { slot: { kind: "reading", field: "body" }, excerpt: "wrong claim" },
          verdict: "contradicted-unexpected",
          reasoning: "contradicts fact.x",
          citedKGNodeIds: ["fact.x"],
          confidence: "high",
        },
      ],
      unsureItems: [
        {
          target: { slot: { kind: "reading", field: "body" }, excerpt: "novel claim" },
          verdict: "unsupported",
          reasoning: "not in KG",
          citedKGNodeIds: [],
          confidence: "low",
        },
      ],
      runMetadata: { model: "gpt-4o", runs: 1, timestampISO: "2026-05-20T00:00:00.000Z" },
    },
  ],
  overallVerdict: { pass: false, minRating: 2, summary: "FAIL", needsHumanReview: 1 },
  generatedAt: "2026-05-20T00:00:00.000Z",
};

describe("renderMarkdownReport", () => {
  it("renders a passing report with the overall verdict header", () => {
    const md = renderMarkdownReport(passingReport);
    expect(md).toContain("# Evaluation Report");
    expect(md).toMatch(/Overall:\s+PASS/);
    expect(md).toContain("lg.test");
    expect(md).toContain("Factual Accuracy");
  });

  it("renders contradictions in a 'must fix' section and unsupported claims in a 'decision-support' section", () => {
    const md = renderMarkdownReport(failingReport);
    expect(md).toMatch(/Overall:\s+FAIL/);
    expect(md).toMatch(/Contradictions \(must fix\)/i);
    expect(md).toContain("wrong claim");
    expect(md).toContain("contradicts fact.x");
    expect(md).toMatch(/Unsupported claims \(decision-support/i);
    expect(md).toContain("novel claim");
  });

  it("omits the decision-support section when no unsupported claims exist", () => {
    const md = renderMarkdownReport(passingReport);
    expect(md).not.toMatch(/decision-support/i);
  });
});
