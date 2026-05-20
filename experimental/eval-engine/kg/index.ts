import path from "node:path";
import { parseKG, readKGFromDisk, validateReferences, type RawKGInput } from "./loader";
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

export function loadKG(input: RawKGInput): LoadedKG {
  const parsed = parseKG(input);
  validateReferences(parsed);
  return buildLoadedKG(parsed);
}

const DEFAULT_KG_DIR = path.join(__dirname);

export function loadKGFromDisk(rootDir: string = DEFAULT_KG_DIR): LoadedKG {
  return loadKG(readKGFromDisk(rootDir));
}
