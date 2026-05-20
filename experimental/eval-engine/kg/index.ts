import path from "node:path";
import {
  parseKG,
  readKGFromDisk,
  validateReferences,
  toRawInput,
  type RawKGInput,
} from "./loader";
import { buildLoadedKG, type LoadedKG, type KGContext } from "./traversal";

export type { LoadedKG, KGContext };
export type {
  LearningGoal,
  AtomicFact,
  Misconception,
  SourceExcerpt,
  LearningGoalId,
  AtomicFactId,
  MisconceptionId,
  SourceExcerptId,
} from "./schemas";

/** Plain inline input shape — callers don't need to wrap each node manually. */
export interface InlineKGInput {
  learningGoals: unknown[];
  atomicFacts: unknown[];
  misconceptions: unknown[];
  sources: unknown[];
}

export function loadKG(input: InlineKGInput): LoadedKG {
  const parsed = parseKG(toRawInput(input));
  validateReferences(parsed);
  return buildLoadedKG(parsed);
}

const DEFAULT_KG_DIR = path.join(__dirname);

export function loadKGFromDisk(rootDir: string = DEFAULT_KG_DIR): LoadedKG {
  const raw = readKGFromDisk(rootDir);
  const parsed = parseKG(raw);
  validateReferences(parsed);
  return buildLoadedKG(parsed);
}
