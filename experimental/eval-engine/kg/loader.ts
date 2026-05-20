import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { z, ZodSchema } from "zod";
import {
  LearningGoalSchema,
  AtomicFactSchema,
  MisconceptionSchema,
  SourceExcerptSchema,
  type LearningGoal,
  type AtomicFact,
  type Misconception,
  type SourceExcerpt,
} from "./schemas";

export interface RawKGInput {
  learningGoals: unknown[];
  atomicFacts: unknown[];
  misconceptions: unknown[];
  sources: unknown[];
}

function parseAll<T>(items: unknown[], schema: ZodSchema<T>, label: string): T[] {
  return items.map((item, i) => {
    const result = schema.safeParse(item);
    if (!result.success) {
      const issue = result.error.issues[0];
      throw new Error(
        `KG validation error in ${label}[${i}] at path '${issue.path.join(".")}': ${issue.message}`,
      );
    }
    return result.data;
  });
}

export interface ParsedKG {
  learningGoals: LearningGoal[];
  atomicFacts: AtomicFact[];
  misconceptions: Misconception[];
  sources: SourceExcerpt[];
}

export function parseKG(input: RawKGInput): ParsedKG {
  return {
    learningGoals: parseAll(input.learningGoals, LearningGoalSchema, "learningGoals"),
    atomicFacts: parseAll(input.atomicFacts, AtomicFactSchema, "atomicFacts"),
    misconceptions: parseAll(input.misconceptions, MisconceptionSchema, "misconceptions"),
    sources: parseAll(input.sources, SourceExcerptSchema, "sources"),
  };
}

export function readKGFromDisk(rootDir: string): RawKGInput {
  const readDir = (sub: string): unknown[] => {
    const dir = path.join(rootDir, sub);
    try {
      return readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  };
  return {
    learningGoals: readDir("learning-goals"),
    atomicFacts: readDir("atomic-facts"),
    misconceptions: readDir("misconceptions"),
    sources: readDir("sources"),
  };
}

export function validateReferences(parsed: ParsedKG): void {
  const factIds = new Set(parsed.atomicFacts.map((f) => f.id));
  const miscIds = new Set(parsed.misconceptions.map((m) => m.id));
  const srcIds = new Set(parsed.sources.map((s) => s.id));
  const goalIds = new Set(parsed.learningGoals.map((g) => g.id));

  const check = (id: string, set: Set<string>, owner: string) => {
    if (!set.has(id)) {
      throw new Error(`KG reference error: '${owner}' references unknown id '${id}'`);
    }
  };

  for (const g of parsed.learningGoals) {
    for (const fid of g.teaches) check(fid, factIds, g.id);
    for (const mid of g.addresses) check(mid, miscIds, g.id);
    for (const pid of g.prerequisites) check(pid, goalIds, g.id);
  }
  for (const f of parsed.atomicFacts) {
    for (const sid of f.cites) check(sid, srcIds, f.id);
  }
  for (const m of parsed.misconceptions) {
    for (const fid of m.correctedBy) check(fid, factIds, m.id);
  }
}
