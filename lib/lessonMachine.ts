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

export interface LessonEntry {
  step: LessonStep;
  /** For mcq steps: the option ID the user submitted (set after ANSWER_MCQ). */
  answeredOptionId?: string;
  /** For remediation steps: the wrong option ID that led here. */
  lastWrongOptionId?: string;
}

export interface LessonState {
  /** Append-only ordered list. The last entry is the current (interactive) step;
   * earlier entries are frozen on the page. */
  entries: LessonEntry[];
}

export type LessonAction =
  | { type: "ADVANCE" }
  | { type: "ANSWER_MCQ"; mcqId: "mcq1" | "mcq2"; optionId: string }
  | { type: "RESTART_LESSON" };

export const initialLessonState: LessonState = {
  entries: [{ step: "intro" }],
};

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

export function currentEntry(state: LessonState): LessonEntry {
  return state.entries[state.entries.length - 1];
}

export function lessonReducer(
  state: LessonState,
  action: LessonAction,
): LessonState {
  switch (action.type) {
    case "RESTART_LESSON":
      return initialLessonState;

    case "ADVANCE": {
      const current = currentEntry(state);
      // nextLinear("done") returns "done", so without this guard ADVANCE on
      // the completion step would append another done entry instead of being
      // a no-op. Not reachable via UI but a real footgun if dispatched elsewhere.
      if (current.step === "done") return state;
      let nextStep: LessonStep;
      if (current.step === "remediation1") nextStep = "mcq1";
      else if (current.step === "remediation2") nextStep = "mcq2";
      else nextStep = nextLinear(current.step);
      return { entries: [...state.entries, { step: nextStep }] };
    }

    case "ANSWER_MCQ": {
      const current = currentEntry(state);
      const mcq =
        action.mcqId === "mcq1" ? curriculum.mcq1 : curriculum.mcq2;
      const option = mcq.options.find((o) => o.id === action.optionId);
      if (!option) return state;
      // Lock the answered option onto the current entry.
      const updated: LessonEntry = {
        ...current,
        answeredOptionId: option.id,
      };
      const updatedEntries = [...state.entries.slice(0, -1), updated];
      if (option.isCorrect) {
        return {
          entries: [...updatedEntries, { step: nextLinear(current.step) }],
        };
      }
      const remediationStep: LessonStep =
        action.mcqId === "mcq1" ? "remediation1" : "remediation2";
      return {
        entries: [
          ...updatedEntries,
          { step: remediationStep, lastWrongOptionId: option.id },
        ],
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
