import { describe, it, expect } from "vitest";
import {
  initialLessonState,
  lessonReducer,
  currentEntry,
  LessonState,
  progressFor,
} from "@/lib/lessonMachine";
import { curriculum } from "@/lib/curriculum";

describe("lessonReducer", () => {
  it("starts with a single intro entry", () => {
    expect(initialLessonState.entries).toHaveLength(1);
    expect(currentEntry(initialLessonState).step).toBe("intro");
  });

  it("intro → reading1 on ADVANCE (appends, does not replace)", () => {
    const next = lessonReducer(initialLessonState, { type: "ADVANCE" });
    expect(next.entries).toHaveLength(2);
    expect(next.entries[0].step).toBe("intro");
    expect(currentEntry(next).step).toBe("reading1");
  });

  it("reading1 → mcq1 on ADVANCE (appends)", () => {
    const state: LessonState = {
      entries: [{ step: "intro" }, { step: "reading1" }],
    };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.entries).toHaveLength(3);
    expect(currentEntry(next).step).toBe("mcq1");
  });

  it("mcq1 → simulation when answered correctly; locks answeredOptionId", () => {
    const state: LessonState = {
      entries: [{ step: "intro" }, { step: "reading1" }, { step: "mcq1" }],
    };
    const correct = curriculum.mcq1.options.find((o) => o.isCorrect)!;
    const next = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq1",
      optionId: correct.id,
    });
    expect(next.entries).toHaveLength(4);
    // mcq1 entry retained, answered option locked onto it
    expect(next.entries[2].step).toBe("mcq1");
    expect(next.entries[2].answeredOptionId).toBe(correct.id);
    // new simulation entry appended
    expect(currentEntry(next).step).toBe("simulation");
  });

  it("mcq1 wrong → remediation1; both entries record the wrong option", () => {
    const state: LessonState = {
      entries: [{ step: "intro" }, { step: "reading1" }, { step: "mcq1" }],
    };
    const wrong = curriculum.mcq1.options.find((o) => !o.isCorrect)!;
    const next = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq1",
      optionId: wrong.id,
    });
    expect(next.entries).toHaveLength(4);
    expect(next.entries[2].step).toBe("mcq1");
    expect(next.entries[2].answeredOptionId).toBe(wrong.id);
    expect(currentEntry(next).step).toBe("remediation1");
    expect(currentEntry(next).lastWrongOptionId).toBe(wrong.id);
  });

  it("remediation1 → fresh mcq1 attempt on ADVANCE (appends a new mcq entry)", () => {
    const state: LessonState = {
      entries: [
        { step: "intro" },
        { step: "reading1" },
        { step: "mcq1", answeredOptionId: "mcq1_a" },
        { step: "remediation1", lastWrongOptionId: "mcq1_a" },
      ],
    };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.entries).toHaveLength(5);
    const last = currentEntry(next);
    expect(last.step).toBe("mcq1");
    expect(last.answeredOptionId).toBeUndefined();
    // previous mcq1 attempt is preserved in history
    expect(next.entries[2].answeredOptionId).toBe("mcq1_a");
  });

  it("simulation → mcq2 on ADVANCE", () => {
    const state: LessonState = { entries: [{ step: "simulation" }] };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(currentEntry(next).step).toBe("mcq2");
  });

  it("mcq2 wrong → remediation2", () => {
    const state: LessonState = { entries: [{ step: "mcq2" }] };
    const wrong = curriculum.mcq2.options.find((o) => !o.isCorrect)!;
    const next = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq2",
      optionId: wrong.id,
    });
    expect(currentEntry(next).step).toBe("remediation2");
    expect(currentEntry(next).lastWrongOptionId).toBe(wrong.id);
  });

  it("mcq2 correct → voiceTutor", () => {
    const state: LessonState = { entries: [{ step: "mcq2" }] };
    const correctId = curriculum.mcq2.options.find((o) => o.isCorrect)!.id;
    const next = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq2",
      optionId: correctId,
    });
    expect(currentEntry(next).step).toBe("voiceTutor");
  });

  it("voiceTutor → done on ADVANCE", () => {
    const state: LessonState = { entries: [{ step: "voiceTutor" }] };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(currentEntry(next).step).toBe("done");
  });

  it("ADVANCE from done is a no-op (does not append another done entry)", () => {
    const state: LessonState = { entries: [{ step: "done" }] };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next).toBe(state);
  });

  it("RESTART_LESSON resets entries to a single intro", () => {
    const state: LessonState = {
      entries: [
        { step: "intro" },
        { step: "reading1" },
        { step: "mcq1", answeredOptionId: "x" },
      ],
    };
    const next = lessonReducer(state, { type: "RESTART_LESSON" });
    expect(next.entries).toHaveLength(1);
    expect(currentEntry(next).step).toBe("intro");
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
