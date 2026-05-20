import type {
  LearningGoal,
  AtomicFact,
  Misconception,
  SourceExcerpt,
  LearningGoalId,
  AtomicFactId,
} from "./schemas";
import type { ParsedKG } from "./loader";

export interface KGContext {
  learningGoal: LearningGoal;
  taughtFacts: AtomicFact[];
  addressedMisconceptions: Misconception[];
  sourceExcerpts: SourceExcerpt[];
}

export interface LoadedKG {
  learningGoals: Map<LearningGoalId, LearningGoal>;
  atomicFacts: Map<AtomicFactId, AtomicFact>;
  misconceptions: Map<string, Misconception>;
  sources: Map<string, SourceExcerpt>;
  getLearningGoal(id: LearningGoalId): LearningGoal;
  factsTaughtBy(id: LearningGoalId): AtomicFact[];
  misconceptionsAddressedBy(id: LearningGoalId): Misconception[];
  excerptsCitedBy(factId: AtomicFactId): SourceExcerpt[];
  resolveContext(id: LearningGoalId): KGContext;
}

export function buildLoadedKG(parsed: ParsedKG): LoadedKG {
  const learningGoals = new Map(parsed.learningGoals.map((g) => [g.id, g]));
  const atomicFacts = new Map(parsed.atomicFacts.map((f) => [f.id, f]));
  const misconceptions = new Map(parsed.misconceptions.map((m) => [m.id, m]));
  const sources = new Map(parsed.sources.map((s) => [s.id, s]));

  const getLearningGoal = (id: LearningGoalId): LearningGoal => {
    const g = learningGoals.get(id);
    if (!g) {
      throw new Error(
        `Unknown learning goal '${id}'. Available: ${[...learningGoals.keys()].join(", ") || "(none)"}`,
      );
    }
    return g;
  };

  const factsTaughtBy = (id: LearningGoalId): AtomicFact[] =>
    getLearningGoal(id).teaches.map((fid) => {
      const f = atomicFacts.get(fid);
      if (!f) throw new Error(`Internal KG inconsistency: '${id}' teaches '${fid}' but no such fact is loaded. Run validateReferences before buildLoadedKG.`);
      return f;
    });

  const misconceptionsAddressedBy = (id: LearningGoalId): Misconception[] =>
    getLearningGoal(id).addresses.map((mid) => {
      const m = misconceptions.get(mid);
      if (!m) throw new Error(`Internal KG inconsistency: '${id}' addresses '${mid}' but no such misconception is loaded. Run validateReferences before buildLoadedKG.`);
      return m;
    });

  const excerptsCitedBy = (factId: AtomicFactId): SourceExcerpt[] => {
    const fact = atomicFacts.get(factId);
    if (!fact) throw new Error(`Unknown fact '${factId}'`);
    return fact.cites.map((sid) => {
      const s = sources.get(sid);
      if (!s) throw new Error(`Internal KG inconsistency: fact '${factId}' cites '${sid}' but no such source is loaded. Run validateReferences before buildLoadedKG.`);
      return s;
    });
  };

  const resolveContext = (id: LearningGoalId): KGContext => {
    const learningGoal = getLearningGoal(id);
    const taughtFacts = factsTaughtBy(id);
    const addressedMisconceptions = misconceptionsAddressedBy(id);
    const excerptIds = new Set<string>();
    for (const f of taughtFacts) for (const sid of f.cites) excerptIds.add(sid);
    const sourceExcerpts = [...excerptIds].map((sid) => {
      const s = sources.get(sid);
      if (!s) throw new Error(`Internal KG inconsistency: source '${sid}' referenced in context for '${id}' but no such source is loaded. Run validateReferences before buildLoadedKG.`);
      return s;
    });
    return { learningGoal, taughtFacts, addressedMisconceptions, sourceExcerpts };
  };

  return {
    learningGoals,
    atomicFacts,
    misconceptions,
    sources,
    getLearningGoal,
    factsTaughtBy,
    misconceptionsAddressedBy,
    excerptsCitedBy,
    resolveContext,
  };
}
