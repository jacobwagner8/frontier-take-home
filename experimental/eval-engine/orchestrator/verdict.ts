import type { EvaluatorResult, RubricLevel } from "@/experimental/eval-engine/evaluators/types";

export interface OverallVerdict {
  pass: boolean;
  minRating: RubricLevel;
  summary: string;
  needsHumanReview: number;
}

export function computeOverallVerdict(results: EvaluatorResult<string>[]): OverallVerdict {
  if (results.length === 0) {
    return {
      pass: false,
      minRating: 1,
      summary: "FAIL — no evaluators registered.",
      needsHumanReview: 0,
    };
  }

  const minRating = (results.length === 0
    ? 1
    : Math.min(...results.map((r) => r.rating))) as RubricLevel;

  const unexpectedContradictions = results
    .flatMap((r) => r.perItem)
    .filter((p) => p.verdict === "contradicted-unexpected").length;

  const needsHumanReview = results.reduce((acc, r) => acc + r.unsureItems.length, 0);

  const ratingOk = results.every((r) => r.rating >= 3);
  const contradictionsOk = unexpectedContradictions === 0;
  const pass = ratingOk && contradictionsOk;

  const summaryParts: string[] = [];
  if (!ratingOk) summaryParts.push(`min rating ${minRating} < 3`);
  if (!contradictionsOk) summaryParts.push(`${unexpectedContradictions} unexpected contradiction(s)`);
  if (needsHumanReview > 0) summaryParts.push(`${needsHumanReview} item(s) need human review (decision-support, not a failure)`);
  const summary = pass
    ? `PASS — all ${results.length} evaluator(s) at rating ${minRating} or higher.`
    : `FAIL — ${summaryParts.join("; ")}.`;

  return { pass, minRating, summary, needsHumanReview };
}
