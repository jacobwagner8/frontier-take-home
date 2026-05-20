import type { Curriculum } from "@/lib/curriculum.types";
import type { KGContext } from "@/experimental/eval-engine/kg";

export type RubricLevel = 1 | 2 | 3 | 4;

export interface RubricLevelDef {
  level: RubricLevel;
  label: string;
  description: string;
}

export interface EvaluatorRubric {
  dimension: string;
  levels: [RubricLevelDef, RubricLevelDef, RubricLevelDef, RubricLevelDef];
}

export type CurriculumSlotId =
  | { kind: "reading"; field: "body" }
  | { kind: "mcq"; mcqId: string; field: "prompt" }
  | {
      kind: "mcqOption";
      mcqId: string;
      optionId: string;
      isCorrect: boolean;
      field: "text" | "remediation";
      misconceptionTag?: string;
    }
  | { kind: "tutorGroundingFact"; index: number }
  | { kind: "tutorOpeningPrompt" }
  | { kind: "simulationCaption"; key: "oneBond" | "twoBond.mechanism" | "twoBond.consequence" | "twoBond.hazard" };

export interface SlotInstance {
  slot: CurriculumSlotId;
  excerpt: string;
}

export interface PerItemVerdict<TLabel extends string> {
  target: SlotInstance | { criterion: string };
  verdict: TLabel;
  reasoning: string;
  citedKGNodeIds: string[];
  confidence: "high" | "medium" | "low";
}

export interface EvaluatorResult<TLabel extends string> {
  evaluatorId: string;
  dimension: string;
  rating: RubricLevel;
  reasoning: string;
  perItem: PerItemVerdict<TLabel>[];
  unsureItems: PerItemVerdict<TLabel>[];
  runMetadata: { model: string; runs: number; timestampISO: string };
}

export interface EvaluatorOptions {
  runs?: number;
  model?: string;
}

export interface Evaluator<TLabel extends string> {
  id: string;
  dimension: string;
  rubric: EvaluatorRubric;
  evaluate(
    curriculum: Curriculum,
    ctx: KGContext,
    opts?: EvaluatorOptions,
  ): Promise<EvaluatorResult<TLabel>>;
}
