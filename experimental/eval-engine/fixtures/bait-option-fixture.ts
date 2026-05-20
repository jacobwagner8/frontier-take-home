import type { Curriculum } from "@/lib/curriculum.types";
import { curriculum as good } from "./good-bonding-lesson";

export const expectedOverallPass = true;

export const curriculum: Curriculum = {
  ...good,
  mcq1: {
    ...good.mcq1,
    options: [
      ...good.mcq1.options,
      {
        id: "extra-bait",
        text: "A subpanel needs the neutral bonded to ground, just like the main panel, to be safe.",
        isCorrect: false,
        remediation:
          "Subpanels keep N and EGC isolated; a second bond creates a parallel return path through the EGC and bonded metal.",
        misconceptionTag: "more_bonding_is_safer",
      },
    ],
  },
};
