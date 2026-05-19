import type { Curriculum } from "./curriculum.types";

export const curriculum: Curriculum = {
  reading1: {
    id: "r1",
    title: "One bond, exactly one place",
    body: `In a US residential service, the utility brings power in on two hot legs and a neutral. The neutral is intentionally tied to earth so the whole system has a defined voltage reference and a low-impedance path back to the source. That neutral-to-ground connection — the system bond — happens at exactly one place: the service disconnect, which is almost always the main panel. NEC 250.24(A) requires it, and prohibits it anywhere else.

Inside the main panel, a main bonding jumper (a screw or strap supplied by the manufacturer) ties together the neutral bus, the equipment grounding conductor (EGC) bus, the metal enclosure, and the grounding electrode conductor that runs to the ground rod or water-pipe ground. From the panel onward, the neutral carries normal return current back to the source. The EGC is the bare or green wire that connects every metal box, raceway, and appliance frame back to that one bonding point. Under normal conditions the EGC carries no current; it only carries fault current briefly when a hot conductor touches a metal part, long enough to trip the breaker.

Downstream of the main panel — at every subpanel, junction, and device — the neutral and EGC are kept on separate buses and never tied together again. A second bond would give normal return current a parallel path back through the EGC and every metal box, raceway, and appliance frame bonded to it. The EGC is meant to carry only brief fault current — long enough to trip a breaker — not continuous load current. Routing normal current through it creates voltage drops along grounded metal that should all sit at the same potential, which is the exact hazard the single-bond rule prevents.`,
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
        remediation: `It's tempting to think more bonding equals more safety, but the opposite is true downstream of the main panel. A second bond gives normal return current a parallel path through the EGC — exactly what NEC 250.142 prohibits. The result is continuous current on bare ground wires, metal boxes, raceways, and water pipes, none of which were sized or insulated for that job.`,
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
        remediation: `The ground rod and the N-G bond happen at the same place — the main panel — but they are different things. The bond is the screw or strap that ties the neutral bus to the equipment-ground bus inside the panel. The rod just provides a connection to earth for lightning and stray voltage. Earth itself is far too high-resistance to be a normal return path; current returns to the source through the utility neutral, not the dirt.`,
      },
      {
        id: "mcq1_d",
        text: "Nowhere — neutral and ground are always separate",
        isCorrect: false,
        misconceptionTag: "always_separate",
        remediation: `Neutral and ground ARE bonded — just at exactly one point. That single connection is what makes a ground fault clear: when a hot wire touches a metal case, current flows hot → EGC → main bond → neutral → back to the utility transformer, fast and high enough to trip the breaker. With no bond at all, a fault would energize the case and sit there waiting for someone to touch it.`,
      },
    ],
  },

  simulationCaptions: {
    oneBond: `With a single bond at the service, normal load current returns to the source through the neutral. The EGC and every bonded metal part — boxes, raceways, the appliance case — sit at the same potential as the panel's ground bus. Touching the case is safe because there's no voltage difference between it and anything else you might touch.`,
    twoBond: `Add a second bond at the subpanel and the neutral and EGC are now tied together at two points. Normal return current divides between them, with the EGC carrying its share back to the main panel. That continuous current creates voltage drops along the EGC — so "grounded" metal parts are no longer at the same potential, and bonded surfaces at different points in the system sit at different voltages.`,
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
        remediation: `Redundant paths in a circuit aren't passive — they're parallel. Two conductors tied at both ends share current proportional to their conductance. The moment the second bond is in, every bonded metal raceway and EGC starts carrying continuous load current — what the NEC calls "objectionable current" (250.6). They were never sized or insulated for that, and the voltage drops they produce show up as touch voltage on appliance cases and water pipes.`,
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
        remediation: `Earth has roughly 25 ohms or more at a typical ground rod — far too much resistance to carry significant current. Current always returns to the source it came from: the utility transformer's neutral. With a single bond, that path is the neutral wire only. With a second bond, that path is the neutral wire AND the EGC in parallel — not the earth.`,
      },
      {
        id: "mcq2_d",
        text: "The breaker trips immediately",
        isCorrect: false,
        misconceptionTag: "double_bond_trips_breaker",
        remediation: `Overcurrent breakers trip on overload or short circuit, not on a wiring mistake. A second N-G bond just splits the normal return current across two conductors; the total current is unchanged and well below the trip threshold. The breaker has no way to see the problem. The danger is invisible until a fault occurs or someone touches two bonded surfaces at different potentials.`,
      },
    ],
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
      "Nice work finishing the lesson. In your own words, what's the rule about where neutral and ground get bonded in a residential system — and what physically goes wrong if there's a second bond downstream of the service?",
  },
};
