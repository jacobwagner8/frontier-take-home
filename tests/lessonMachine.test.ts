import { describe, it, expect } from "vitest";
import {
  initialLessonState,
  lessonReducer,
  LessonState,
  LessonStep,
  progressFor,
} from "@/lib/lessonMachine";
import { curriculum } from "@/lib/curriculum";

describe("lessonReducer", () => {
  it("starts at intro", () => {
    expect(initialLessonState.step).toBe("intro");
  });

  it("intro → reading1 on ADVANCE", () => {
    const next = lessonReducer(initialLessonState, { type: "ADVANCE" });
    expect(next.step).toBe("reading1");
  });

  it("reading1 → mcq1 on ADVANCE", () => {
    const state: LessonState = { ...initialLessonState, step: "reading1" };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.step).toBe("mcq1");
  });

  it("mcq1 → simulation when answered correctly", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq1" };
    const correctId = curriculum.mcq1.options.find((o) => o.isCorrect)!.id;
    const next = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq1",
      optionId: correctId,
    });
    expect(next.step).toBe("simulation");
  });

  it("mcq1 → remediation1 when answered incorrectly, tracks wrong option", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq1" };
    const wrong = curriculum.mcq1.options.find((o) => !o.isCorrect)!;
    const next = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq1",
      optionId: wrong.id,
    });
    expect(next.step).toBe("remediation1");
    expect(next.lastWrongOptionId).toBe(wrong.id);
  });

  it("remediation1 → mcq1 on ADVANCE (retry, clears lastWrongOptionId)", () => {
    const state: LessonState = {
      ...initialLessonState,
      step: "remediation1",
      lastWrongOptionId: "mcq1_a",
    };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.step).toBe("mcq1");
    expect(next.lastWrongOptionId).toBeUndefined();
  });

  it("simulation → mcq2 on ADVANCE", () => {
    const state: LessonState = { ...initialLessonState, step: "simulation" };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.step).toBe("mcq2");
  });

  it("mcq2 → remediation2 when answered incorrectly, tracks wrong option", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq2" };
    const wrong = curriculum.mcq2.options.find((o) => !o.isCorrect)!;
    const next = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq2",
      optionId: wrong.id,
    });
    expect(next.step).toBe("remediation2");
    expect(next.lastWrongOptionId).toBe(wrong.id);
  });

  it("mcq2 correct → voiceTutor", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq2" };
    const correctId = curriculum.mcq2.options.find((o) => o.isCorrect)!.id;
    const next = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq2",
      optionId: correctId,
    });
    expect(next.step).toBe("voiceTutor");
  });

  it("voiceTutor → done on ADVANCE", () => {
    const state: LessonState = { ...initialLessonState, step: "voiceTutor" };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.step).toBe("done");
  });

  it("RESTART_LESSON returns to intro from any step", () => {
    const state: LessonState = { ...initialLessonState, step: "done" };
    const next = lessonReducer(state, { type: "RESTART_LESSON" });
    expect(next.step).toBe("intro");
  });
});

describe("lessonReducer GO_BACK", () => {
  const backCases: Array<[LessonStep, LessonStep]> = [
    ["reading1", "intro"],
    ["mcq1", "reading1"],
    ["simulation", "mcq1"],
    ["mcq2", "simulation"],
    ["voiceTutor", "mcq2"],
  ];

  it.each(backCases)("GO_BACK from %s lands on %s", (from, to) => {
    const state: LessonState = { ...initialLessonState, step: from };
    const next = lessonReducer(state, { type: "GO_BACK" });
    expect(next.step).toBe(to);
  });

  it("GO_BACK clears any lingering lastWrongOptionId", () => {
    const state: LessonState = {
      step: "mcq1",
      lastWrongOptionId: "mcq1_a",
    };
    const next = lessonReducer(state, { type: "GO_BACK" });
    expect(next.step).toBe("reading1");
    expect(next.lastWrongOptionId).toBeUndefined();
  });

  const noBackSteps: LessonStep[] = [
    "intro",
    "remediation1",
    "remediation2",
    "done",
  ];

  it.each(noBackSteps)("GO_BACK is a no-op from %s", (step) => {
    const state: LessonState = { ...initialLessonState, step };
    const next = lessonReducer(state, { type: "GO_BACK" });
    expect(next).toEqual(state);
  });
});

describe("progressFor", () => {
  it("returns 0/5 for intro (lesson not started)", () => {
    expect(progressFor("intro")).toEqual({ current: 0, total: 5 });
  });

  it("returns 1/5 for reading1", () => {
    expect(progressFor("reading1")).toEqual({ current: 1, total: 5 });
  });

  it("collapses remediation1 onto mcq1 (2/5)", () => {
    expect(progressFor("remediation1")).toEqual({ current: 2, total: 5 });
  });

  it("collapses remediation2 onto mcq2 (4/5)", () => {
    expect(progressFor("remediation2")).toEqual({ current: 4, total: 5 });
  });

  it("returns 5/5 for done (lesson complete)", () => {
    expect(progressFor("done")).toEqual({ current: 5, total: 5 });
  });
});
