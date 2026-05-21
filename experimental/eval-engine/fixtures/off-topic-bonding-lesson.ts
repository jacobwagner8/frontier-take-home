import type { Curriculum } from "@/lib/curriculum.types";

export const expectedOverallPass = false;

export const curriculum: Curriculum = {
  reading1: {
    id: "reading-gfci-test",
    title: "How to test a GFCI receptacle",
    body:
      "A GFCI receptacle has TEST and RESET buttons. Press TEST monthly; the RESET button should pop out and power to the receptacle should be cut. Press RESET to restore power. Plug-in GFCI testers add a small line-to-ground leakage to confirm the device trips at around 5 mA. If the device fails to trip, it must be replaced.",
  },
  mcq1: {
    id: "mcq-gfci-trip-current",
    prompt: "Around what current does a residential GFCI trip?",
    options: [
      { id: "5ma", text: "About 5 mA of line-to-ground leakage current.", isCorrect: true },
      {
        id: "500ma",
        text: "About 500 mA.",
        isCorrect: false,
        remediation: "GFCIs trip at roughly 5 mA, not 500 mA. The threshold is set low because it is below the let-go threshold for most adults.",
        misconceptionTag: "misc.gfci-amps",
      },
    ],
    rationale: "GFCIs are set to trip at approximately 5 mA, below the let-go threshold for most adults.",
  },
  mcq1b: {
    id: "mcq-gfci-button-purpose",
    prompt: "What does pressing the TEST button on a GFCI do?",
    options: [
      { id: "simulates-leakage", text: "It simulates a small ground-fault leakage to verify the device trips.", isCorrect: true },
      {
        id: "cuts-power-always",
        text: "It cuts power to the receptacle whether or not the device is working.",
        isCorrect: false,
        remediation: "The TEST button injects a small imbalance the GFCI must detect; if the device is broken, pressing TEST will not cut power.",
        misconceptionTag: "misc.gfci-test-button",
      },
    ],
    rationale: "The TEST button injects a small imbalance to verify the GFCI can detect and trip on a leakage current.",
  },
  simulationCaptions: {
    oneBond: "Healthy circuit: current in equals current out.",
    twoBond: {
      mechanism: "Leakage to ground appears as an imbalance.",
      consequence: "The GFCI senses the imbalance.",
      hazard: "It opens the contacts, breaking the circuit.",
    },
  },
  mcq2: {
    id: "mcq-gfci-monthly",
    prompt: "How often should a homeowner test a GFCI?",
    options: [
      { id: "monthly", text: "Monthly.", isCorrect: true },
      { id: "yearly", text: "Once per year.", isCorrect: false, remediation: "Manufacturers and the NEC commentary recommend monthly testing.", misconceptionTag: "misc.gfci-frequency" },
    ],
    rationale: "Manufacturers and NEC commentary recommend monthly testing to confirm the GFCI trips reliably.",
  },
  voiceTutor: {
    groundingFacts: [
      "GFCIs trip at approximately 5 mA of line-to-ground leakage.",
      "Monthly testing is recommended.",
    ],
    openingPrompt: "Walk me through how a GFCI test works.",
  },
};
