import type { Curriculum } from "@/lib/curriculum.types";
import type { Evaluator, EvaluatorResult, RubricLevel } from "@/experimental/eval-engine/evaluators/types";
import { registeredEvaluators } from "@/experimental/eval-engine/evaluators/registry";
import { loadKGFromDisk, type LoadedKG } from "@/experimental/eval-engine/kg";
import { computeOverallVerdict, type OverallVerdict } from "./verdict";

export interface EvaluationReport {
  learningGoalId: string;
  curriculumSummary: { readingTitle: string; mcqCount: number };
  evaluatorResults: EvaluatorResult<string>[];
  overallVerdict: OverallVerdict;
  generatedAt: string;
}

export interface RunEvaluationOptions {
  kg?: LoadedKG;
  evaluators?: Evaluator<string>[];
  model?: string;
  runs?: number;
}

export async function runEvaluation(
  curriculum: Curriculum,
  learningGoalId: string,
  opts: RunEvaluationOptions = {},
): Promise<EvaluationReport> {
  const kg = opts.kg ?? loadKGFromDisk();
  const ctx = kg.resolveContext(learningGoalId);
  const evaluators = opts.evaluators ?? registeredEvaluators;
  const evaluatorResults = await Promise.all(
    evaluators.map((e) => e.evaluate(curriculum, ctx, { model: opts.model, runs: opts.runs })),
  );
  const overallVerdict = computeOverallVerdict(evaluatorResults);
  return {
    learningGoalId,
    curriculumSummary: {
      readingTitle: curriculum.reading1.title,
      mcqCount: [curriculum.mcq1, curriculum.mcq2].length,
    },
    evaluatorResults,
    overallVerdict,
    generatedAt: new Date().toISOString(),
  };
}
