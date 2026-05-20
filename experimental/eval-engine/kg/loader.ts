import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
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

export interface NamedRawNode {
  content: unknown;
  sourcePath: string;
}

export interface RawKGInput {
  learningGoals: NamedRawNode[];
  atomicFacts: NamedRawNode[];
  misconceptions: NamedRawNode[];
  sources: NamedRawNode[];
}

/** Wraps a plain unknown[] input with synthetic <inline>[i] source paths. */
export function toRawInput(input: {
  learningGoals: unknown[];
  atomicFacts: unknown[];
  misconceptions: unknown[];
  sources: unknown[];
}): RawKGInput {
  const wrap = (items: unknown[], label: string): NamedRawNode[] =>
    items.map((content, i) => ({ content, sourcePath: `<inline:${label}>[${i}]` }));
  return {
    learningGoals: wrap(input.learningGoals, "learningGoals"),
    atomicFacts: wrap(input.atomicFacts, "atomicFacts"),
    misconceptions: wrap(input.misconceptions, "misconceptions"),
    sources: wrap(input.sources, "sources"),
  };
}

function parseAll<S extends z.ZodTypeAny>(nodes: NamedRawNode[], schema: S): z.infer<S>[] {
  return nodes.map(({ content, sourcePath }) => {
    const result = schema.safeParse(content);
    if (!result.success) {
      const issues = result.error.issues;
      const first = issues[0];
      const extra = issues.length > 1 ? ` (and ${issues.length - 1} more issue${issues.length - 1 === 1 ? "" : "s"})` : "";
      throw new Error(
        `KG validation error in ${sourcePath} at path '${first.path.join(".")}': ${first.message}${extra}`,
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
    learningGoals: parseAll(input.learningGoals, LearningGoalSchema),
    atomicFacts: parseAll(input.atomicFacts, AtomicFactSchema),
    misconceptions: parseAll(input.misconceptions, MisconceptionSchema),
    sources: parseAll(input.sources, SourceExcerptSchema),
  };
}

export function readKGFromDisk(rootDir: string): RawKGInput {
  const readDir = (sub: string): NamedRawNode[] => {
    const dir = path.join(rootDir, sub);
    try {
      return readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => {
          const filePath = path.join(dir, f);
          return {
            content: JSON.parse(readFileSync(filePath, "utf8")),
            sourcePath: path.join(sub, f),
          };
        });
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
