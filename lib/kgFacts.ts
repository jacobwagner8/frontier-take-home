import faultClearingImpairment from "@/experimental/eval-engine/kg/atomic-facts/fault-clearing-impairment.json";
import faultCurrentPathViaMbj from "@/experimental/eval-engine/kg/atomic-facts/fault-current-path-via-mbj.json";
import gfciImbalanceConfusion from "@/experimental/eval-engine/kg/atomic-facts/gfci-imbalance-confusion.json";
import groundRodResistance from "@/experimental/eval-engine/kg/atomic-facts/ground-rod-resistance.json";
import mainBondingJumperTies from "@/experimental/eval-engine/kg/atomic-facts/main-bonding-jumper-ties.json";
import nec250142SubpanelIsolation from "@/experimental/eval-engine/kg/atomic-facts/nec-250-142-subpanel-isolation.json";
import nec25024aSingleBond from "@/experimental/eval-engine/kg/atomic-facts/nec-250-24a-single-bond.json";
import objectionableCurrentOnEgc from "@/experimental/eval-engine/kg/atomic-facts/objectionable-current-on-egc.json";
import openNeutralHazard from "@/experimental/eval-engine/kg/atomic-facts/open-neutral-hazard.json";
import parallelReturnMechanism from "@/experimental/eval-engine/kg/atomic-facts/parallel-return-mechanism.json";

export interface KgAtomicFact {
  id: string;
  statement: string;
}

export const kgAtomicFacts: readonly KgAtomicFact[] = [
  nec25024aSingleBond,
  nec250142SubpanelIsolation,
  mainBondingJumperTies,
  faultCurrentPathViaMbj,
  parallelReturnMechanism,
  objectionableCurrentOnEgc,
  faultClearingImpairment,
  gfciImbalanceConfusion,
  groundRodResistance,
  openNeutralHazard,
];
