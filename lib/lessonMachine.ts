import { curriculum } from "./curriculum";

export type LessonStep =
  | "reading1"
  | "mcq1"
  | "remediation1"
  | "mcq1b"
  | "remediation1b"
  | "mcq1c"
  | "remediation1c"
  | "simulation"
  | "mcq2"
  | "remediation2"
  | "voiceTutor"
  | "done";

export type ReadingMcqId = "mcq1" | "mcq1b" | "mcq1c";
export type McqId = ReadingMcqId | "mcq2";

export interface LessonState {
  step: LessonStep;
  lastWrongOptionId?: string;
}

export type LessonAction =
  | { type: "ADVANCE" }
  | { type: "GO_BACK" }
  | { type: "ANSWER_MCQ"; mcqId: McqId; optionId: string };

/** Steps that expose a Back affordance, with their explicit destinations.
 * reading1 is the first content step and has no back target. Remediation
 * and `done` are also intentionally omitted. */
const backTargets: Partial<Record<LessonStep, LessonStep>> = {
  mcq1: "reading1",
  mcq1b: "mcq1",
  mcq1c: "mcq1b",
  simulation: "mcq1c",
  mcq2: "simulation",
  voiceTutor: "mcq2",
};

export const initialLessonState: LessonState = { step: "reading1" };

const linearOrder: LessonStep[] = [
  "reading1",
  "mcq1",
  "mcq1b",
  "mcq1c",
  "simulation",
  "mcq2",
  "voiceTutor",
  "done",
];

const REMEDIATION_FOR: Record<McqId, LessonStep> = {
  mcq1: "remediation1",
  mcq1b: "remediation1b",
  mcq1c: "remediation1c",
  mcq2: "remediation2",
};

function nextLinear(step: LessonStep): LessonStep {
  const i = linearOrder.indexOf(step);
  return i >= 0 && i < linearOrder.length - 1 ? linearOrder[i + 1] : step;
}

export function lessonReducer(
  state: LessonState,
  action: LessonAction,
): LessonState {
  switch (action.type) {
    case "ADVANCE": {
      const remediationRetry: Partial<Record<LessonStep, McqId>> = {
        remediation1: "mcq1",
        remediation1b: "mcq1b",
        remediation1c: "mcq1c",
        remediation2: "mcq2",
      };
      const retryTarget = remediationRetry[state.step];
      if (retryTarget) {
        return { step: retryTarget, lastWrongOptionId: undefined };
      }
      return { ...state, step: nextLinear(state.step) };
    }

    case "GO_BACK": {
      const target = backTargets[state.step];
      if (!target) return state;
      return { step: target, lastWrongOptionId: undefined };
    }

    case "ANSWER_MCQ": {
      const mcq = curriculum[action.mcqId];
      const option = mcq.options.find((o) => o.id === action.optionId);
      if (!option) return state;
      if (option.isCorrect) {
        return {
          step: nextLinear(state.step),
          lastWrongOptionId: undefined,
        };
      }
      return {
        step: REMEDIATION_FOR[action.mcqId],
        lastWrongOptionId: option.id,
      };
    }
  }
}

/** Convenience: where does a given step sit in the linear progress bar?
 * Remediation steps collapse onto their parent MCQ.
 * `done` is total/total (lesson complete). */
export function progressFor(step: LessonStep): {
  current: number;
  total: number;
} {
  const visible: LessonStep[] = [
    "reading1",
    "mcq1",
    "mcq1b",
    "mcq1c",
    "simulation",
    "mcq2",
    "voiceTutor",
  ];
  const remediationOf: Partial<Record<LessonStep, LessonStep>> = {
    remediation1: "mcq1",
    remediation1b: "mcq1b",
    remediation1c: "mcq1c",
    remediation2: "mcq2",
  };
  const total = visible.length;
  if (step === "done") return { current: total, total };
  const effective = remediationOf[step] ?? step;
  const idx = visible.indexOf(effective);
  return { current: idx < 0 ? 0 : idx + 1, total };
}
