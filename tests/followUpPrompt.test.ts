import { describe, it, expect } from "vitest";
import {
  buildFollowUpSystemPrompt,
  findMcqByMisconceptionTag,
} from "@/lib/followUpPrompt";
import { kgAtomicFacts } from "@/lib/kgFacts";
import { curriculum } from "@/lib/curriculum";

const ALL_WRONG_TAGS = [
  curriculum.mcq1,
  curriculum.mcq1b,
  curriculum.mcq1c,
  curriculum.mcq2,
].flatMap((m) =>
  m.options.filter((o) => !o.isCorrect && o.misconceptionTag).map(
    (o) => o.misconceptionTag!,
  ),
);

describe("findMcqByMisconceptionTag", () => {
  it("returns the parent MCQ and the matching wrong option", () => {
    const match = findMcqByMisconceptionTag("more_bonding_is_safer");
    expect(match).not.toBeNull();
    expect(match!.mcq.id).toBe("mcq1");
    expect(match!.wrongOption.isCorrect).toBe(false);
    expect(match!.wrongOption.misconceptionTag).toBe("more_bonding_is_safer");
  });

  it("returns null for an unknown tag", () => {
    expect(findMcqByMisconceptionTag("not_a_real_tag")).toBeNull();
  });

  it.each(ALL_WRONG_TAGS)("resolves every curriculum tag: %s", (tag) => {
    expect(findMcqByMisconceptionTag(tag)).not.toBeNull();
  });
});

describe("buildFollowUpSystemPrompt", () => {
  const sampleTag = "more_bonding_is_safer";

  it("returns null for an unknown tag", () => {
    expect(buildFollowUpSystemPrompt("not_a_real_tag")).toBeNull();
  });

  it("includes the MCQ question prompt", () => {
    const p = buildFollowUpSystemPrompt(sampleTag)!;
    expect(p).toContain(curriculum.mcq1.prompt);
  });

  it("includes every option text for the matched MCQ", () => {
    const p = buildFollowUpSystemPrompt(sampleTag)!;
    for (const opt of curriculum.mcq1.options) {
      expect(p).toContain(opt.text);
    }
  });

  it("includes the wrong option's remediation", () => {
    const match = findMcqByMisconceptionTag(sampleTag)!;
    const p = buildFollowUpSystemPrompt(sampleTag)!;
    expect(p).toContain(match.wrongOption.remediation!);
  });

  it("includes the full reading body", () => {
    const p = buildFollowUpSystemPrompt(sampleTag)!;
    expect(p).toContain(curriculum.reading1.body);
  });

  it("includes every KG atomic fact verbatim", () => {
    const p = buildFollowUpSystemPrompt(sampleTag)!;
    for (const fact of kgAtomicFacts) {
      expect(p).toContain(fact.statement);
    }
  });

  it("explicitly forbids revealing the correct option", () => {
    const p = buildFollowUpSystemPrompt(sampleTag)!.toLowerCase();
    expect(p).toMatch(/do not state which option.*is correct/);
  });

  it("forbids ruling out enough options to deduce the answer", () => {
    const p = buildFollowUpSystemPrompt(sampleTag)!.toLowerCase();
    expect(p).toMatch(/do not rule out enough options/);
  });

  it("instructs to decline direct 'what is the answer' requests", () => {
    const p = buildFollowUpSystemPrompt(sampleTag)!.toLowerCase();
    expect(p).toMatch(/which one is right|just tell me the answer/);
    expect(p).toMatch(/decline/);
  });

  it("forbids inventing NEC code references", () => {
    const p = buildFollowUpSystemPrompt(sampleTag)!.toLowerCase();
    expect(p).toContain("do not invent");
  });

  it("does not label any option as correct in the prompt body", () => {
    const p = buildFollowUpSystemPrompt(sampleTag)!;
    // Heuristic: the marker we'd use if we were leaking, plus a few common phrasings.
    expect(p).not.toMatch(/\[CORRECT\]/i);
    expect(p).not.toMatch(/correct answer:\s/i);
  });
});
