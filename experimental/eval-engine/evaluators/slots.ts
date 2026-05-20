import type { Curriculum } from "@/lib/curriculum.types";
import type { SlotInstance } from "./types";

/**
 * Yields every text slot in the curriculum with its semantic role.
 *
 * Intentionally NOT emitted:
 * - reading1.title, reading1.imageAlt — titles and alt-text are navigation aids, not factual assertions
 * (mcq.options[i].misconceptionTag IS now threaded into mcqOption slots — see types.ts)
 *
 * A future Curriculum field that holds factual content must be added here explicitly.
 */
export function enumerateSlots(c: Curriculum): SlotInstance[] {
  const out: SlotInstance[] = [];
  out.push({ slot: { kind: "reading", field: "body" }, excerpt: c.reading1.body });
  for (const mcq of [c.mcq1, c.mcq2]) {
    out.push({ slot: { kind: "mcq", mcqId: mcq.id, field: "prompt" }, excerpt: mcq.prompt });
    for (const opt of mcq.options) {
      out.push({
        slot: {
          kind: "mcqOption",
          mcqId: mcq.id,
          optionId: opt.id,
          isCorrect: opt.isCorrect,
          field: "text",
          misconceptionTag: opt.misconceptionTag,
        },
        excerpt: opt.text,
      });
      if (opt.remediation) {
        out.push({
          slot: {
            kind: "mcqOption",
            mcqId: mcq.id,
            optionId: opt.id,
            isCorrect: opt.isCorrect,
            field: "remediation",
            misconceptionTag: opt.misconceptionTag,
          },
          excerpt: opt.remediation,
        });
      }
    }
  }
  out.push({ slot: { kind: "simulationCaption", key: "oneBond" }, excerpt: c.simulationCaptions.oneBond });
  out.push({
    slot: { kind: "simulationCaption", key: "twoBond.mechanism" },
    excerpt: c.simulationCaptions.twoBond.mechanism,
  });
  out.push({
    slot: { kind: "simulationCaption", key: "twoBond.consequence" },
    excerpt: c.simulationCaptions.twoBond.consequence,
  });
  out.push({
    slot: { kind: "simulationCaption", key: "twoBond.hazard" },
    excerpt: c.simulationCaptions.twoBond.hazard,
  });
  c.voiceTutor.groundingFacts.forEach((g, index) =>
    out.push({ slot: { kind: "tutorGroundingFact", index }, excerpt: g }),
  );
  out.push({ slot: { kind: "tutorOpeningPrompt" }, excerpt: c.voiceTutor.openingPrompt });
  return out;
}

/**
 * Student-facing slots only: omits *wrong* MCQ option text (those bait misconceptions and are
 * not "teaching"). Remediations are included because students see them when they answer wrong.
 */
export function studentFacingSlots(c: Curriculum): SlotInstance[] {
  return enumerateSlots(c).filter((s) => {
    if (s.slot.kind === "mcqOption" && s.slot.field === "text" && s.slot.isCorrect === false) {
      return false;
    }
    return true;
  });
}
