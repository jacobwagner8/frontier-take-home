import type { Curriculum } from "@/lib/curriculum.types";

export const expectedOverallPass = true;

export const curriculum: Curriculum = {
  reading1: {
    id: "reading-bonding-rule",
    title: "The one-point bonding rule",
    body:
      "In a US residential service the utility's split-phase secondary uses a grounded neutral — one of the conductors is intentionally tied to earth. NEC 250.24(A) requires this neutral-to-ground bond to occur at exactly one point: the service disconnect (the main panel). The bonding screw ties the neutral bus, the equipment grounding bus, the panel enclosure, and the grounding electrode system together at that single point. Downstream of that point — in every subpanel — the neutral and the equipment grounding conductor (EGC) are kept electrically isolated.",
  },
  mcq1: {
    id: "mcq-where-is-bond",
    prompt: "Where is the neutral-to-ground bond located in a US residential service?",
    options: [
      {
        id: "service-disconnect",
        text: "At the service disconnect (the main panel), at exactly one point.",
        isCorrect: true,
      },
      {
        id: "every-subpanel",
        text: "At every panel, including each subpanel.",
        isCorrect: false,
        remediation:
          "Per NEC 250.142 the neutral bus and the EGC bus must be kept electrically isolated downstream of the service disconnect. A second bond at a subpanel creates a parallel return path through the EGC.",
        misconceptionTag: "misc.subpanels-need-own-bond",
      },
      {
        id: "anywhere",
        text: "Anywhere convenient — the location does not matter.",
        isCorrect: false,
        remediation:
          "NEC 250.24(A) is explicit: the bond is at the service disconnect. Multiple bonds violate 250.142 and 250.6.",
        misconceptionTag: "misc.more-bonds-is-safer",
      },
    ],
  },
  simulationCaptions: {
    oneBond:
      "With one bond at the service disconnect, normal load return current flows on the neutral. The EGC carries no current.",
    twoBond: {
      mechanism:
        "A second bond at the subpanel ties the neutral and the EGC together at two points. They form a parallel pair.",
      consequence:
        "Normal load return current divides between the neutral and the EGC in proportion to their admittances.",
      hazard:
        "Continuous current flows on the EGC, raceways, and bonded metal — surfaces that were never sized or insulated to carry it.",
    },
  },
  mcq2: {
    id: "mcq-what-goes-wrong",
    prompt: "What physically goes wrong when a second N-G bond is added at a subpanel?",
    options: [
      {
        id: "parallel-path",
        text: "The neutral and the EGC form a parallel return path, so load current flows on the EGC.",
        isCorrect: true,
      },
      {
        id: "voltage-rises",
        text: "The voltage across the panel rises above 240 V.",
        isCorrect: false,
        remediation:
          "Source voltage does not change. The problem is current redistribution: load return current now divides between the neutral and the EGC.",
        misconceptionTag: "misc.ground-and-neutral-are-the-same",
      },
    ],
  },
  voiceTutor: {
    groundingFacts: [
      "NEC 250.24(A) requires exactly one N-G bond at the service disconnect.",
      "NEC 250.142 forbids using the grounded conductor for grounding non-current-carrying parts downstream of the service disconnect.",
      "A second bond creates a parallel return path through the EGC, putting continuous load current on bonded metal.",
      "Multiple bonds make fault clearing unpredictable because fault current divides across multiple paths.",
      "NEC 250.6 prohibits arrangements that cause objectionable current on grounding conductors.",
    ],
    openingPrompt:
      "Walk me through where the bond goes and why a second bond is a problem. I'll ask one or two follow-ups.",
  },
};
