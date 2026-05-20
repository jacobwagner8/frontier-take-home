import { factualAccuracyEvaluator } from "./factualAccuracy";
import { learningGoalCoverageEvaluator } from "./learningGoalCoverage";
import type { Evaluator } from "./types";

export const registeredEvaluators: Evaluator<string>[] = [
  factualAccuracyEvaluator as Evaluator<string>,
  learningGoalCoverageEvaluator as Evaluator<string>,
];
