import { describe, it, expect } from "vitest";
import {
  initialLessonState,
  lessonReducer,
  LessonState,
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
