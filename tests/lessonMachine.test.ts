import { describe, it, expect } from "vitest";
import {
  initialLessonState,
  lessonReducer,
  LessonState,
  LessonStep,
  progressFor,
} from "@/lib/lessonMachine";

describe("lessonReducer", () => {
  it("starts at reading1", () => {
    expect(initialLessonState.step).toBe("reading1");
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

  it("mcq1b correct → simulation", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq1b" };
    const next = lessonReducer(state, { type: "ANSWER_MCQ", mcqId: "mcq1b" });
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
    ["mcq1", "reading1"],
    ["mcq1b", "mcq1"],
    ["simulation", "mcq1b"],
    ["mcq2", "simulation"],
    ["voiceTutor", "mcq2"],
  ];

  it.each(backCases)("GO_BACK from %s lands on %s", (from, to) => {
    const state: LessonState = { ...initialLessonState, step: from };
    const next = lessonReducer(state, { type: "GO_BACK" });
    expect(next.step).toBe(to);
  });

  const noBackSteps: LessonStep[] = ["reading1", "done"];

  it.each(noBackSteps)("GO_BACK is a no-op from %s", (step) => {
    const state: LessonState = { ...initialLessonState, step };
    const next = lessonReducer(state, { type: "GO_BACK" });
    expect(next).toEqual(state);
  });
});

describe("progressFor", () => {
  it("returns 1/6 for reading1", () => {
    expect(progressFor("reading1")).toEqual({ current: 1, total: 6 });
  });

  it("returns 2/6 for mcq1", () => {
    expect(progressFor("mcq1")).toEqual({ current: 2, total: 6 });
  });

  it("returns 3/6 for mcq1b", () => {
    expect(progressFor("mcq1b")).toEqual({ current: 3, total: 6 });
  });

  it("returns 5/6 for mcq2", () => {
    expect(progressFor("mcq2")).toEqual({ current: 5, total: 6 });
  });

  it("returns 6/6 for done (lesson complete)", () => {
    expect(progressFor("done")).toEqual({ current: 6, total: 6 });
  });
});
