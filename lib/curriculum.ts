import type { Curriculum } from "./curriculum.types";

export const curriculum: Curriculum = {
  reading1: {
    id: "r1",
    title: "One bond, exactly one place",
    body: `In a US residential service, the utility brings power in on two hot legs and a neutral. The neutral is intentionally tied to earth so the whole system has a defined voltage reference and a low-impedance path back to the source. That neutral-to-ground connection — the system bond — happens at exactly one place: the service disconnect, which is almost always the main panel. NEC 250.24(A) requires it, and prohibits it anywhere else.

Why bond at all? The most important reason is that earth itself cannot clear a ground fault. A ground rod typically presents tens to hundreds of ohms of resistance to remote earth — far too much for the hundreds of amps a breaker needs to trip. Without a metallic, low-impedance path from a faulted enclosure back to the source, a hot-to-metal fault only pushes a few amps through the rod, the breaker never operates, and the energized metal sits live until something — often a person — completes the circuit. The main bonding jumper creates that path: faulted metal → EGC → neutral bus → service neutral → utility transformer. Fault current rises to hundreds or thousands of amps, and the breaker opens in milliseconds.

The bond also keeps the neutral stable against an open-neutral failure. Residential 120/240 V service hangs the two hot legs off a center-tapped transformer winding with the neutral as the midpoint, so each leg sits at 120 V relative to that midpoint. If the service neutral ever breaks or loosens, the 240 V across the two legs no longer divides evenly — a heavily loaded leg can collapse toward 80 V while the lightly loaded one spikes toward 160 V, frying anything sensitive plugged into it. Because the bond ties the neutral to the grounding electrode system at the service, it provides a backup path that keeps the neutral near earth potential even when the service neutral is compromised.

Doing all of this at exactly one point keeps the system predictable: every fault routes back through the same bonding jumper, and normal load current has no reason to leave the neutral.

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
        remediation: `It's tempting to think more bonding equals more safety, but the opposite is true downstream of the main panel. A second bond gives normal return current a parallel path through the EGC — exactly the hazard the single-bond rule (NEC 250.24(A)) prevents. The result is continuous current on bare ground wires, metal boxes, raceways, and water pipes, none of which were sized or insulated for that job.`,
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
        remediation: `A ground rod typically presents tens to hundreds of ohms to remote earth — far too much resistance for the hundreds of amps that returning load current would demand. Current always returns to the source it came from: the utility transformer's neutral. With a single bond, that path is the neutral wire only. With a second bond, that path is the neutral wire AND the EGC in parallel — not the earth.`,
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
