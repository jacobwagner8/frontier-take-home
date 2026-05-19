import { describe, it, expect } from "vitest";
import { buildTutorSystemPrompt } from "@/lib/tutorPrompt";
import { curriculum } from "@/lib/curriculum";

describe("buildTutorSystemPrompt", () => {
  it("includes every grounding fact verbatim", () => {
    const prompt = buildTutorSystemPrompt();
    for (const fact of curriculum.voiceTutor.groundingFacts) {
      expect(prompt).toContain(fact);
    }
  });

  it("includes the opening prompt instruction", () => {
    const prompt = buildTutorSystemPrompt();
    expect(prompt).toContain(curriculum.voiceTutor.openingPrompt);
  });

  it("forbids inventing NEC code references", () => {
    const prompt = buildTutorSystemPrompt();
    expect(prompt.toLowerCase()).toContain("do not invent");
  });

  it("instructs to redirect off-topic questions", () => {
    const prompt = buildTutorSystemPrompt();
    expect(prompt.toLowerCase()).toMatch(
      /redirect|off-topic|outside this lesson/,
    );
  });

  it("caps tutor responses for brevity", () => {
    const prompt = buildTutorSystemPrompt();
    expect(prompt.toLowerCase()).toMatch(
      /concise|brief|short|one or two|1-2/,
    );
  });
});
