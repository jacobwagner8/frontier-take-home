import { describe, it, expect } from "vitest";
import {
  initialLessonState,
  lessonReducer,
  LessonState,
  LessonStep,
  progressFor,
} from "@/lib/lessonMachine";

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

  it("mcq1 → mcq1b when answered correctly", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq1" };
    const next = lessonReducer(state, { type: "ANSWER_MCQ", mcqId: "mcq1" });
    expect(next.step).toBe("mcq1b");
  });

  it("mcq1b correct → mcq1c", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq1b" };
    const next = lessonReducer(state, { type: "ANSWER_MCQ", mcqId: "mcq1b" });
    expect(next.step).toBe("mcq1c");
  });

  it("mcq1c correct → simulation", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq1c" };
    const next = lessonReducer(state, { type: "ANSWER_MCQ", mcqId: "mcq1c" });
    expect(next.step).toBe("simulation");
  });

  it("simulation → mcq2 on ADVANCE", () => {
    const state: LessonState = { ...initialLessonState, step: "simulation" };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.step).toBe("mcq2");
  });

  it("mcq2 correct → voiceTutor", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq2" };
    const next = lessonReducer(state, { type: "ANSWER_MCQ", mcqId: "mcq2" });
    expect(next.step).toBe("voiceTutor");
  });

  it("voiceTutor → done on ADVANCE", () => {
    const state: LessonState = { ...initialLessonState, step: "voiceTutor" };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.step).toBe("done");
  });
});

describe("lessonReducer GO_BACK", () => {
  const backCases: Array<[LessonStep, LessonStep]> = [
    ["reading1", "intro"],
    ["mcq1", "reading1"],
    ["mcq1b", "mcq1"],
    ["mcq1c", "mcq1b"],
    ["simulation", "mcq1c"],
    ["mcq2", "simulation"],
    ["voiceTutor", "mcq2"],
  ];

  it.each(backCases)("GO_BACK from %s lands on %s", (from, to) => {
    const state: LessonState = { ...initialLessonState, step: from };
    const next = lessonReducer(state, { type: "GO_BACK" });
    expect(next.step).toBe(to);
  });

  const noBackSteps: LessonStep[] = ["intro", "done"];

  it.each(noBackSteps)("GO_BACK is a no-op from %s", (step) => {
    const state: LessonState = { ...initialLessonState, step };
    const next = lessonReducer(state, { type: "GO_BACK" });
    expect(next).toEqual(state);
  });
});

describe("progressFor", () => {
  it("returns 0/7 for intro (lesson not started)", () => {
    expect(progressFor("intro")).toEqual({ current: 0, total: 7 });
  });

  it("returns 1/7 for reading1", () => {
    expect(progressFor("reading1")).toEqual({ current: 1, total: 7 });
  });

  it("returns 2/7 for mcq1", () => {
    expect(progressFor("mcq1")).toEqual({ current: 2, total: 7 });
  });

  it("returns 3/7 for mcq1b", () => {
    expect(progressFor("mcq1b")).toEqual({ current: 3, total: 7 });
  });

  it("returns 4/7 for mcq1c", () => {
    expect(progressFor("mcq1c")).toEqual({ current: 4, total: 7 });
  });

  it("returns 6/7 for mcq2", () => {
    expect(progressFor("mcq2")).toEqual({ current: 6, total: 7 });
  });

  it("returns 7/7 for done (lesson complete)", () => {
    expect(progressFor("done")).toEqual({ current: 7, total: 7 });
  });
});
