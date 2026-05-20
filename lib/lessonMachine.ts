import { curriculum } from "./curriculum";

export type LessonStep =
  | "intro"
  | "reading1"
  | "mcq1"
  | "remediation1"
  | "simulation"
  | "mcq2"
  | "remediation2"
  | "voiceTutor"
  | "done";

export interface LessonState {
  step: LessonStep;
  lastWrongOptionId?: string;
}

export type LessonAction =
  | { type: "ADVANCE" }
  | { type: "ANSWER_MCQ"; mcqId: "mcq1" | "mcq2"; optionId: string }
  | { type: "RESTART_LESSON" };

export const initialLessonState: LessonState = { step: "intro" };

const linearOrder: LessonStep[] = [
  "intro",
  "reading1",
  "mcq1",
  "simulation",
  "mcq2",
  "voiceTutor",
  "done",
];

function nextLinear(step: LessonStep): LessonStep {
  const i = linearOrder.indexOf(step);
  return i >= 0 && i < linearOrder.length - 1 ? linearOrder[i + 1] : step;
}

export function lessonReducer(
  state: LessonState,
  action: LessonAction,
): LessonState {
  switch (action.type) {
    case "RESTART_LESSON":
      return initialLessonState;

    case "ADVANCE": {
      if (state.step === "remediation1") {
        return { step: "mcq1", lastWrongOptionId: undefined };
      }
      if (state.step === "remediation2") {
        return { step: "mcq2", lastWrongOptionId: undefined };
      }
      return { ...state, step: nextLinear(state.step) };
    }

    case "ANSWER_MCQ": {
      const mcq =
        action.mcqId === "mcq1" ? curriculum.mcq1 : curriculum.mcq2;
      const option = mcq.options.find((o) => o.id === action.optionId);
      if (!option) return state;
      if (option.isCorrect) {
        return {
          step: nextLinear(state.step),
          lastWrongOptionId: undefined,
        };
      }
      return {
        step: action.mcqId === "mcq1" ? "remediation1" : "remediation2",
        lastWrongOptionId: option.id,
      };
    }
  }
}

/** Convenience: where does a given step sit in the linear progress bar?
 * Remediation steps collapse onto their parent MCQ. `intro` is 0/total
 * (lesson not started), `done` is total/total (lesson complete). */
export function progressFor(step: LessonStep): {
  current: number;
  total: number;
} {
  const visible: LessonStep[] = [
    "reading1",
    "mcq1",
    "simulation",
    "mcq2",
    "voiceTutor",
  ];
  const remediationOf: Partial<Record<LessonStep, LessonStep>> = {
    remediation1: "mcq1",
    remediation2: "mcq2",
  };
  const total = visible.length;
  if (step === "done") return { current: total, total };
  const effective = remediationOf[step] ?? step;
  const idx = visible.indexOf(effective);
  return { current: idx < 0 ? 0 : idx + 1, total };
}
