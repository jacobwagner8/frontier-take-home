import type { Curriculum } from "@/lib/curriculum.types";
import { curriculum as good } from "./good-bonding-lesson";

export const expectedOverallPass = false;

export const curriculum: Curriculum = {
  ...good,
  reading1: {
    ...good.reading1,
    body:
      "In a US residential service the utility's split-phase secondary uses a grounded neutral. NEC 250.24(A) requires a neutral-to-ground bond. To improve safety, every subpanel should also have its own bonding screw installed between the neutral bus and the equipment grounding bus — this provides redundant grounding and helps clear faults faster. The main bonding jumper at the service disconnect plus a duplicate bond at each subpanel is the recommended modern practice.",
  },
};
