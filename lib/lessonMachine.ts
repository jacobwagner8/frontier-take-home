export type LessonStep =
  | "intro"
  | "reading1"
  | "mcq1"
  | "mcq1b"
  | "mcq1c"
  | "simulation"
  | "mcq2"
  | "voiceTutor"
  | "done";

export type ReadingMcqId = "mcq1" | "mcq1b" | "mcq1c";
export type McqId = ReadingMcqId | "mcq2";

export interface LessonState {
  step: LessonStep;
}

export type LessonAction =
  | { type: "ADVANCE" }
  | { type: "GO_BACK" }
  | { type: "ANSWER_MCQ"; mcqId: McqId; optionId: string };

const backTargets: Partial<Record<LessonStep, LessonStep>> = {
  reading1: "intro",
  mcq1: "reading1",
  mcq1b: "mcq1",
  mcq1c: "mcq1b",
  simulation: "mcq1c",
  mcq2: "simulation",
  voiceTutor: "mcq2",
};

export const initialLessonState: LessonState = { step: "intro" };

const linearOrder: LessonStep[] = [
  "intro",
  "reading1",
  "mcq1",
  "mcq1b",
  "mcq1c",
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
    case "ADVANCE":
      return { ...state, step: nextLinear(state.step) };

    case "GO_BACK": {
      const target = backTargets[state.step];
      if (!target) return state;
      return { step: target };
    }

    case "ANSWER_MCQ":
      return { step: nextLinear(state.step) };
  }
}

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
  const total = visible.length;
  if (step === "done") return { current: total, total };
  const idx = visible.indexOf(step);
  return { current: idx < 0 ? 0 : idx + 1, total };
}
