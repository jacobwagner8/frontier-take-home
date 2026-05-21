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

  it("mcq1 → mcq1b when answered correctly", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq1" };
    const correctId = curriculum.mcq1.options.find((o) => o.isCorrect)!.id;
    const next = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq1",
      optionId: correctId,
    });
    expect(next.step).toBe("mcq1b");
  });

  it("mcq1b correct → mcq1c; wrong → remediation1b", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq1b" };
    const correctId = curriculum.mcq1b.options.find((o) => o.isCorrect)!.id;
    const wrong = curriculum.mcq1b.options.find((o) => !o.isCorrect)!;

    const onCorrect = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq1b",
      optionId: correctId,
    });
    expect(onCorrect.step).toBe("mcq1c");

    const onWrong = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq1b",
      optionId: wrong.id,
    });
    expect(onWrong.step).toBe("remediation1b");
    expect(onWrong.lastWrongOptionId).toBe(wrong.id);
  });

  it("mcq1c correct → simulation; wrong → remediation1c", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq1c" };
    const correctId = curriculum.mcq1c.options.find((o) => o.isCorrect)!.id;
    const wrong = curriculum.mcq1c.options.find((o) => !o.isCorrect)!;

    const onCorrect = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq1c",
      optionId: correctId,
    });
    expect(onCorrect.step).toBe("simulation");

    const onWrong = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq1c",
      optionId: wrong.id,
    });
    expect(onWrong.step).toBe("remediation1c");
    expect(onWrong.lastWrongOptionId).toBe(wrong.id);
  });

  it("remediation1b → mcq1b on ADVANCE (retry)", () => {
    const state: LessonState = {
      ...initialLessonState,
      step: "remediation1b",
      lastWrongOptionId: "mcq1b_a",
    };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.step).toBe("mcq1b");
    expect(next.lastWrongOptionId).toBeUndefined();
  });

  it("remediation1c → mcq1c on ADVANCE (retry)", () => {
    const state: LessonState = {
      ...initialLessonState,
      step: "remediation1c",
      lastWrongOptionId: "mcq1c_a",
    };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.step).toBe("mcq1c");
    expect(next.lastWrongOptionId).toBeUndefined();
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
    "remediation1b",
    "remediation1c",
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
  it("returns 0/7 for intro (lesson not started)", () => {
    expect(progressFor("intro")).toEqual({ current: 0, total: 7 });
  });

  it("returns 1/7 for reading1", () => {
    expect(progressFor("reading1")).toEqual({ current: 1, total: 7 });
  });

  it("collapses remediation1 onto mcq1 (2/7)", () => {
    expect(progressFor("remediation1")).toEqual({ current: 2, total: 7 });
  });

  it("collapses remediation1b onto mcq1b (3/7)", () => {
    expect(progressFor("remediation1b")).toEqual({ current: 3, total: 7 });
  });

  it("collapses remediation1c onto mcq1c (4/7)", () => {
    expect(progressFor("remediation1c")).toEqual({ current: 4, total: 7 });
  });

  it("collapses remediation2 onto mcq2 (6/7)", () => {
    expect(progressFor("remediation2")).toEqual({ current: 6, total: 7 });
  });

  it("returns 7/7 for done (lesson complete)", () => {
    expect(progressFor("done")).toEqual({ current: 7, total: 7 });
  });
});
