import type { Curriculum } from "@/lib/curriculum.types";
import { curriculum as good } from "./good-bonding-lesson";

export const expectedOverallPass = true;

export const curriculum: Curriculum = {
  ...good,
  voiceTutor: {
    ...good.voiceTutor,
    groundingFacts: [
      ...good.voiceTutor.groundingFacts,
      "GFCIs typically trip in under 25 milliseconds at 5 mA of line-to-ground leakage.",
    ],
  },
};
