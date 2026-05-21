import type { Curriculum } from "./curriculum.types";

export const curriculum: Curriculum = {
  reading1: {
    id: "r1",
    title: "One bond, exactly one place",
    body: `In a US residential service, the utility brings power in on two hot legs and a neutral. The neutral is intentionally tied to earth so the whole system has a defined voltage reference and a low-impedance path back to the source. That neutral-to-ground connection — the system bond — happens at exactly one place: the service disconnect, which is almost always the main panel. NEC 250.24(A) requires it, and prohibits it anywhere else.

Doing all of this at exactly one point keeps the system predictable: every fault routes back through the same bonding jumper, and normal load current has no reason to leave the neutral.

Inside the main panel, a main bonding jumper (a screw or strap supplied by the manufacturer) ties together the neutral bus, the equipment grounding conductor (EGC) bus, the metal enclosure, and the grounding electrode conductor that runs to the ground rod or water-pipe ground. From the panel onward, the neutral carries normal return current back to the source. The EGC is the bare or green wire that connects every metal box, raceway, and appliance frame back to that one bonding point. Under normal conditions the EGC carries no current; it only carries fault current briefly when a hot conductor touches a metal part, long enough to trip the breaker.

Downstream of the main panel — at every subpanel, junction, and device — the neutral and EGC are kept on separate buses and never tied together again. A second bond would give normal return current a parallel path back through the EGC and every metal box, raceway, and appliance frame bonded to it, creating a touch-voltage shock hazard. The EGC is meant to carry only brief fault current — long enough to trip a breaker — not continuous load current. Routing normal current through it creates voltage drops along grounded metal that should all sit at the same potential, which is the exact hazard the single-bond rule prevents.

Why bond at all? The most important reason is that earth itself cannot clear a ground fault. A ground rod typically presents tens to hundreds of ohms of resistance to remote earth — far too much for the hundreds of amps a breaker needs to trip. Without a metallic, low-impedance path from a faulted enclosure back to the source, a hot-to-metal fault only pushes a few amps through the rod, the breaker never operates, and the energized metal sits live until something — often a person — completes the circuit. The main bonding jumper creates that path: faulted metal → EGC → neutral bus → service neutral → utility transformer. Fault current rises to hundreds or thousands of amps, and the breaker opens in milliseconds.`,
    imageSrc: "/images/single-bond.svg",
    imageAlt:
      "Diagram showing a utility service drop feeding a main panel, where a red main bonding jumper ties the neutral bus to the EGC bus and a grounding electrode conductor runs down to a ground rod. A feeder carries the two hots, neutral, and EGC out to a subpanel whose neutral and EGC buses are kept separate, with a crossed-out connection labeled 'No bond here.'",
  },

  mcq1: {
    id: "mcq1",
    prompt: "Where in a residential system is neutral bonded to ground?",
    options: [
      {
        id: "mcq1_a",
        text: "At every panel and subpanel",
        isCorrect: false,
        misconceptionTag: "more_bonding_is_safer",
        remediation: `It's tempting to think more bonding equals more safety, but the opposite is true downstream of the main panel. A second bond gives normal return current a parallel path through the EGC — exactly what NEC 250.142 prohibits on the load side of the service disconnect. The result is continuous current on bare ground wires, metal boxes, raceways, and water pipes, none of which were sized or insulated for that job.`,
      },
      {
        id: "mcq1_b",
        text: "At the service disconnect only",
        isCorrect: true,
      },
      {
        id: "mcq1_c",
        text: "Wherever the ground rod connects",
        isCorrect: false,
        misconceptionTag: "ground_rod_is_the_bond",
        remediation: `The ground rod and the N-G bond happen at the same place — the main panel — but they are different things. The bond is the screw or strap that ties the neutral bus to the equipment-ground bus inside the panel. The rod is just the connection from that bus down to earth — and earth itself is far too high-resistance to be a normal return path. A ground rod typically presents tens to hundreds of ohms to remote earth, so current returns to the source through the utility neutral, not the dirt.`,
      },
      {
        id: "mcq1_d",
        text: "Nowhere — neutral and ground are always separate",
        isCorrect: false,
        misconceptionTag: "always_separate",
        remediation: `Neutral and ground ARE bonded — just at exactly one point. That single connection is what makes a ground fault clear: when a hot wire touches a metal case, current flows hot → EGC → main bond → neutral → back to the utility transformer, fast and high enough to trip the breaker. With no bond at all, a fault would energize the case and sit there waiting for someone to touch it.`,
      },
    ],
    rationale: `Exactly one bond, at the service disconnect — that's NEC 250.24(A). That single point gives every fault one defined low-impedance path back to the utility transformer, and keeps normal return current entirely on the neutral. Anywhere else (or everywhere), and the EGC starts carrying load current it was never sized for — exactly what NEC 250.142 prohibits.`,
  },

  mcq1b: {
    id: "mcq1b",
    prompt:
      "A hot conductor inside an appliance frays and touches the appliance's metal case. What actually causes the breaker to trip and de-energize the case?",
    options: [
      {
        id: "mcq1b_a",
        text: "The ground rod carries the fault current safely into the earth.",
        isCorrect: false,
        misconceptionTag: "ground_rod_clears_fault",
        remediation: `A ground rod typically presents 25 to 100+ ohms to remote earth. At 120 V, that's only a few amps through the rod — well below the trip threshold of a 15 or 20 A breaker. Earth simply isn't a low-enough-impedance return path to clear a fault. What actually clears it is the metallic path from faulted case → EGC → main bonding jumper → service neutral → utility transformer, which draws hundreds or thousands of amps and trips the breaker in milliseconds.`,
      },
      {
        id: "mcq1b_b",
        text: "Fault current flows through the EGC and main bonding jumper back to the utility transformer, driving enough current to trip the breaker.",
        isCorrect: true,
      },
      {
        id: "mcq1b_c",
        text: "A GFCI in the panel senses current leaking to ground and opens the circuit.",
        isCorrect: false,
        misconceptionTag: "gfci_clears_all_faults",
        remediation: `GFCIs detect imbalance between hot and neutral (at 4–6 mA) and only protect specific branch circuits — kitchens, baths, laundry, outdoors. Most circuits in a house rely on the overcurrent breaker to clear a ground fault. The breaker only trips because the main bonding jumper turns a hot-to-case fault into a metallic short circuit through the EGC and service neutral back to the transformer. Without that bond, even a GFCI-protected circuit would still leave any unprotected appliance frame energized; the bond is what makes fast, predictable clearing possible system-wide.`,
      },
      {
        id: "mcq1b_d",
        text: "The bonded metal connects to the ground rod, so the fault current drains harmlessly into the earth.",
        isCorrect: false,
        misconceptionTag: "earth_absorbs_fault",
        remediation: `Earth doesn't absorb or dissipate current — current returns to its source. In a residential service, that source is the utility transformer's center-tapped winding, not the soil. A ground rod is roughly 25 ohms or more to remote earth, so even a full 120 V across it would push only a few amps — well below any breaker's trip point. What clears the fault is the copper path from EGC to main bonding jumper to neutral to transformer, with low enough impedance to draw hundreds or thousands of amps. The ground rod's job is lightning and voltage reference, not fault clearing.`,
      },
    ],
    rationale: `The metallic path from faulted case → EGC → main bonding jumper → service neutral → utility transformer is what turns a hot-to-case fault into a short circuit. That low-impedance return drives hundreds or thousands of amps and trips a 15 or 20 A breaker in milliseconds. The bond is what makes the breaker effective for ground faults; without it, even an intact breaker can't see the fault.`,
  },

  simulationCaptions: {
    oneBond: `With a single bond at the service, normal load current returns to the source through the neutral. The EGC and every bonded metal part — boxes, raceways, the appliance case — sit at the same potential as the panel's ground bus. Touching the case is safe because there's no voltage difference between it and anything else you might touch.`,
    twoBond: {
      mechanism:
        "The EGC is now a return route alongside the neutral — a parallel path back to the source.",
      consequence:
        "Normal load return current divides between the two paths, so the EGC carries continuous current that it was never sized or insulated to handle.",
      hazard:
        'Voltage drops along the EGC put grounded metal at different points of the system at different potentials — two "grounded" surfaces a person can touch are no longer at the same voltage.',
    },
  },

  mcq2: {
    id: "mcq2",
    prompt:
      "A homeowner adds a bonding screw at their subpanel because they think it makes things safer. What actually happens during normal operation?",
    options: [
      {
        id: "mcq2_a",
        text: "Nothing — the second bond is redundant",
        isCorrect: false,
        misconceptionTag: "redundancy_is_harmless",
        remediation: `Redundant paths in a circuit aren't passive — they're parallel. Two conductors tied at both ends share current proportional to their conductance. The moment the second bond is in, every bonded metal raceway and EGC starts carrying continuous load current — current the EGC was meant to carry only briefly during a fault, long enough to trip a breaker. They were never sized or insulated for that, and the voltage drops they produce show up as touch voltage on appliance cases and water pipes.`,
      },
      {
        id: "mcq2_b",
        text: "Normal return current splits between the neutral and the equipment grounding path",
        isCorrect: true,
      },
      {
        id: "mcq2_c",
        text: "All current flows through the ground rod into the earth",
        isCorrect: false,
        misconceptionTag: "earth_is_return_path",
        remediation: `A ground rod typically presents tens to hundreds of ohms to remote earth — far too much resistance compared to the copper neutral that runs all the way back to the transformer. Current returns to the source it came from on the wire, not through the dirt: that source is the utility transformer's neutral. With a single bond, that path is the neutral wire only. With a second bond, that path is the neutral wire AND the EGC in parallel — not the earth.`,
      },
      {
        id: "mcq2_d",
        text: "The breaker trips immediately",
        isCorrect: false,
        misconceptionTag: "double_bond_trips_breaker",
        remediation: `Overcurrent breakers trip on overload or short circuit, not on a wiring mistake. A second N-G bond just splits the normal return current across two conductors; the total current is unchanged and well below the trip threshold. The breaker has no way to see the problem. The danger is invisible until a fault occurs or someone touches two bonded surfaces at different potentials.`,
      },
    ],
    rationale: `A second bond creates a parallel return path: load current can now return either through the neutral or through the EGC plus every bonded raceway and metal box. It divides between the two by their relative impedances, so the EGC carries continuous current it wasn't sized or insulated for. Voltage drops along that grounded metal show up as touch voltage between surfaces that should all sit at the same potential — the exact hazard the single-bond rule prevents.`,
  },

  voiceTutor: {
    groundingFacts: [
      "The N-G bond exists at exactly one point: the service disconnect (main panel). NEC 250.24(A) requires this, and NEC 250.142 prohibits using the neutral for equipment grounding downstream of the service.",
      "Downstream of the bond, the neutral carries normal return current and the EGC carries fault current only — briefly, when a hot conductor touches a grounded surface, long enough to trip the breaker.",
      "A second N-G bond creates parallel return paths through the EGC and any bonded metal: raceways, water pipes, panel enclosures, the grounding electrode conductor.",
      "Objectionable current on EGCs (NEC 250.6) produces voltage drops on 'grounded' surfaces, creating touch-voltage hazards between bonded metal parts that should be at the same potential.",
      "Multiple bonds confuse GFCI imbalance detection and make ground-fault clearing slower and less predictable, because fault current divides across paths of varying impedance instead of taking the low-impedance designed path back to the source.",
      "Earth is not a normal return path. A ground rod is roughly 25 ohms or more — far too high to carry load current. Current returns to the utility transformer's neutral.",
    ],
    openingPrompt:
      "Nice work finishing the lesson. In a sentence or two, what's the main thing you're taking away?",
  },
};
