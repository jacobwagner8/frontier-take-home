import { describe, it, expect } from "vitest";
import { curriculum } from "@/lib/curriculum";

const allMcqs = [
  curriculum.mcq1,
  curriculum.mcq1b,
  curriculum.mcq2,
];

describe("curriculum integrity", () => {
  it("every MCQ has exactly one correct option", () => {
    for (const mcq of allMcqs) {
      const correct = mcq.options.filter((o) => o.isCorrect);
      expect(correct, `${mcq.id}`).toHaveLength(1);
    }
  });

  it("every wrong option has remediation text and a misconception tag", () => {
    for (const mcq of allMcqs) {
      for (const opt of mcq.options) {
        if (!opt.isCorrect) {
          expect(opt.remediation, `${mcq.id}/${opt.id}`).toBeTruthy();
          expect(opt.misconceptionTag, `${mcq.id}/${opt.id}`).toBeTruthy();
        }
      }
    }
  });

  it("every MCQ has at least 3 options", () => {
    for (const mcq of allMcqs) {
      expect(mcq.options.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("every MCQ has a non-empty rationale", () => {
    for (const mcq of allMcqs) {
      expect(mcq.rationale, `${mcq.id}`).toBeTruthy();
      expect(mcq.rationale.length, `${mcq.id}`).toBeGreaterThan(20);
    }
  });

  it("grounding facts list is non-empty", () => {
    expect(curriculum.voiceTutor.groundingFacts.length).toBeGreaterThan(0);
  });
});
