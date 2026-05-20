import { describe, it, expect } from "vitest";
import { enumerateSlots, studentFacingSlots } from "@/experimental/eval-engine/evaluators/slots";
import type { Curriculum } from "@/lib/curriculum.types";

const sample: Curriculum = {
  reading1: { id: "r1", title: "T", body: "B" },
  mcq1: {
    id: "m1",
    prompt: "P",
    options: [
      { id: "a", text: "right answer", isCorrect: true },
      {
        id: "b",
        text: "wrong answer",
        isCorrect: false,
        remediation: "remed",
        misconceptionTag: "misc.x",
      },
    ],
  },
  simulationCaptions: {
    oneBond: "cap1",
    twoBond: { mechanism: "m", consequence: "c", hazard: "h" },
  },
  mcq2: { id: "m2", prompt: "P2", options: [{ id: "a", text: "t", isCorrect: true }] },
  voiceTutor: { groundingFacts: ["g1", "g2"], openingPrompt: "open" },
};

describe("enumerateSlots", () => {
  it("yields every text slot with its semantic role", () => {
    const slots = enumerateSlots(sample);
    const kinds = slots.map((s) => s.slot.kind);
    expect(kinds).toContain("reading");
    expect(kinds).toContain("mcq");
    expect(kinds).toContain("mcqOption");
    expect(kinds).toContain("simulationCaption");
    expect(kinds).toContain("tutorGroundingFact");
    const wrongOption = slots.find(
      (s) => s.slot.kind === "mcqOption" && s.slot.field === "text" && s.slot.isCorrect === false,
    );
    expect(wrongOption?.excerpt).toBe("wrong answer");
    expect(wrongOption?.slot.kind === "mcqOption" && wrongOption.slot.misconceptionTag).toBe("misc.x");
    const remed = slots.find((s) => s.slot.kind === "mcqOption" && s.slot.field === "remediation");
    expect(remed?.excerpt).toBe("remed");
    expect(remed?.slot.kind === "mcqOption" && remed.slot.misconceptionTag).toBe("misc.x");
  });
});

describe("studentFacingSlots", () => {
  it("excludes wrong MCQ option text but includes their remediation", () => {
    const slots = studentFacingSlots(sample);
    const wrongText = slots.find(
      (s) => s.slot.kind === "mcqOption" && s.slot.field === "text" && s.slot.isCorrect === false,
    );
    expect(wrongText).toBeUndefined();
    const remed = slots.find((s) => s.slot.kind === "mcqOption" && s.slot.field === "remediation");
    expect(remed).toBeDefined();
  });
});
