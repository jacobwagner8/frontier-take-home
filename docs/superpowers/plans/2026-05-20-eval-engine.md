# Eval Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Learning-Commons-style eval engine under `/experimental/eval-engine/` that, given a learning goal and an AI-generated `Curriculum` object, judges (a) factual correctness and (b) learning-goal coverage, and returns a structured pass/fail report. Production code (`app/`, `lib/`, `components/`) is untouched.

**Architecture:** Four layers — a JSON-on-disk Knowledge Graph (LearningGoal / AtomicFact / Misconception / SourceExcerpt nodes) loaded into memory; a thin OpenAI judge wrapper; per-dimension evaluators (Factual Accuracy + Learning Goal Coverage) that consume KG context and emit multi-component structured verdicts; an orchestrator with a fail-closed verdict policy that produces markdown + JSON reports. CLI runs from `npx tsx`. Mocked unit tests run for free every push; live integration tests are opt-in and gated on `OPENAI_API_KEY`.

**Tech Stack:** TypeScript, Vitest, OpenAI SDK (`openai` v4 with `zodResponseFormat` for structured output), `zod` for runtime schema validation, `tsx` for CLI. One-way import boundary: `/experimental/` may import from `lib/curriculum.types.ts`; nothing in `lib/`, `app/`, or `components/` may import from `/experimental/`.

**Spec:** `docs/superpowers/specs/2026-05-20-eval-engine-design.md`

---

## File Structure

```
experimental/eval-engine/
  README.md                                  # Task 13
  package-notes.md                           # Task 1 — why each new dep

  kg/
    schemas.ts                               # Task 2 — zod schemas + derived types
    loader.ts                                # Task 2 — read files + validate
    traversal.ts                             # Task 2 — typed traversal helpers
    index.ts                                 # Task 2 — public re-exports

    learning-goals/                          # Task 3
      ng-bonding-one-point.json
    atomic-facts/                            # Task 3
      nec-250-24a-single-bond.json
      nec-250-142-subpanel-isolation.json
      parallel-return-mechanism.json
      fault-clearing-impairment.json
      objectionable-current-on-egc.json
    misconceptions/                          # Task 3
      subpanels-need-own-bond.json
      ground-and-neutral-are-the-same.json
      more-bonds-is-safer.json
    sources/                                 # Task 3
      nec-2023-250-24a.json
      nec-2023-250-142.json

  judge/
    openaiJudge.ts                           # Task 4 — callJudge wrapper
    majorityVote.ts                          # Task 4 — N-run aggregator

  evaluators/
    types.ts                                 # Task 5 — Evaluator, EvaluatorResult, RubricLevel, KGContext, CurriculumSlotId
    slots.ts                                 # Task 5 — enumerate slots from a Curriculum
    factualAccuracy.ts                       # Task 6
    learningGoalCoverage.ts                  # Task 7
    registry.ts                              # Task 8

  orchestrator/
    verdict.ts                               # Task 8 — fail-closed policy
    runEvaluation.ts                         # Task 8 — main entry

  reports/
    markdown.ts                              # Task 9 — render EvaluationReport → markdown

  cli/
    eval.ts                                  # Task 10 — argv → runEvaluation → stdout/JSON

  fixtures/                                  # Task 11
    good-bonding-lesson.ts
    bad-factual-bonding-lesson.ts
    off-topic-bonding-lesson.ts
    unsupported-claim-lesson.ts
    bait-option-fixture.ts

  tests/
    kg.test.ts                               # Task 2
    judge.test.ts                            # Task 4
    factualAccuracy.test.ts                  # Task 6
    learningGoalCoverage.test.ts             # Task 7
    orchestrator.test.ts                     # Task 8
    markdown.test.ts                         # Task 9
    cli.test.ts                              # Task 10
    fixtures.test.ts                         # Task 11 — assert each fixture's expectedOverallPass field roundtrips through the engine with a mocked judge
    live.eval.test.ts                        # Task 12 — opt-in, real OpenAI

vitest.experimental.config.ts                # Task 1 — separate config for /experimental tests
```

**Files modified outside `/experimental/`:**
- `vitest.config.ts` — add `**/experimental/**` to `exclude`
- `package.json` — add deps (`openai`, `zod`, `tsx`) and scripts (`test:experimental`, `test:eval`)
- `.env.local.example` — note that `OPENAI_API_KEY` is also used by the eval engine (no schema change)

---

## Task 1: Scaffold the experimental package

**Files:**
- Create: `experimental/eval-engine/package-notes.md`
- Create: `experimental/eval-engine/README.md` (minimal stub; expanded in Task 13)
- Create: `vitest.experimental.config.ts`
- Modify: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Create the directory tree**

Run:
```bash
mkdir -p experimental/eval-engine/{kg/{learning-goals,atomic-facts,misconceptions,sources},judge,evaluators,orchestrator,reports,cli,fixtures,tests}
```

Verify with `ls experimental/eval-engine`. Expected: ten subdirectories.

- [ ] **Step 2: Install new dependencies**

Run:
```bash
npm install openai@^4.55.0 zod@^3.23.0
npm install -D tsx@^4.0.0
```

Verify with `node -e "console.log(require('openai/package.json').version, require('zod/package.json').version)"`. Expected: a `4.x.y` and a `3.x.y`.

- [ ] **Step 3: Write package-notes.md**

Create `experimental/eval-engine/package-notes.md` with this exact content:

```markdown
# New dependencies introduced by experimental/eval-engine

| Package | Why | Used in |
|---|---|---|
| `openai` (^4.55) | Structured-output judge calls via `zodResponseFormat`. The existing app uses raw `fetch` for its chat route; the eval engine prefers the SDK for type-safe parsed responses. | `judge/openaiJudge.ts` |
| `zod` (^3.23) | Runtime validation of KG JSON files at load time, and judge response schemas. | `kg/schemas.ts`, `evaluators/*` |
| `tsx` (^4) | Run the CLI without a build step (`npx tsx experimental/eval-engine/cli/eval.ts ...`). | `cli/eval.ts` |

All three are isolated to `/experimental/`. Production code (`app/`, `lib/`, `components/`) does not import them.
```

- [ ] **Step 4: Write README.md stub**

Create `experimental/eval-engine/README.md` with this exact content:

```markdown
# Eval Engine (experimental)

Validates AI-generated lesson content against a structured Knowledge Graph for (a) factual correctness and (b) learning-goal coverage. Modelled on the Chan Zuckerberg Initiative's Learning Commons evaluator + Knowledge Graph architecture.

See `docs/superpowers/specs/2026-05-20-eval-engine-design.md` for the design.

## Run

```
npx tsx experimental/eval-engine/cli/eval.ts \
  --fixture good-bonding-lesson \
  --goal lg.ng-bonding-one-point
```

## Test

```
npm run test:experimental    # mocked judge, free
npm run test:eval            # live OpenAI calls (needs OPENAI_API_KEY)
```
```

- [ ] **Step 5: Create `vitest.experimental.config.ts`**

Create `vitest.experimental.config.ts` at the repo root with this exact content:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["experimental/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.claude/**"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

Notes: `environment: "node"` (eval engine has no DOM); no React plugin needed; no setup files needed.

- [ ] **Step 6: Update `vitest.config.ts` to exclude experimental**

In `vitest.config.ts`, change the `exclude` line from:

```ts
    exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/**"],
```

to:

```ts
    exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/**", "**/experimental/**"],
```

- [ ] **Step 7: Add npm scripts**

In `package.json`, replace the `scripts` block with:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest",
    "test:run": "vitest run",
    "test:experimental": "vitest run --config vitest.experimental.config.ts --exclude '**/live.eval.test.ts'",
    "test:eval": "vitest run --config vitest.experimental.config.ts"
  },
```

- [ ] **Step 8: Verify the main test suite still passes**

Run: `npm run test:run`
Expected: existing tests pass (27 tests per the README), no errors related to the experimental directory.

- [ ] **Step 9: Verify the experimental config runs (and finds zero tests, that's fine)**

Run: `npm run test:experimental`
Expected: vitest reports `No test files found, exiting with code 0` (or similar). Exit code 0 is fine — there are no experimental tests yet.

- [ ] **Step 10: Commit**

```bash
git add experimental/eval-engine/package-notes.md \
        experimental/eval-engine/README.md \
        vitest.experimental.config.ts \
        vitest.config.ts \
        package.json \
        package-lock.json
git commit -m "Scaffold experimental/eval-engine package"
```

Note: the empty subdirectories aren't tracked by git (git ignores empty dirs). They'll be implicitly created when files land in Tasks 2+.

---

## Task 2: KG schemas, loader, and traversal helpers

**Files:**
- Create: `experimental/eval-engine/kg/schemas.ts`
- Create: `experimental/eval-engine/kg/loader.ts`
- Create: `experimental/eval-engine/kg/traversal.ts`
- Create: `experimental/eval-engine/kg/index.ts`
- Create: `experimental/eval-engine/tests/kg.test.ts`

- [ ] **Step 1: Write the failing test**

Create `experimental/eval-engine/tests/kg.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { loadKG, type LoadedKG } from "@/experimental/eval-engine/kg";

describe("KG loader", () => {
  it("loads and validates a minimal in-memory KG", () => {
    const kg = loadKG({
      learningGoals: [
        {
          type: "LearningGoal",
          id: "lg.test",
          question: "Why?",
          summary: "Because.",
          prerequisites: [],
          teaches: ["fact.a"],
          addresses: ["misc.x"],
        },
      ],
      atomicFacts: [
        {
          type: "AtomicFact",
          id: "fact.a",
          statement: "A is true.",
          scope: "test",
          confidence: "high",
          cites: ["src.s1"],
        },
      ],
      misconceptions: [
        {
          type: "Misconception",
          id: "misc.x",
          name: "X",
          statement: "X is wrong.",
          correction: "Actually Y.",
          correctedBy: ["fact.a"],
        },
      ],
      sources: [
        {
          type: "SourceExcerpt",
          id: "src.s1",
          sourceType: "NEC",
          citation: "TEST 1.0",
          text: "verbatim source text",
        },
      ],
    });
    expect(kg.learningGoals.size).toBe(1);
    expect(kg.factsTaughtBy("lg.test").map((f) => f.id)).toEqual(["fact.a"]);
    expect(kg.misconceptionsAddressedBy("lg.test").map((m) => m.id)).toEqual(["misc.x"]);
    expect(kg.excerptsCitedBy("fact.a").map((s) => s.id)).toEqual(["src.s1"]);
  });

  it("rejects an unknown reference (orphan fact id)", () => {
    expect(() =>
      loadKG({
        learningGoals: [
          {
            type: "LearningGoal",
            id: "lg.test",
            question: "Why?",
            summary: "Because.",
            prerequisites: [],
            teaches: ["fact.missing"],
            addresses: [],
          },
        ],
        atomicFacts: [],
        misconceptions: [],
        sources: [],
      }),
    ).toThrow(/fact.missing/);
  });

  it("rejects a node with a bad schema (missing required field)", () => {
    expect(() =>
      loadKG({
        learningGoals: [],
        atomicFacts: [
          // @ts-expect-error intentionally missing `statement`
          {
            type: "AtomicFact",
            id: "fact.bad",
            scope: "test",
            confidence: "high",
            cites: [],
          },
        ],
        misconceptions: [],
        sources: [],
      }),
    ).toThrow(/statement/);
  });

  it("resolveContext returns the full subgraph for a learning goal", () => {
    const kg = loadKG({
      learningGoals: [
        {
          type: "LearningGoal",
          id: "lg.test",
          question: "Why?",
          summary: "Because.",
          prerequisites: [],
          teaches: ["fact.a"],
          addresses: ["misc.x"],
        },
      ],
      atomicFacts: [
        {
          type: "AtomicFact",
          id: "fact.a",
          statement: "A is true.",
          scope: "test",
          confidence: "high",
          cites: ["src.s1"],
        },
      ],
      misconceptions: [
        {
          type: "Misconception",
          id: "misc.x",
          name: "X",
          statement: "X is wrong.",
          correction: "Actually Y.",
          correctedBy: ["fact.a"],
        },
      ],
      sources: [
        {
          type: "SourceExcerpt",
          id: "src.s1",
          sourceType: "NEC",
          citation: "TEST 1.0",
          text: "verbatim",
        },
      ],
    });
    const ctx = kg.resolveContext("lg.test");
    expect(ctx.learningGoal.id).toBe("lg.test");
    expect(ctx.taughtFacts.map((f) => f.id)).toEqual(["fact.a"]);
    expect(ctx.addressedMisconceptions.map((m) => m.id)).toEqual(["misc.x"]);
    expect(ctx.sourceExcerpts.map((s) => s.id)).toEqual(["src.s1"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:experimental -- tests/kg.test.ts`
Expected: FAIL — `Cannot find module '@/experimental/eval-engine/kg'` (or similar).

- [ ] **Step 3: Implement `kg/schemas.ts`**

Create `experimental/eval-engine/kg/schemas.ts`:

```ts
import { z } from "zod";

export const LearningGoalSchema = z.object({
  type: z.literal("LearningGoal"),
  id: z.string().regex(/^lg\./, "LearningGoal id must start with 'lg.'"),
  question: z.string().min(1),
  summary: z.string().min(1),
  prerequisites: z.array(z.string().regex(/^lg\./)).default([]),
  teaches: z.array(z.string().regex(/^fact\./)).default([]),
  addresses: z.array(z.string().regex(/^misc\./)).default([]),
});

export const AtomicFactSchema = z.object({
  type: z.literal("AtomicFact"),
  id: z.string().regex(/^fact\./),
  statement: z.string().min(1),
  scope: z.string().min(1),
  confidence: z.enum(["high", "medium", "low"]),
  cites: z.array(z.string().regex(/^src\./)).default([]),
});

export const MisconceptionSchema = z.object({
  type: z.literal("Misconception"),
  id: z.string().regex(/^misc\./),
  name: z.string().min(1),
  statement: z.string().min(1),
  correction: z.string().min(1),
  correctedBy: z.array(z.string().regex(/^fact\./)).default([]),
});

export const SourceExcerptSchema = z.object({
  type: z.literal("SourceExcerpt"),
  id: z.string().regex(/^src\./),
  sourceType: z.enum(["NEC", "MikeHolt", "IAEI"]),
  citation: z.string().min(1),
  text: z.string().min(1),
  url: z.string().url().nullable().optional(),
});

export type LearningGoal = z.infer<typeof LearningGoalSchema>;
export type AtomicFact = z.infer<typeof AtomicFactSchema>;
export type Misconception = z.infer<typeof MisconceptionSchema>;
export type SourceExcerpt = z.infer<typeof SourceExcerptSchema>;

export type LearningGoalId = string;
export type AtomicFactId = string;
export type MisconceptionId = string;
export type SourceExcerptId = string;
```

- [ ] **Step 4: Implement `kg/loader.ts`**

Create `experimental/eval-engine/kg/loader.ts`:

```ts
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
```

- [ ] **Step 5: Implement `kg/traversal.ts`**

Create `experimental/eval-engine/kg/traversal.ts`:

```ts
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
    getLearningGoal(id).teaches.map((fid) => atomicFacts.get(fid)!);

  const misconceptionsAddressedBy = (id: LearningGoalId): Misconception[] =>
    getLearningGoal(id).addresses.map((mid) => misconceptions.get(mid)!);

  const excerptsCitedBy = (factId: AtomicFactId): SourceExcerpt[] => {
    const fact = atomicFacts.get(factId);
    if (!fact) throw new Error(`Unknown fact '${factId}'`);
    return fact.cites.map((sid) => sources.get(sid)!);
  };

  const resolveContext = (id: LearningGoalId): KGContext => {
    const learningGoal = getLearningGoal(id);
    const taughtFacts = factsTaughtBy(id);
    const addressedMisconceptions = misconceptionsAddressedBy(id);
    const excerptIds = new Set<string>();
    for (const f of taughtFacts) for (const sid of f.cites) excerptIds.add(sid);
    const sourceExcerpts = [...excerptIds].map((sid) => sources.get(sid)!);
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
```

- [ ] **Step 6: Implement `kg/index.ts`**

Create `experimental/eval-engine/kg/index.ts`:

```ts
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
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm run test:experimental -- tests/kg.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 8: Commit**

```bash
git add experimental/eval-engine/kg/ experimental/eval-engine/tests/kg.test.ts
git commit -m "Add KG schemas, loader, and traversal helpers"
```

---

## Task 3: Seed the KG with N-G bonding data

**Files:**
- Create: `experimental/eval-engine/kg/learning-goals/ng-bonding-one-point.json`
- Create: `experimental/eval-engine/kg/atomic-facts/{nec-250-24a-single-bond,nec-250-142-subpanel-isolation,parallel-return-mechanism,fault-clearing-impairment,objectionable-current-on-egc}.json` (5 files)
- Create: `experimental/eval-engine/kg/misconceptions/{subpanels-need-own-bond,ground-and-neutral-are-the-same,more-bonds-is-safer}.json` (3 files)
- Create: `experimental/eval-engine/kg/sources/{nec-2023-250-24a,nec-2023-250-142}.json` (2 files)
- Modify: `experimental/eval-engine/tests/kg.test.ts` (add a disk-load test)

- [ ] **Step 1: Add a failing test for disk loading**

Append to `experimental/eval-engine/tests/kg.test.ts`:

```ts
import path from "node:path";
import { loadKGFromDisk } from "@/experimental/eval-engine/kg";

describe("KG seeded data on disk", () => {
  it("loads the seeded N-G bonding learning goal and resolves its full context", () => {
    const kgDir = path.resolve(__dirname, "../kg");
    const kg = loadKGFromDisk(kgDir);
    const ctx = kg.resolveContext("lg.ng-bonding-one-point");
    expect(ctx.learningGoal.summary).toMatch(/single.*bond.*service disconnect/i);
    expect(ctx.taughtFacts.length).toBeGreaterThanOrEqual(5);
    expect(ctx.addressedMisconceptions.map((m) => m.id)).toContain("misc.subpanels-need-own-bond");
    expect(ctx.sourceExcerpts.some((s) => s.citation.includes("250.24"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:experimental -- tests/kg.test.ts`
Expected: FAIL — `Unknown learning goal 'lg.ng-bonding-one-point'`.

- [ ] **Step 3: Write the source excerpts**

Create `experimental/eval-engine/kg/sources/nec-2023-250-24a.json`:

```json
{
  "type": "SourceExcerpt",
  "id": "src.nec-2023-250-24a",
  "sourceType": "NEC",
  "citation": "NEC 2023 Article 250.24(A)",
  "text": "A premises wiring system supplied by a grounded ac service shall have a grounding electrode conductor connection to the grounded service conductor at each service in accordance with 250.24(A)(1) through (A)(5). The connection shall be made at any accessible point from the load end of the overhead service conductors, service drop, underground service conductors, or service lateral to and including the terminal or bus to which the grounded service conductor is connected at the service disconnecting means.",
  "url": null
}
```

Create `experimental/eval-engine/kg/sources/nec-2023-250-142.json`:

```json
{
  "type": "SourceExcerpt",
  "id": "src.nec-2023-250-142",
  "sourceType": "NEC",
  "citation": "NEC 2023 Article 250.142",
  "text": "A grounded circuit conductor shall not be used for grounding non-current-carrying metal parts of equipment on the load side of the service disconnecting means or on the load side of a separately derived system disconnecting means or the source of a separately derived system that has no disconnecting means. In other words, the neutral and equipment grounding conductor shall be kept electrically isolated downstream of the service disconnect; subpanels must not bond N to the panel enclosure.",
  "url": null
}
```

- [ ] **Step 4: Write the atomic facts**

Create `experimental/eval-engine/kg/atomic-facts/nec-250-24a-single-bond.json`:

```json
{
  "type": "AtomicFact",
  "id": "fact.nec-250-24a-single-bond",
  "statement": "In a US residential service, NEC 250.24(A) requires the neutral-to-equipment-grounding-conductor bond to occur at exactly one point: the service disconnect (typically the main panel).",
  "scope": "nec-bonding",
  "confidence": "high",
  "cites": ["src.nec-2023-250-24a"]
}
```

Create `experimental/eval-engine/kg/atomic-facts/nec-250-142-subpanel-isolation.json`:

```json
{
  "type": "AtomicFact",
  "id": "fact.nec-250-142-subpanel-isolation",
  "statement": "Downstream of the service disconnect (e.g. in subpanels), the neutral bus and the equipment grounding conductor bus must be kept electrically isolated. The bonding screw that ties the neutral bus to the panel enclosure is removed in subpanels.",
  "scope": "nec-bonding",
  "confidence": "high",
  "cites": ["src.nec-2023-250-142"]
}
```

Create `experimental/eval-engine/kg/atomic-facts/parallel-return-mechanism.json`:

```json
{
  "type": "AtomicFact",
  "id": "fact.parallel-return-mechanism",
  "statement": "If a second neutral-to-ground bond exists downstream of the service disconnect, the neutral and the equipment grounding conductor (EGC) form a parallel pair between the two bond points. By Kirchhoff's current law and Ohm's law, normal load return current splits between the neutral and the EGC in proportion to their admittances, putting continuous load current on the EGC, raceways, bonded enclosures, and bonded metal piping that were never sized or insulated to carry it.",
  "scope": "nec-bonding",
  "confidence": "high",
  "cites": ["src.nec-2023-250-142"]
}
```

Create `experimental/eval-engine/kg/atomic-facts/fault-clearing-impairment.json`:

```json
{
  "type": "AtomicFact",
  "id": "fact.fault-clearing-impairment",
  "statement": "During a ground fault the intended return path is hot → EGC → main bond → neutral → source, fast and high-current to trip the breaker. With multiple neutral-to-ground bonds, fault current divides across multiple parallel paths. Some paths may have too much impedance to trip the breaker promptly, making fault clearing unpredictable.",
  "scope": "nec-bonding",
  "confidence": "high",
  "cites": ["src.nec-2023-250-24a"]
}
```

Create `experimental/eval-engine/kg/atomic-facts/objectionable-current-on-egc.json`:

```json
{
  "type": "AtomicFact",
  "id": "fact.objectionable-current-on-egc",
  "statement": "Continuous load current flowing on the EGC, metal raceways, bonded enclosures, and water pipes (a consequence of a second N-G bond) is called objectionable current. NEC 250.6 prohibits arrangements that cause objectionable current on grounding conductors.",
  "scope": "nec-bonding",
  "confidence": "high",
  "cites": ["src.nec-2023-250-142"]
}
```

- [ ] **Step 5: Write the misconceptions**

Create `experimental/eval-engine/kg/misconceptions/subpanels-need-own-bond.json`:

```json
{
  "type": "Misconception",
  "id": "misc.subpanels-need-own-bond",
  "name": "Subpanels need their own N-G bond",
  "statement": "A subpanel needs the neutral bonded to ground, just like the main panel, to be safe.",
  "correction": "Subpanels keep the neutral bus and the equipment grounding bus electrically isolated. Only the service disconnect bonds N to G. A second bond at the subpanel creates a parallel return path through the EGC, which violates 250.142 and 250.6.",
  "correctedBy": ["fact.nec-250-142-subpanel-isolation", "fact.parallel-return-mechanism"]
}
```

Create `experimental/eval-engine/kg/misconceptions/ground-and-neutral-are-the-same.json`:

```json
{
  "type": "Misconception",
  "id": "misc.ground-and-neutral-are-the-same",
  "name": "Neutral and ground are the same conductor",
  "statement": "Since neutral and ground are bonded at the panel, they're effectively the same wire and can be swapped.",
  "correction": "They are bonded at exactly one point (the service disconnect) but carry fundamentally different currents: the neutral carries normal load return current, while the EGC carries fault current only and briefly. They are kept electrically separate everywhere downstream.",
  "correctedBy": ["fact.nec-250-24a-single-bond", "fact.nec-250-142-subpanel-isolation"]
}
```

Create `experimental/eval-engine/kg/misconceptions/more-bonds-is-safer.json`:

```json
{
  "type": "Misconception",
  "id": "misc.more-bonds-is-safer",
  "name": "More bonds is safer",
  "statement": "Adding extra neutral-to-ground bonds throughout the system provides redundancy and improves safety.",
  "correction": "Extra bonds create parallel return paths that put continuous load current on the EGC and bonded metal, degrade GFCI behavior, and make fault clearing unpredictable. Code requires exactly one bond point, at the service disconnect.",
  "correctedBy": ["fact.parallel-return-mechanism", "fact.fault-clearing-impairment", "fact.objectionable-current-on-egc"]
}
```

- [ ] **Step 6: Write the learning goal**

Create `experimental/eval-engine/kg/learning-goals/ng-bonding-one-point.json`:

```json
{
  "type": "LearningGoal",
  "id": "lg.ng-bonding-one-point",
  "question": "Why a US residential electrical system can have neutral and ground bonded at exactly one point, and what physically goes wrong if there is more than one.",
  "summary": "A US residential service has a single neutral-to-ground bond at the service disconnect; downstream of that point neutral and the EGC must stay electrically isolated. A second bond creates a parallel return path through the EGC, raceways, and bonded metal, putting continuous load current where it doesn't belong, degrading GFCI behavior, and making fault clearing unpredictable.",
  "prerequisites": [],
  "teaches": [
    "fact.nec-250-24a-single-bond",
    "fact.nec-250-142-subpanel-isolation",
    "fact.parallel-return-mechanism",
    "fact.fault-clearing-impairment",
    "fact.objectionable-current-on-egc"
  ],
  "addresses": [
    "misc.subpanels-need-own-bond",
    "misc.ground-and-neutral-are-the-same",
    "misc.more-bonds-is-safer"
  ]
}
```

- [ ] **Step 7: Run the disk-load test**

Run: `npm run test:experimental -- tests/kg.test.ts`
Expected: PASS — all 5 tests green (4 from Task 2 + 1 disk-load test).

- [ ] **Step 8: Commit**

```bash
git add experimental/eval-engine/kg/learning-goals/ experimental/eval-engine/kg/atomic-facts/ experimental/eval-engine/kg/misconceptions/ experimental/eval-engine/kg/sources/ experimental/eval-engine/tests/kg.test.ts
git commit -m "Seed KG with N-G bonding learning goal, facts, misconceptions, and sources"
```

---

## Task 4: Judge layer (OpenAI wrapper + majority vote)

**Files:**
- Create: `experimental/eval-engine/judge/openaiJudge.ts`
- Create: `experimental/eval-engine/judge/majorityVote.ts`
- Create: `experimental/eval-engine/tests/judge.test.ts`

- [ ] **Step 1: Write the failing test**

Create `experimental/eval-engine/tests/judge.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { callJudge, type OpenAIClientLike } from "@/experimental/eval-engine/judge/openaiJudge";
import { majorityVote } from "@/experimental/eval-engine/judge/majorityVote";

const Schema = z.object({ verdict: z.enum(["yes", "no"]), reason: z.string() });

function makeMockClient(parsed: unknown): OpenAIClientLike {
  return {
    chat: {
      completions: {
        parse: vi.fn(async () => ({
          choices: [{ message: { parsed, refusal: null }, finish_reason: "stop" }],
        })),
      },
    },
  };
}

describe("callJudge", () => {
  it("returns parsed structured output on success", async () => {
    const client = makeMockClient({ verdict: "yes", reason: "because" });
    const { parsed } = await callJudge(
      { systemMessage: "sys", userMessage: "u", responseSchema: Schema, schemaName: "v" },
      { model: "gpt-4o", client },
    );
    expect(parsed).toEqual({ verdict: "yes", reason: "because" });
  });

  it("throws a clear error when the model refuses", async () => {
    const client: OpenAIClientLike = {
      chat: {
        completions: {
          parse: vi.fn(async () => ({
            choices: [{ message: { parsed: null, refusal: "I cannot." }, finish_reason: "stop" }],
          })),
        },
      },
    };
    await expect(
      callJudge(
        { systemMessage: "s", userMessage: "u", responseSchema: Schema, schemaName: "v" },
        { model: "gpt-4o", client },
      ),
    ).rejects.toThrow(/refus/i);
  });

  it("retries once on parse failure and succeeds the second time", async () => {
    let n = 0;
    const client: OpenAIClientLike = {
      chat: {
        completions: {
          parse: vi.fn(async () => {
            n++;
            if (n === 1) throw new Error("zod parse failed");
            return { choices: [{ message: { parsed: { verdict: "no", reason: "x" }, refusal: null }, finish_reason: "stop" }] };
          }),
        },
      },
    };
    const { parsed } = await callJudge(
      { systemMessage: "s", userMessage: "u", responseSchema: Schema, schemaName: "v" },
      { model: "gpt-4o", client },
    );
    expect(parsed).toEqual({ verdict: "no", reason: "x" });
    expect(n).toBe(2);
  });
});

describe("majorityVote", () => {
  it("returns the most common result across N runs (keyed)", async () => {
    const results = ["a", "b", "a"];
    let i = 0;
    const result = await majorityVote(async () => results[i++], { n: 3, keyOf: (r) => r });
    expect(result).toBe("a");
  });

  it("breaks ties by returning the first occurrence", async () => {
    const results = ["a", "b"];
    let i = 0;
    const result = await majorityVote(async () => results[i++], { n: 2, keyOf: (r) => r });
    expect(result).toBe("a");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:experimental -- tests/judge.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `judge/openaiJudge.ts`**

Create `experimental/eval-engine/judge/openaiJudge.ts`:

```ts
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ZodSchema } from "zod";

export interface OpenAIClientLike {
  chat: {
    completions: {
      parse: (req: unknown) => Promise<{
        choices: Array<{
          message: { parsed: unknown; refusal: string | null };
          finish_reason: string;
        }>;
      }>;
    };
  };
}

export interface CallJudgeRequest<T> {
  systemMessage: string;
  userMessage: string;
  responseSchema: ZodSchema<T>;
  schemaName: string;
}

export interface CallJudgeOptions {
  model: string;
  client?: OpenAIClientLike;
}

let defaultClient: OpenAIClientLike | null = null;
function getDefaultClient(): OpenAIClientLike {
  if (!defaultClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env.local or your shell before running the eval engine.",
      );
    }
    defaultClient = new OpenAI({ apiKey }) as unknown as OpenAIClientLike;
  }
  return defaultClient;
}

export async function callJudge<T>(
  req: CallJudgeRequest<T>,
  opts: CallJudgeOptions,
): Promise<{ parsed: T; raw: unknown }> {
  const client = opts.client ?? getDefaultClient();
  const responseFormat = zodResponseFormat(req.responseSchema, req.schemaName);

  const doCall = async () =>
    client.chat.completions.parse({
      model: opts.model,
      messages: [
        { role: "system", content: req.systemMessage },
        { role: "user", content: req.userMessage },
      ],
      response_format: responseFormat,
    });

  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  let response;
  try {
    response = await doCall();
  } catch (firstErr) {
    await wait(500);
    try {
      response = await doCall();
    } catch (secondErr) {
      throw new Error(
        `Judge call failed twice. First: ${(firstErr as Error).message}. Second: ${(secondErr as Error).message}`,
      );
    }
  }

  const choice = response.choices[0];
  if (choice.message.refusal) {
    throw new Error(`Judge model refused: ${choice.message.refusal}`);
  }
  if (choice.message.parsed == null) {
    throw new Error("Judge returned no parsed output and no refusal");
  }
  return { parsed: choice.message.parsed as T, raw: response };
}
```

- [ ] **Step 4: Implement `judge/majorityVote.ts`**

Create `experimental/eval-engine/judge/majorityVote.ts`:

```ts
export interface MajorityVoteOptions<T> {
  n: number;
  keyOf: (result: T) => string;
}

export async function majorityVote<T>(
  call: () => Promise<T>,
  opts: MajorityVoteOptions<T>,
): Promise<T> {
  if (opts.n < 1) throw new Error("majorityVote: n must be >= 1");
  const results: T[] = [];
  for (let i = 0; i < opts.n; i++) results.push(await call());

  const counts = new Map<string, number>();
  const firstByKey = new Map<string, T>();
  for (const r of results) {
    const k = opts.keyOf(r);
    counts.set(k, (counts.get(k) ?? 0) + 1);
    if (!firstByKey.has(k)) firstByKey.set(k, r);
  }

  let bestKey = "";
  let bestCount = -1;
  for (const [k, c] of counts) {
    if (c > bestCount) {
      bestCount = c;
      bestKey = k;
    }
  }
  return firstByKey.get(bestKey)!;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:experimental -- tests/judge.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 6: Commit**

```bash
git add experimental/eval-engine/judge/ experimental/eval-engine/tests/judge.test.ts
git commit -m "Add OpenAI judge wrapper and majority-vote utility"
```

---

## Task 5: Shared evaluator types and slot enumeration

**Files:**
- Create: `experimental/eval-engine/evaluators/types.ts`
- Create: `experimental/eval-engine/evaluators/slots.ts`
- Create: `experimental/eval-engine/tests/slots.test.ts`

- [ ] **Step 1: Write the failing test for slot enumeration**

Create `experimental/eval-engine/tests/slots.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { enumerateSlots, studentFacingSlots } from "@/experimental/eval-engine/evaluators/slots";
import type { Curriculum } from "@/lib/curriculum.types";

const sample: Curriculum = {
  reading1: { id: "r1", title: "T", body: "B" },
  mcq1: {
    id: "m1",
    prompt: "P",
    options: [
      { id: "a", text: "right answer", isCorrect: true },
      {
        id: "b",
        text: "wrong answer",
        isCorrect: false,
        remediation: "remed",
        misconceptionTag: "misc.x",
      },
    ],
  },
  simulationCaptions: {
    oneBond: "cap1",
    twoBond: { mechanism: "m", consequence: "c", hazard: "h" },
  },
  mcq2: { id: "m2", prompt: "P2", options: [{ id: "a", text: "t", isCorrect: true }] },
  voiceTutor: { groundingFacts: ["g1", "g2"], openingPrompt: "open" },
};

describe("enumerateSlots", () => {
  it("yields every text slot with its semantic role", () => {
    const slots = enumerateSlots(sample);
    const kinds = slots.map((s) => s.slot.kind);
    expect(kinds).toContain("reading");
    expect(kinds).toContain("mcq");
    expect(kinds).toContain("mcqOption");
    expect(kinds).toContain("simulationCaption");
    expect(kinds).toContain("tutorGroundingFact");
    const wrongOption = slots.find(
      (s) => s.slot.kind === "mcqOption" && s.slot.field === "text" && s.slot.isCorrect === false,
    );
    expect(wrongOption?.excerpt).toBe("wrong answer");
    const remed = slots.find((s) => s.slot.kind === "mcqOption" && s.slot.field === "remediation");
    expect(remed?.excerpt).toBe("remed");
  });
});

describe("studentFacingSlots", () => {
  it("excludes wrong MCQ option text but includes their remediation", () => {
    const slots = studentFacingSlots(sample);
    const wrongText = slots.find(
      (s) => s.slot.kind === "mcqOption" && s.slot.field === "text" && s.slot.isCorrect === false,
    );
    expect(wrongText).toBeUndefined();
    const remed = slots.find((s) => s.slot.kind === "mcqOption" && s.slot.field === "remediation");
    expect(remed).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:experimental -- tests/slots.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `evaluators/types.ts`**

Create `experimental/eval-engine/evaluators/types.ts`:

```ts
import type { Curriculum } from "@/lib/curriculum.types";
import type { KGContext } from "@/experimental/eval-engine/kg";

export type RubricLevel = 1 | 2 | 3 | 4;

export interface RubricLevelDef {
  level: RubricLevel;
  label: string;
  description: string;
}

export interface EvaluatorRubric {
  dimension: string;
  levels: [RubricLevelDef, RubricLevelDef, RubricLevelDef, RubricLevelDef];
}

export type CurriculumSlotId =
  | { kind: "reading"; field: "body" }
  | { kind: "mcq"; mcqId: string; field: "prompt" }
  | {
      kind: "mcqOption";
      mcqId: string;
      optionId: string;
      isCorrect: boolean;
      field: "text" | "remediation";
    }
  | { kind: "tutorGroundingFact"; index: number }
  | { kind: "tutorOpeningPrompt" }
  | { kind: "simulationCaption"; key: "oneBond" | "twoBond.mechanism" | "twoBond.consequence" | "twoBond.hazard" };

export interface SlotInstance {
  slot: CurriculumSlotId;
  excerpt: string;
}

export interface PerItemVerdict<TLabel extends string> {
  target: SlotInstance | { criterion: string };
  verdict: TLabel;
  reasoning: string;
  citedKGNodeIds: string[];
  confidence: "high" | "medium" | "low";
}

export interface EvaluatorResult<TLabel extends string> {
  evaluatorId: string;
  dimension: string;
  rating: RubricLevel;
  reasoning: string;
  perItem: PerItemVerdict<TLabel>[];
  unsureItems: PerItemVerdict<TLabel>[];
  runMetadata: { model: string; runs: number; timestampISO: string };
}

export interface EvaluatorOptions {
  runs?: number;
  model?: string;
}

export interface Evaluator<TLabel extends string> {
  id: string;
  dimension: string;
  rubric: EvaluatorRubric;
  evaluate(
    curriculum: Curriculum,
    ctx: KGContext,
    opts?: EvaluatorOptions,
  ): Promise<EvaluatorResult<TLabel>>;
}
```

- [ ] **Step 4: Implement `evaluators/slots.ts`**

Create `experimental/eval-engine/evaluators/slots.ts`:

```ts
import type { Curriculum } from "@/lib/curriculum.types";
import type { SlotInstance } from "./types";

export function enumerateSlots(c: Curriculum): SlotInstance[] {
  const out: SlotInstance[] = [];
  out.push({ slot: { kind: "reading", field: "body" }, excerpt: c.reading1.body });
  for (const mcq of [c.mcq1, c.mcq2]) {
    out.push({ slot: { kind: "mcq", mcqId: mcq.id, field: "prompt" }, excerpt: mcq.prompt });
    for (const opt of mcq.options) {
      out.push({
        slot: {
          kind: "mcqOption",
          mcqId: mcq.id,
          optionId: opt.id,
          isCorrect: opt.isCorrect,
          field: "text",
        },
        excerpt: opt.text,
      });
      if (opt.remediation) {
        out.push({
          slot: {
            kind: "mcqOption",
            mcqId: mcq.id,
            optionId: opt.id,
            isCorrect: opt.isCorrect,
            field: "remediation",
          },
          excerpt: opt.remediation,
        });
      }
    }
  }
  out.push({ slot: { kind: "simulationCaption", key: "oneBond" }, excerpt: c.simulationCaptions.oneBond });
  out.push({
    slot: { kind: "simulationCaption", key: "twoBond.mechanism" },
    excerpt: c.simulationCaptions.twoBond.mechanism,
  });
  out.push({
    slot: { kind: "simulationCaption", key: "twoBond.consequence" },
    excerpt: c.simulationCaptions.twoBond.consequence,
  });
  out.push({
    slot: { kind: "simulationCaption", key: "twoBond.hazard" },
    excerpt: c.simulationCaptions.twoBond.hazard,
  });
  c.voiceTutor.groundingFacts.forEach((g, index) =>
    out.push({ slot: { kind: "tutorGroundingFact", index }, excerpt: g }),
  );
  out.push({ slot: { kind: "tutorOpeningPrompt" }, excerpt: c.voiceTutor.openingPrompt });
  return out;
}

/**
 * Student-facing slots only: omits *wrong* MCQ option text (those bait misconceptions and are
 * not "teaching"). Remediations are included because students see them when they answer wrong.
 */
export function studentFacingSlots(c: Curriculum): SlotInstance[] {
  return enumerateSlots(c).filter((s) => {
    if (s.slot.kind === "mcqOption" && s.slot.field === "text" && s.slot.isCorrect === false) {
      return false;
    }
    return true;
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:experimental -- tests/slots.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 6: Commit**

```bash
git add experimental/eval-engine/evaluators/types.ts \
        experimental/eval-engine/evaluators/slots.ts \
        experimental/eval-engine/tests/slots.test.ts
git commit -m "Add evaluator shared types and slot enumeration"
```

---

## Task 6: Factual Accuracy evaluator

**Files:**
- Create: `experimental/eval-engine/evaluators/factualAccuracy.ts`
- Create: `experimental/eval-engine/tests/factualAccuracy.test.ts`

- [ ] **Step 1: Write the failing aggregation tests**

Create `experimental/eval-engine/tests/factualAccuracy.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import {
  factualAccuracyEvaluator,
  factualAccuracyResponseSchema,
} from "@/experimental/eval-engine/evaluators/factualAccuracy";
import { loadKG } from "@/experimental/eval-engine/kg";
import type { Curriculum } from "@/lib/curriculum.types";

type JudgeShape = z.infer<typeof factualAccuracyResponseSchema>;

const minimalCurriculum: Curriculum = {
  reading1: { id: "r1", title: "T", body: "Subpanels keep N and EGC isolated." },
  mcq1: {
    id: "m1",
    prompt: "Q?",
    options: [
      { id: "a", text: "Correct.", isCorrect: true },
      {
        id: "b",
        text: "Subpanels need their own bond.",
        isCorrect: false,
        remediation: "No.",
        misconceptionTag: "misc.subpanels-need-own-bond",
      },
    ],
  },
  simulationCaptions: { oneBond: "o", twoBond: { mechanism: "m", consequence: "c", hazard: "h" } },
  mcq2: { id: "m2", prompt: "Q2?", options: [{ id: "a", text: "ok", isCorrect: true }] },
  voiceTutor: { groundingFacts: ["fact1"], openingPrompt: "open" },
};

const kg = loadKG({
  learningGoals: [
    {
      type: "LearningGoal",
      id: "lg.test",
      question: "Q?",
      summary: "S",
      prerequisites: [],
      teaches: ["fact.a"],
      addresses: ["misc.subpanels-need-own-bond"],
    },
  ],
  atomicFacts: [
    {
      type: "AtomicFact",
      id: "fact.a",
      statement: "A is true.",
      scope: "test",
      confidence: "high",
      cites: [],
    },
  ],
  misconceptions: [
    {
      type: "Misconception",
      id: "misc.subpanels-need-own-bond",
      name: "Subpanels need their own bond",
      statement: "wrong",
      correction: "right",
      correctedBy: ["fact.a"],
    },
  ],
  sources: [],
});
const ctx = kg.resolveContext("lg.test");

function mockJudgeWith(response: JudgeShape) {
  return vi.fn(async () => ({ parsed: response, raw: {} }));
}

describe("factualAccuracyEvaluator aggregation", () => {
  it("rates 4 / Accurate when all claims supported and no unexpected contradictions", async () => {
    const judge = mockJudgeWith({
      items: [
        {
          slot_kind: "reading",
          slot_detail: "body",
          claim_text: "Subpanels keep N and EGC isolated.",
          verdict: "supported",
          reasoning: "matches fact.a",
          cited_kg_ids: ["fact.a"],
          confidence: "high",
        },
      ],
    });
    const result = await factualAccuracyEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(4);
    expect(result.unsureItems).toHaveLength(0);
  });

  it("rates 2 / Concerns on one contradicted-unexpected", async () => {
    const judge = mockJudgeWith({
      items: [
        {
          slot_kind: "reading",
          slot_detail: "body",
          claim_text: "wrong",
          verdict: "contradicted-unexpected",
          reasoning: "x",
          cited_kg_ids: ["fact.a"],
          confidence: "high",
        },
        {
          slot_kind: "reading",
          slot_detail: "body",
          claim_text: "ok",
          verdict: "supported",
          reasoning: "y",
          cited_kg_ids: ["fact.a"],
          confidence: "high",
        },
      ],
    });
    const result = await factualAccuracyEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(2);
  });

  it("rates 1 / Failing on >=2 contradicted-unexpected", async () => {
    const judge = mockJudgeWith({
      items: [
        { slot_kind: "reading", slot_detail: "body", claim_text: "x", verdict: "contradicted-unexpected", reasoning: "x", cited_kg_ids: [], confidence: "high" },
        { slot_kind: "reading", slot_detail: "body", claim_text: "y", verdict: "contradicted-unexpected", reasoning: "y", cited_kg_ids: [], confidence: "high" },
      ],
    });
    const result = await factualAccuracyEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(1);
  });

  it("treats contradicted-expected on wrong MCQ options as non-failing", async () => {
    const judge = mockJudgeWith({
      items: [
        {
          slot_kind: "mcqOption",
          slot_detail: "m1.b.text",
          claim_text: "Subpanels need their own bond.",
          verdict: "contradicted-expected",
          reasoning: "matches misc.subpanels-need-own-bond",
          cited_kg_ids: ["misc.subpanels-need-own-bond"],
          confidence: "high",
        },
        {
          slot_kind: "reading",
          slot_detail: "body",
          claim_text: "ok",
          verdict: "supported",
          reasoning: "y",
          cited_kg_ids: [],
          confidence: "high",
        },
      ],
    });
    const result = await factualAccuracyEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(4);
  });

  it("surfaces unsupported claims into unsureItems but does not auto-fail", async () => {
    const judge = mockJudgeWith({
      items: [
        { slot_kind: "reading", slot_detail: "body", claim_text: "novel claim", verdict: "unsupported", reasoning: "not in KG", cited_kg_ids: [], confidence: "low" },
        { slot_kind: "reading", slot_detail: "body", claim_text: "ok", verdict: "supported", reasoning: "y", cited_kg_ids: ["fact.a"], confidence: "high" },
      ],
    });
    const result = await factualAccuracyEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.unsureItems).toHaveLength(1);
    expect(result.unsureItems[0].verdict).toBe("unsupported");
    expect(result.rating).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:experimental -- tests/factualAccuracy.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `evaluators/factualAccuracy.ts`**

Create `experimental/eval-engine/evaluators/factualAccuracy.ts`:

```ts
import { z } from "zod";
import type { Curriculum } from "@/lib/curriculum.types";
import { callJudge, type CallJudgeRequest, type CallJudgeOptions } from "@/experimental/eval-engine/judge/openaiJudge";
import type { KGContext } from "@/experimental/eval-engine/kg";
import type { Evaluator, EvaluatorOptions, EvaluatorResult, PerItemVerdict } from "./types";
import { enumerateSlots } from "./slots";

export const factualAccuracyResponseSchema = z.object({
  items: z.array(
    z.object({
      slot_kind: z.string(),
      slot_detail: z.string(),
      claim_text: z.string(),
      verdict: z.enum([
        "supported",
        "contradicted-expected",
        "contradicted-unexpected",
        "unsupported",
      ]),
      reasoning: z.string(),
      cited_kg_ids: z.array(z.string()),
      confidence: z.enum(["high", "medium", "low"]),
    }),
  ),
});

type FactualVerdict = z.infer<typeof factualAccuracyResponseSchema>["items"][number]["verdict"];

interface InternalOptions extends EvaluatorOptions {
  // Test seam: allows injecting a mocked judge. Not part of the public Evaluator interface.
  __judge?: (
    req: CallJudgeRequest<z.infer<typeof factualAccuracyResponseSchema>>,
    opts: CallJudgeOptions,
  ) => Promise<{ parsed: z.infer<typeof factualAccuracyResponseSchema>; raw: unknown }>;
}

const RUBRIC = {
  dimension: "Factual Accuracy",
  levels: [
    { level: 1 as const, label: "Failing", description: "Two or more unexpected contradictions of KG facts." },
    { level: 2 as const, label: "Concerns", description: "One unexpected contradiction OR fewer than 50% of claims supported." },
    { level: 3 as const, label: "Mostly accurate", description: "No unexpected contradictions; 50-80% of claims supported." },
    { level: 4 as const, label: "Accurate", description: "No unexpected contradictions; 80%+ supported; wrong-option contradictions match known misconceptions." },
  ],
};

function buildSystemMessage(ctx: KGContext): string {
  const facts = ctx.taughtFacts
    .map((f) => `- ${f.id}: ${f.statement} (cites: ${f.cites.join(", ") || "none"})`)
    .join("\n");
  const sources = ctx.sourceExcerpts
    .map((s) => `- ${s.id} (${s.citation}): ${s.text}`)
    .join("\n");
  const misconceptions = ctx.addressedMisconceptions
    .map((m) => `- ${m.id} "${m.name}": ${m.statement} (correction: ${m.correction})`)
    .join("\n");
  return [
    "You are evaluating factual claims in an electrical-engineering lesson about residential N-G bonding.",
    "",
    "Each excerpt is tagged with a slot role. Use the slot role to choose the right verdict:",
    "- For 'reading' bodies, 'mcqOption' fields where isCorrect=true, 'mcqOption' remediation fields, 'simulationCaption' captions, 'tutorGroundingFact' entries, and 'tutorOpeningPrompt': claims must be 'supported' by a KG AtomicFact; otherwise use 'unsupported' (no relevant KG fact) or 'contradicted-unexpected' (a KG fact contradicts the claim).",
    "- For 'mcqOption' fields where isCorrect=false: the option is *meant* to bait a misconception. If the claim contradicts a KG fact AND aligns with one of the addressed misconceptions, use 'contradicted-expected'. If it contradicts a KG fact without matching any listed misconception, use 'contradicted-unexpected'. If it does not contradict any KG fact, use 'supported' or 'unsupported' as appropriate.",
    "- 'mcq' prompts are questions, not factual claims; only judge them if they assert a fact.",
    "",
    "Knowledge Graph facts in scope:",
    facts || "(no facts in this learning goal)",
    "",
    "Cited source excerpts:",
    sources || "(none)",
    "",
    "Addressed misconceptions (for use with contradicted-expected on wrong MCQ options):",
    misconceptions || "(none)",
    "",
    "Extract every atomic factual claim from each excerpt. Use claim_text to record the exact claim you judged. Cite KG node ids (facts, sources, or misconceptions) you used in cited_kg_ids. Use a 'low' confidence label for unsupported claims that may be true but lie outside the KG's scope.",
  ].join("\n");
}

function buildUserMessage(slots: ReturnType<typeof enumerateSlots>): string {
  const blocks = slots.map((s) => {
    const detail = JSON.stringify(s.slot);
    return `--- slot_kind=${s.slot.kind} slot_detail=${detail} ---\n${s.excerpt}`;
  });
  return [
    "Evaluate each excerpt below. Return one items[] entry per claim you extract (multiple per excerpt is fine; zero is fine if the excerpt makes no factual assertion).",
    "",
    blocks.join("\n\n"),
  ].join("\n");
}

function aggregate(
  judged: z.infer<typeof factualAccuracyResponseSchema>,
  slots: ReturnType<typeof enumerateSlots>,
  model: string,
  runs: number,
): EvaluatorResult<FactualVerdict> {
  const slotByDetail = new Map(slots.map((s) => [JSON.stringify(s.slot), s]));
  const perItem: PerItemVerdict<FactualVerdict>[] = judged.items.map((it) => {
    const matched = slotByDetail.get(it.slot_detail);
    return {
      target: matched ?? { criterion: `${it.slot_kind}:${it.slot_detail}` },
      verdict: it.verdict,
      reasoning: it.reasoning,
      citedKGNodeIds: it.cited_kg_ids,
      confidence: it.confidence,
    };
  });

  const total = perItem.length;
  const supported = perItem.filter((p) => p.verdict === "supported").length;
  const unexpected = perItem.filter((p) => p.verdict === "contradicted-unexpected").length;
  const unsupported = perItem.filter((p) => p.verdict === "unsupported");

  let rating: 1 | 2 | 3 | 4;
  if (unexpected >= 2) rating = 1;
  else if (unexpected === 1) rating = 2;
  else {
    const supportedRatio = total === 0 ? 1 : supported / total;
    if (supportedRatio < 0.5) rating = 2;
    else if (supportedRatio < 0.8) rating = 3;
    else rating = 4;
  }

  const reasoning = [
    `${total} claim(s) extracted.`,
    `${supported} supported.`,
    `${unexpected} unexpected contradiction(s).`,
    `${unsupported.length} unsupported (need human review or KG extension).`,
  ].join(" ");

  return {
    evaluatorId: "factual-accuracy",
    dimension: RUBRIC.dimension,
    rating,
    reasoning,
    perItem,
    unsureItems: unsupported,
    runMetadata: { model, runs, timestampISO: new Date().toISOString() },
  };
}

export const factualAccuracyEvaluator: Evaluator<FactualVerdict> = {
  id: "factual-accuracy",
  dimension: RUBRIC.dimension,
  rubric: RUBRIC,
  async evaluate(curriculum: Curriculum, ctx: KGContext, opts?: EvaluatorOptions) {
    const internal = (opts ?? {}) as InternalOptions;
    const model = internal.model ?? "gpt-4o";
    const runs = internal.runs ?? 1;
    const slots = enumerateSlots(curriculum);
    const req: CallJudgeRequest<z.infer<typeof factualAccuracyResponseSchema>> = {
      systemMessage: buildSystemMessage(ctx),
      userMessage: buildUserMessage(slots),
      responseSchema: factualAccuracyResponseSchema,
      schemaName: "FactualAccuracyResponse",
    };
    const judge = internal.__judge ?? callJudge;
    const { parsed } = await judge(req, { model });
    return aggregate(parsed, slots, model, runs);
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:experimental -- tests/factualAccuracy.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add experimental/eval-engine/evaluators/factualAccuracy.ts \
        experimental/eval-engine/tests/factualAccuracy.test.ts
git commit -m "Add Factual Accuracy evaluator with slot-aware verdict aggregation"
```

---

## Task 7: Learning Goal Coverage evaluator

**Files:**
- Create: `experimental/eval-engine/evaluators/learningGoalCoverage.ts`
- Create: `experimental/eval-engine/tests/learningGoalCoverage.test.ts`

- [ ] **Step 1: Write the failing aggregation tests**

Create `experimental/eval-engine/tests/learningGoalCoverage.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import {
  learningGoalCoverageEvaluator,
  coverageResponseSchema,
  buildCoverageCriteria,
} from "@/experimental/eval-engine/evaluators/learningGoalCoverage";
import { loadKG } from "@/experimental/eval-engine/kg";
import type { Curriculum } from "@/lib/curriculum.types";

type CoverageShape = z.infer<typeof coverageResponseSchema>;

const minimalCurriculum: Curriculum = {
  reading1: { id: "r1", title: "T", body: "The summary." },
  mcq1: { id: "m1", prompt: "Q?", options: [{ id: "a", text: "ok", isCorrect: true }] },
  simulationCaptions: { oneBond: "o", twoBond: { mechanism: "m", consequence: "c", hazard: "h" } },
  mcq2: { id: "m2", prompt: "Q2?", options: [{ id: "a", text: "ok", isCorrect: true }] },
  voiceTutor: { groundingFacts: [], openingPrompt: "open" },
};

const kg = loadKG({
  learningGoals: [
    {
      type: "LearningGoal",
      id: "lg.test",
      question: "Q",
      summary: "the summary",
      prerequisites: [],
      teaches: ["fact.a", "fact.b"],
      addresses: ["misc.x", "misc.y"],
    },
  ],
  atomicFacts: [
    { type: "AtomicFact", id: "fact.a", statement: "A", scope: "test", confidence: "high", cites: [] },
    { type: "AtomicFact", id: "fact.b", statement: "B", scope: "test", confidence: "high", cites: [] },
  ],
  misconceptions: [
    { type: "Misconception", id: "misc.x", name: "X", statement: "x", correction: "c", correctedBy: [] },
    { type: "Misconception", id: "misc.y", name: "Y", statement: "y", correction: "c", correctedBy: [] },
  ],
  sources: [],
});
const ctx = kg.resolveContext("lg.test");

describe("buildCoverageCriteria", () => {
  it("yields 1 summary + 1-per-fact + 1-per-misconception", () => {
    const criteria = buildCoverageCriteria(ctx);
    const ids = criteria.map((c) => c.id);
    expect(ids).toContain("summary");
    expect(ids).toContain("teaches:fact.a");
    expect(ids).toContain("teaches:fact.b");
    expect(ids).toContain("addresses:misc.x");
    expect(ids).toContain("addresses:misc.y");
    expect(criteria).toHaveLength(5);
  });
});

function mockJudgeWith(response: CoverageShape) {
  return vi.fn(async () => ({ parsed: response, raw: {} }));
}

describe("learningGoalCoverageEvaluator aggregation", () => {
  it("rates 4 when all teaches met and 80%+ addresses met-or-partial", async () => {
    const judge = mockJudgeWith({
      criteria: [
        { criterion_id: "summary", verdict: "met", reasoning: "s", evidence_excerpts: ["x"] },
        { criterion_id: "teaches:fact.a", verdict: "met", reasoning: "a", evidence_excerpts: ["y"] },
        { criterion_id: "teaches:fact.b", verdict: "met", reasoning: "b", evidence_excerpts: ["z"] },
        { criterion_id: "addresses:misc.x", verdict: "met", reasoning: "x", evidence_excerpts: ["w"] },
        { criterion_id: "addresses:misc.y", verdict: "partial", reasoning: "y", evidence_excerpts: [] },
      ],
    });
    const result = await learningGoalCoverageEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(4);
  });

  it("rates 2 / Gaps when any non-summary teaches criterion is missing", async () => {
    const judge = mockJudgeWith({
      criteria: [
        { criterion_id: "summary", verdict: "met", reasoning: "s", evidence_excerpts: [] },
        { criterion_id: "teaches:fact.a", verdict: "met", reasoning: "a", evidence_excerpts: [] },
        { criterion_id: "teaches:fact.b", verdict: "missing", reasoning: "b not taught", evidence_excerpts: [] },
        { criterion_id: "addresses:misc.x", verdict: "met", reasoning: "x", evidence_excerpts: [] },
        { criterion_id: "addresses:misc.y", verdict: "met", reasoning: "y", evidence_excerpts: [] },
      ],
    });
    const result = await learningGoalCoverageEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(2);
  });

  it("rates 1 / Off-target when the summary criterion is missing", async () => {
    const judge = mockJudgeWith({
      criteria: [
        { criterion_id: "summary", verdict: "missing", reasoning: "no summary", evidence_excerpts: [] },
        { criterion_id: "teaches:fact.a", verdict: "met", reasoning: "a", evidence_excerpts: [] },
        { criterion_id: "teaches:fact.b", verdict: "met", reasoning: "b", evidence_excerpts: [] },
        { criterion_id: "addresses:misc.x", verdict: "met", reasoning: "x", evidence_excerpts: [] },
        { criterion_id: "addresses:misc.y", verdict: "met", reasoning: "y", evidence_excerpts: [] },
      ],
    });
    const result = await learningGoalCoverageEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(1);
  });

  it("rates 3 / Adequate when teaches are met-or-partial and 50%+ misconceptions covered", async () => {
    const judge = mockJudgeWith({
      criteria: [
        { criterion_id: "summary", verdict: "met", reasoning: "s", evidence_excerpts: [] },
        { criterion_id: "teaches:fact.a", verdict: "partial", reasoning: "a", evidence_excerpts: [] },
        { criterion_id: "teaches:fact.b", verdict: "met", reasoning: "b", evidence_excerpts: [] },
        { criterion_id: "addresses:misc.x", verdict: "met", reasoning: "x", evidence_excerpts: [] },
        { criterion_id: "addresses:misc.y", verdict: "missing", reasoning: "y", evidence_excerpts: [] },
      ],
    });
    const result = await learningGoalCoverageEvaluator.evaluate(minimalCurriculum, ctx, {
      model: "test",
      __judge: judge,
    } as any);
    expect(result.rating).toBe(3);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:experimental -- tests/learningGoalCoverage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `evaluators/learningGoalCoverage.ts`**

Create `experimental/eval-engine/evaluators/learningGoalCoverage.ts`:

```ts
import { z } from "zod";
import type { Curriculum } from "@/lib/curriculum.types";
import { callJudge, type CallJudgeRequest, type CallJudgeOptions } from "@/experimental/eval-engine/judge/openaiJudge";
import type { KGContext } from "@/experimental/eval-engine/kg";
import type { Evaluator, EvaluatorOptions, EvaluatorResult, PerItemVerdict } from "./types";
import { studentFacingSlots } from "./slots";

export const coverageResponseSchema = z.object({
  criteria: z.array(
    z.object({
      criterion_id: z.string(),
      verdict: z.enum(["met", "partial", "missing"]),
      reasoning: z.string(),
      evidence_excerpts: z.array(z.string()),
    }),
  ),
});

type CoverageVerdict = z.infer<typeof coverageResponseSchema>["criteria"][number]["verdict"];

interface InternalOptions extends EvaluatorOptions {
  __judge?: (
    req: CallJudgeRequest<z.infer<typeof coverageResponseSchema>>,
    opts: CallJudgeOptions,
  ) => Promise<{ parsed: z.infer<typeof coverageResponseSchema>; raw: unknown }>;
}

export interface CoverageCriterion {
  id: string;
  description: string;
  kind: "summary" | "teaches" | "addresses";
  targetId?: string;
}

export function buildCoverageCriteria(ctx: KGContext): CoverageCriterion[] {
  const out: CoverageCriterion[] = [
    {
      id: "summary",
      kind: "summary",
      description: `Lesson reading body communicates the learning goal's summary: "${ctx.learningGoal.summary}"`,
    },
  ];
  for (const fact of ctx.taughtFacts) {
    out.push({
      id: `teaches:${fact.id}`,
      kind: "teaches",
      targetId: fact.id,
      description: `Lesson teaches this fact in a student-facing slot (reading body, simulation captions, correct MCQ option, remediation, tutor grounding fact, or tutor opening): ${fact.statement}`,
    });
  }
  for (const m of ctx.addressedMisconceptions) {
    out.push({
      id: `addresses:${m.id}`,
      kind: "addresses",
      targetId: m.id,
      description: `Lesson explicitly surfaces the misconception "${m.name}" (e.g. as a wrong MCQ option text: "${m.statement}") AND addresses it (e.g. in the linked remediation: "${m.correction}"). 'met' requires BOTH halves; 'partial' if only one.`,
    });
  }
  return out;
}

const RUBRIC = {
  dimension: "Learning Goal Coverage",
  levels: [
    { level: 1 as const, label: "Off-target", description: "The lesson does not communicate the learning goal's summary." },
    { level: 2 as const, label: "Gaps", description: "At least one non-summary teaches criterion is missing." },
    { level: 3 as const, label: "Adequate", description: "All teaches criteria met-or-partial; at least 50% of addresses criteria covered." },
    { level: 4 as const, label: "Full coverage", description: "All teaches met; 80%+ of addresses met-or-partial." },
  ],
};

function buildSystemMessage(ctx: KGContext, criteria: CoverageCriterion[]): string {
  return [
    "You are evaluating whether a lesson teaches a specific learning goal and addresses its known misconceptions.",
    "",
    `Learning goal id: ${ctx.learningGoal.id}`,
    `Learning goal question: ${ctx.learningGoal.question}`,
    `Learning goal summary: ${ctx.learningGoal.summary}`,
    "",
    "Coverage criteria (judge each independently):",
    criteria.map((c) => `- ${c.id}: ${c.description}`).join("\n"),
    "",
    "Use these verdicts:",
    "- 'met': the criterion is clearly satisfied with direct evidence in the lesson",
    "- 'partial': partially satisfied or implied but not direct",
    "- 'missing': not present in the lesson",
    "",
    "Provide one criteria[] entry per criterion id above (do NOT skip any). Quote evidence excerpts verbatim from the lesson.",
  ].join("\n");
}

function buildUserMessage(curriculum: Curriculum): string {
  const slots = studentFacingSlots(curriculum);
  const blocks = slots.map((s) => `--- ${JSON.stringify(s.slot)} ---\n${s.excerpt}`).join("\n\n");
  return ["Student-facing lesson content (wrong MCQ option text is intentionally excluded — those bait misconceptions, they do not teach):", "", blocks].join("\n");
}

function aggregate(
  judged: z.infer<typeof coverageResponseSchema>,
  criteria: CoverageCriterion[],
  model: string,
  runs: number,
): EvaluatorResult<CoverageVerdict> {
  const byId = new Map(judged.criteria.map((c) => [c.criterion_id, c]));
  const perItem: PerItemVerdict<CoverageVerdict>[] = criteria.map((c) => {
    const j = byId.get(c.id);
    return {
      target: { criterion: c.id },
      verdict: (j?.verdict ?? "missing") as CoverageVerdict,
      reasoning: j?.reasoning ?? "(judge did not return this criterion)",
      citedKGNodeIds: c.targetId ? [c.targetId] : [],
      confidence: "high",
    };
  });

  const summary = perItem.find((p) => (p.target as { criterion: string }).criterion === "summary");
  if (summary?.verdict === "missing") {
    return {
      evaluatorId: "learning-goal-coverage",
      dimension: RUBRIC.dimension,
      rating: 1,
      reasoning: "Summary criterion missing — lesson does not teach the learning goal.",
      perItem,
      unsureItems: [],
      runMetadata: { model, runs, timestampISO: new Date().toISOString() },
    };
  }

  const teachesItems = perItem.filter((p) => {
    const id = (p.target as { criterion: string }).criterion;
    return id.startsWith("teaches:");
  });
  const addressesItems = perItem.filter((p) => {
    const id = (p.target as { criterion: string }).criterion;
    return id.startsWith("addresses:");
  });

  const anyTeachesMissing = teachesItems.some((p) => p.verdict === "missing");
  if (anyTeachesMissing) {
    return {
      evaluatorId: "learning-goal-coverage",
      dimension: RUBRIC.dimension,
      rating: 2,
      reasoning: "One or more taught facts are missing from the lesson.",
      perItem,
      unsureItems: [],
      runMetadata: { model, runs, timestampISO: new Date().toISOString() },
    };
  }

  const allTeachesMet = teachesItems.every((p) => p.verdict === "met");
  const addressesCovered = addressesItems.filter((p) => p.verdict !== "missing").length;
  const addressesRatio = addressesItems.length === 0 ? 1 : addressesCovered / addressesItems.length;

  let rating: 1 | 2 | 3 | 4;
  if (allTeachesMet && addressesRatio >= 0.8) rating = 4;
  else if (addressesRatio >= 0.5) rating = 3;
  else rating = 2;

  return {
    evaluatorId: "learning-goal-coverage",
    dimension: RUBRIC.dimension,
    rating,
    reasoning: `Teaches: ${teachesItems.filter((p) => p.verdict === "met").length}/${teachesItems.length} met. Addresses: ${addressesCovered}/${addressesItems.length} covered.`,
    perItem,
    unsureItems: [],
    runMetadata: { model, runs, timestampISO: new Date().toISOString() },
  };
}

export const learningGoalCoverageEvaluator: Evaluator<CoverageVerdict> = {
  id: "learning-goal-coverage",
  dimension: RUBRIC.dimension,
  rubric: RUBRIC,
  async evaluate(curriculum: Curriculum, ctx: KGContext, opts?: EvaluatorOptions) {
    const internal = (opts ?? {}) as InternalOptions;
    const model = internal.model ?? "gpt-4o";
    const runs = internal.runs ?? 1;
    const criteria = buildCoverageCriteria(ctx);
    const req: CallJudgeRequest<z.infer<typeof coverageResponseSchema>> = {
      systemMessage: buildSystemMessage(ctx, criteria),
      userMessage: buildUserMessage(curriculum),
      responseSchema: coverageResponseSchema,
      schemaName: "CoverageResponse",
    };
    const judge = internal.__judge ?? callJudge;
    const { parsed } = await judge(req, { model });
    return aggregate(parsed, criteria, model, runs);
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:experimental -- tests/learningGoalCoverage.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add experimental/eval-engine/evaluators/learningGoalCoverage.ts \
        experimental/eval-engine/tests/learningGoalCoverage.test.ts
git commit -m "Add Learning Goal Coverage evaluator with KG-derived criteria"
```

---

## Task 8: Orchestrator (verdict policy + runEvaluation + registry)

**Files:**
- Create: `experimental/eval-engine/evaluators/registry.ts`
- Create: `experimental/eval-engine/orchestrator/verdict.ts`
- Create: `experimental/eval-engine/orchestrator/runEvaluation.ts`
- Create: `experimental/eval-engine/tests/orchestrator.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `experimental/eval-engine/tests/orchestrator.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { computeOverallVerdict } from "@/experimental/eval-engine/orchestrator/verdict";
import { runEvaluation } from "@/experimental/eval-engine/orchestrator/runEvaluation";
import type { EvaluatorResult } from "@/experimental/eval-engine/evaluators/types";
import { loadKG, type LoadedKG } from "@/experimental/eval-engine/kg";
import type { Curriculum } from "@/lib/curriculum.types";

const baseCurriculum: Curriculum = {
  reading1: { id: "r1", title: "T", body: "B" },
  mcq1: { id: "m1", prompt: "P", options: [{ id: "a", text: "x", isCorrect: true }] },
  simulationCaptions: { oneBond: "o", twoBond: { mechanism: "m", consequence: "c", hazard: "h" } },
  mcq2: { id: "m2", prompt: "P", options: [{ id: "a", text: "x", isCorrect: true }] },
  voiceTutor: { groundingFacts: [], openingPrompt: "open" },
};

function makeResult(opts: { id: string; rating: 1 | 2 | 3 | 4; unexpectedContradictions: number; unsureCount?: number }): EvaluatorResult<string> {
  const perItem = [];
  for (let i = 0; i < opts.unexpectedContradictions; i++) {
    perItem.push({
      target: { slot: { kind: "reading" as const, field: "body" as const }, excerpt: "x" },
      verdict: "contradicted-unexpected",
      reasoning: "x",
      citedKGNodeIds: [],
      confidence: "high" as const,
    });
  }
  const unsure = [];
  for (let i = 0; i < (opts.unsureCount ?? 0); i++) {
    unsure.push({
      target: { slot: { kind: "reading" as const, field: "body" as const }, excerpt: "x" },
      verdict: "unsupported",
      reasoning: "x",
      citedKGNodeIds: [],
      confidence: "low" as const,
    });
  }
  return {
    evaluatorId: opts.id,
    dimension: opts.id,
    rating: opts.rating,
    reasoning: "test",
    perItem,
    unsureItems: unsure,
    runMetadata: { model: "test", runs: 1, timestampISO: "2026-05-20T00:00:00.000Z" },
  };
}

describe("computeOverallVerdict", () => {
  it("passes when all evaluators rating>=3 and no unexpected contradictions", () => {
    const v = computeOverallVerdict([
      makeResult({ id: "a", rating: 4, unexpectedContradictions: 0 }),
      makeResult({ id: "b", rating: 3, unexpectedContradictions: 0 }),
    ]);
    expect(v.pass).toBe(true);
    expect(v.minRating).toBe(3);
  });

  it("fails when any evaluator rates <3", () => {
    const v = computeOverallVerdict([
      makeResult({ id: "a", rating: 4, unexpectedContradictions: 0 }),
      makeResult({ id: "b", rating: 2, unexpectedContradictions: 0 }),
    ]);
    expect(v.pass).toBe(false);
    expect(v.minRating).toBe(2);
  });

  it("fails when any contradicted-unexpected exists even if ratings>=3", () => {
    const v = computeOverallVerdict([
      makeResult({ id: "a", rating: 3, unexpectedContradictions: 1 }),
    ]);
    expect(v.pass).toBe(false);
  });

  it("does NOT fail solely because of unsureItems (decision-support)", () => {
    const v = computeOverallVerdict([
      makeResult({ id: "a", rating: 4, unexpectedContradictions: 0, unsureCount: 3 }),
    ]);
    expect(v.pass).toBe(true);
    expect(v.needsHumanReview).toBe(3);
  });
});

describe("runEvaluation", () => {
  it("runs all registered evaluators in parallel and assembles a report", async () => {
    const kg = loadKG({
      learningGoals: [
        { type: "LearningGoal", id: "lg.t", question: "?", summary: "S", prerequisites: [], teaches: [], addresses: [] },
      ],
      atomicFacts: [],
      misconceptions: [],
      sources: [],
    });
    const stub1 = {
      id: "e1",
      dimension: "Dim1",
      rubric: { dimension: "Dim1", levels: [] as never },
      evaluate: vi.fn(async () => makeResult({ id: "e1", rating: 4, unexpectedContradictions: 0 })),
    };
    const stub2 = {
      id: "e2",
      dimension: "Dim2",
      rubric: { dimension: "Dim2", levels: [] as never },
      evaluate: vi.fn(async () => makeResult({ id: "e2", rating: 4, unexpectedContradictions: 0 })),
    };
    const report = await runEvaluation(baseCurriculum, "lg.t", { kg: kg as LoadedKG, evaluators: [stub1, stub2] as any });
    expect(stub1.evaluate).toHaveBeenCalledOnce();
    expect(stub2.evaluate).toHaveBeenCalledOnce();
    expect(report.evaluatorResults).toHaveLength(2);
    expect(report.overallVerdict.pass).toBe(true);
    expect(report.learningGoalId).toBe("lg.t");
  });

  it("propagates the fail-closed verdict policy in the report", async () => {
    const kg = loadKG({
      learningGoals: [
        { type: "LearningGoal", id: "lg.t", question: "?", summary: "S", prerequisites: [], teaches: [], addresses: [] },
      ],
      atomicFacts: [],
      misconceptions: [],
      sources: [],
    });
    const failing = {
      id: "e1",
      dimension: "Dim1",
      rubric: { dimension: "Dim1", levels: [] as never },
      evaluate: vi.fn(async () => makeResult({ id: "e1", rating: 2, unexpectedContradictions: 0 })),
    };
    const report = await runEvaluation(baseCurriculum, "lg.t", { kg: kg as LoadedKG, evaluators: [failing] as any });
    expect(report.overallVerdict.pass).toBe(false);
    expect(report.overallVerdict.minRating).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:experimental -- tests/orchestrator.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `evaluators/registry.ts`**

Create `experimental/eval-engine/evaluators/registry.ts`:

```ts
import { factualAccuracyEvaluator } from "./factualAccuracy";
import { learningGoalCoverageEvaluator } from "./learningGoalCoverage";
import type { Evaluator } from "./types";

export const registeredEvaluators: Evaluator<string>[] = [
  factualAccuracyEvaluator as Evaluator<string>,
  learningGoalCoverageEvaluator as Evaluator<string>,
];
```

- [ ] **Step 4: Implement `orchestrator/verdict.ts`**

Create `experimental/eval-engine/orchestrator/verdict.ts`:

```ts
import type { EvaluatorResult, RubricLevel } from "@/experimental/eval-engine/evaluators/types";

export interface OverallVerdict {
  pass: boolean;
  minRating: RubricLevel;
  summary: string;
  needsHumanReview: number;
}

export function computeOverallVerdict(results: EvaluatorResult<string>[]): OverallVerdict {
  const minRating = (results.length === 0
    ? 1
    : Math.min(...results.map((r) => r.rating))) as RubricLevel;

  const unexpectedContradictions = results
    .flatMap((r) => r.perItem)
    .filter((p) => p.verdict === "contradicted-unexpected").length;

  const needsHumanReview = results.reduce((acc, r) => acc + r.unsureItems.length, 0);

  const ratingOk = results.every((r) => r.rating >= 3);
  const contradictionsOk = unexpectedContradictions === 0;
  const pass = ratingOk && contradictionsOk;

  const summaryParts: string[] = [];
  if (!ratingOk) summaryParts.push(`min rating ${minRating} < 3`);
  if (!contradictionsOk) summaryParts.push(`${unexpectedContradictions} unexpected contradiction(s)`);
  if (needsHumanReview > 0) summaryParts.push(`${needsHumanReview} item(s) need human review (decision-support, not a failure)`);
  const summary = pass
    ? `PASS — all ${results.length} evaluator(s) at rating ${minRating} or higher.`
    : `FAIL — ${summaryParts.join("; ")}.`;

  return { pass, minRating, summary, needsHumanReview };
}
```

- [ ] **Step 5: Implement `orchestrator/runEvaluation.ts`**

Create `experimental/eval-engine/orchestrator/runEvaluation.ts`:

```ts
import type { Curriculum } from "@/lib/curriculum.types";
import type { Evaluator, EvaluatorResult, RubricLevel } from "@/experimental/eval-engine/evaluators/types";
import { registeredEvaluators } from "@/experimental/eval-engine/evaluators/registry";
import { loadKGFromDisk, type LoadedKG } from "@/experimental/eval-engine/kg";
import { computeOverallVerdict, type OverallVerdict } from "./verdict";

export interface EvaluationReport {
  learningGoalId: string;
  curriculumSummary: { readingTitle: string; mcqCount: number };
  evaluatorResults: EvaluatorResult<string>[];
  overallVerdict: OverallVerdict;
  generatedAt: string;
}

export interface RunEvaluationOptions {
  kg?: LoadedKG;
  evaluators?: Evaluator<string>[];
  model?: string;
  runs?: number;
}

export async function runEvaluation(
  curriculum: Curriculum,
  learningGoalId: string,
  opts: RunEvaluationOptions = {},
): Promise<EvaluationReport> {
  const kg = opts.kg ?? loadKGFromDisk();
  const ctx = kg.resolveContext(learningGoalId);
  const evaluators = opts.evaluators ?? registeredEvaluators;
  const evaluatorResults = await Promise.all(
    evaluators.map((e) => e.evaluate(curriculum, ctx, { model: opts.model, runs: opts.runs })),
  );
  const overallVerdict = computeOverallVerdict(evaluatorResults);
  return {
    learningGoalId,
    curriculumSummary: {
      readingTitle: curriculum.reading1.title,
      mcqCount: [curriculum.mcq1, curriculum.mcq2].length,
    },
    evaluatorResults,
    overallVerdict,
    generatedAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test:experimental -- tests/orchestrator.test.ts`
Expected: PASS — all 6 tests green.

- [ ] **Step 7: Commit**

```bash
git add experimental/eval-engine/evaluators/registry.ts \
        experimental/eval-engine/orchestrator/ \
        experimental/eval-engine/tests/orchestrator.test.ts
git commit -m "Add orchestrator with fail-closed verdict policy and parallel evaluator dispatch"
```

---

## Task 9: Markdown report renderer

**Files:**
- Create: `experimental/eval-engine/reports/markdown.ts`
- Create: `experimental/eval-engine/tests/markdown.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `experimental/eval-engine/tests/markdown.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderMarkdownReport } from "@/experimental/eval-engine/reports/markdown";
import type { EvaluationReport } from "@/experimental/eval-engine/orchestrator/runEvaluation";

const passingReport: EvaluationReport = {
  learningGoalId: "lg.test",
  curriculumSummary: { readingTitle: "Bonding 101", mcqCount: 2 },
  evaluatorResults: [
    {
      evaluatorId: "factual-accuracy",
      dimension: "Factual Accuracy",
      rating: 4,
      reasoning: "all good",
      perItem: [],
      unsureItems: [],
      runMetadata: { model: "gpt-4o", runs: 1, timestampISO: "2026-05-20T00:00:00.000Z" },
    },
  ],
  overallVerdict: { pass: true, minRating: 4, summary: "PASS", needsHumanReview: 0 },
  generatedAt: "2026-05-20T00:00:00.000Z",
};

const failingReport: EvaluationReport = {
  learningGoalId: "lg.test",
  curriculumSummary: { readingTitle: "Bonding 101", mcqCount: 2 },
  evaluatorResults: [
    {
      evaluatorId: "factual-accuracy",
      dimension: "Factual Accuracy",
      rating: 2,
      reasoning: "one unexpected contradiction",
      perItem: [
        {
          target: { slot: { kind: "reading", field: "body" }, excerpt: "wrong claim" },
          verdict: "contradicted-unexpected",
          reasoning: "contradicts fact.x",
          citedKGNodeIds: ["fact.x"],
          confidence: "high",
        },
      ],
      unsureItems: [
        {
          target: { slot: { kind: "reading", field: "body" }, excerpt: "novel claim" },
          verdict: "unsupported",
          reasoning: "not in KG",
          citedKGNodeIds: [],
          confidence: "low",
        },
      ],
      runMetadata: { model: "gpt-4o", runs: 1, timestampISO: "2026-05-20T00:00:00.000Z" },
    },
  ],
  overallVerdict: { pass: false, minRating: 2, summary: "FAIL", needsHumanReview: 1 },
  generatedAt: "2026-05-20T00:00:00.000Z",
};

describe("renderMarkdownReport", () => {
  it("renders a passing report with the overall verdict header", () => {
    const md = renderMarkdownReport(passingReport);
    expect(md).toContain("# Evaluation Report");
    expect(md).toMatch(/Overall:\s+PASS/);
    expect(md).toContain("lg.test");
    expect(md).toContain("Factual Accuracy");
  });

  it("renders contradictions in a 'must fix' section and unsupported claims in a 'decision-support' section", () => {
    const md = renderMarkdownReport(failingReport);
    expect(md).toMatch(/Overall:\s+FAIL/);
    expect(md).toMatch(/Contradictions \(must fix\)/i);
    expect(md).toContain("wrong claim");
    expect(md).toContain("contradicts fact.x");
    expect(md).toMatch(/Unsupported claims \(decision-support/i);
    expect(md).toContain("novel claim");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:experimental -- tests/markdown.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `reports/markdown.ts`**

Create `experimental/eval-engine/reports/markdown.ts`:

```ts
import type { EvaluationReport } from "@/experimental/eval-engine/orchestrator/runEvaluation";
import type { EvaluatorResult, PerItemVerdict, SlotInstance } from "@/experimental/eval-engine/evaluators/types";

function describeTarget(t: PerItemVerdict<string>["target"]): string {
  if ("criterion" in t) return t.criterion;
  const s = (t as SlotInstance).slot;
  switch (s.kind) {
    case "reading":
      return `reading.${s.field}`;
    case "mcq":
      return `${s.mcqId}.${s.field}`;
    case "mcqOption":
      return `${s.mcqId}.${s.optionId}.${s.field} (isCorrect=${s.isCorrect})`;
    case "tutorGroundingFact":
      return `tutor.groundingFacts[${s.index}]`;
    case "tutorOpeningPrompt":
      return "tutor.openingPrompt";
    case "simulationCaption":
      return `simulationCaption.${s.key}`;
  }
}

function renderItem(p: PerItemVerdict<string>): string {
  const t = describeTarget(p.target);
  const cited = p.citedKGNodeIds.length ? ` (cited: ${p.citedKGNodeIds.join(", ")})` : "";
  const excerpt = "slot" in p.target ? (p.target as SlotInstance).excerpt : "";
  const excerptLine = excerpt ? `\n  - Excerpt: "${excerpt}"` : "";
  return `- **${t}** — verdict: \`${p.verdict}\`${cited}${excerptLine}\n  - ${p.reasoning}`;
}

function renderEvaluator(r: EvaluatorResult<string>): string {
  const contradictions = r.perItem.filter((p) => p.verdict === "contradicted-unexpected");
  const unsupported = r.unsureItems;

  const sections: string[] = [];
  sections.push(`## ${r.dimension} — Rating: ${r.rating} / ${ratingLabel(r.rating)}`);
  sections.push(`> ${r.reasoning}`);

  if (contradictions.length) {
    sections.push("### Contradictions (must fix)");
    sections.push(contradictions.map(renderItem).join("\n"));
  }
  if (unsupported.length) {
    sections.push("### Unsupported claims (decision-support — your call)");
    sections.push(unsupported.map(renderItem).join("\n"));
    sections.push("> Action for each: extend the KG with a cited AtomicFact, or remove the claim from the lesson.");
  }

  const others = r.perItem.filter((p) => p.verdict !== "contradicted-unexpected" && !unsupported.includes(p));
  if (others.length) {
    sections.push("### Other items");
    sections.push(others.map(renderItem).join("\n"));
  }

  return sections.join("\n\n");
}

function ratingLabel(rating: number): string {
  switch (rating) {
    case 1: return "Failing/Off-target";
    case 2: return "Concerns/Gaps";
    case 3: return "Mostly accurate/Adequate";
    case 4: return "Accurate/Full coverage";
    default: return "?";
  }
}

export function renderMarkdownReport(report: EvaluationReport): string {
  const header = [
    "# Evaluation Report",
    "",
    `**Learning Goal:** ${report.learningGoalId}`,
    `**Curriculum:** "${report.curriculumSummary.readingTitle}" (${report.curriculumSummary.mcqCount} MCQ${report.curriculumSummary.mcqCount === 1 ? "" : "s"})`,
    `**Overall:** ${report.overallVerdict.pass ? "PASS" : "FAIL"} (min rating: ${report.overallVerdict.minRating}; ${report.overallVerdict.needsHumanReview} item(s) need human review)`,
    `**Generated:** ${report.generatedAt}`,
    "",
    `> ${report.overallVerdict.summary}`,
  ].join("\n");

  const body = report.evaluatorResults.map(renderEvaluator).join("\n\n---\n\n");

  return `${header}\n\n${body}\n`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:experimental -- tests/markdown.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add experimental/eval-engine/reports/ experimental/eval-engine/tests/markdown.test.ts
git commit -m "Add markdown report renderer"
```

---

## Task 10: CLI entry point

**Files:**
- Create: `experimental/eval-engine/cli/eval.ts`
- Create: `experimental/eval-engine/cli/args.ts`
- Create: `experimental/eval-engine/tests/cli.test.ts`

- [ ] **Step 1: Write the failing arg-parser tests**

Create `experimental/eval-engine/tests/cli.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseArgs } from "@/experimental/eval-engine/cli/args";

describe("parseArgs", () => {
  it("parses fixture + goal", () => {
    const a = parseArgs(["--fixture", "good-bonding-lesson", "--goal", "lg.x"]);
    expect(a).toEqual({
      source: { kind: "fixture", name: "good-bonding-lesson" },
      goal: "lg.x",
      runs: 1,
      model: "gpt-4o",
      json: undefined,
    });
  });
  it("parses --curriculum (path) + goal", () => {
    const a = parseArgs(["--curriculum", "./path/to/lesson.ts", "--goal", "lg.x"]);
    expect(a.source).toEqual({ kind: "curriculum", path: "./path/to/lesson.ts" });
    expect(a.goal).toBe("lg.x");
  });
  it("accepts --runs and --model and --json", () => {
    const a = parseArgs(["--fixture", "f", "--goal", "g", "--runs", "3", "--model", "gpt-4o-mini", "--json", "out.json"]);
    expect(a).toEqual({
      source: { kind: "fixture", name: "f" },
      goal: "g",
      runs: 3,
      model: "gpt-4o-mini",
      json: "out.json",
    });
  });
  it("rejects missing required args", () => {
    expect(() => parseArgs(["--fixture", "f"])).toThrow(/--goal/);
    expect(() => parseArgs(["--goal", "g"])).toThrow(/--fixture|--curriculum/);
  });
  it("rejects --fixture and --curriculum together", () => {
    expect(() =>
      parseArgs(["--fixture", "f", "--curriculum", "p", "--goal", "g"]),
    ).toThrow(/both --fixture and --curriculum/);
  });
  it("rejects unknown flags", () => {
    expect(() => parseArgs(["--fixture", "f", "--goal", "g", "--bogus"])).toThrow(/--bogus/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:experimental -- tests/cli.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `cli/args.ts`**

Create `experimental/eval-engine/cli/args.ts`:

```ts
export type CurriculumSource =
  | { kind: "fixture"; name: string }
  | { kind: "curriculum"; path: string };

export interface ParsedArgs {
  source: CurriculumSource;
  goal: string;
  runs: number;
  model: string;
  json?: string;
}

const KNOWN = new Set(["--fixture", "--curriculum", "--goal", "--runs", "--model", "--json"]);

export function parseArgs(argv: string[]): ParsedArgs {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (!flag.startsWith("--")) throw new Error(`Unexpected positional argument: ${flag}`);
    if (!KNOWN.has(flag)) throw new Error(`Unknown flag: ${flag}. Known flags: ${[...KNOWN].join(", ")}`);
    const value = argv[++i];
    if (value === undefined) throw new Error(`Flag ${flag} requires a value`);
    map.set(flag, value);
  }
  const fixture = map.get("--fixture");
  const curriculum = map.get("--curriculum");
  const goal = map.get("--goal");
  if (fixture && curriculum) {
    throw new Error("Cannot pass both --fixture and --curriculum; choose one");
  }
  if (!fixture && !curriculum) {
    throw new Error("Missing required flag: pass either --fixture <name> or --curriculum <path>");
  }
  if (!goal) throw new Error("Missing required flag: --goal");
  const source: CurriculumSource = fixture
    ? { kind: "fixture", name: fixture }
    : { kind: "curriculum", path: curriculum! };
  return {
    source,
    goal,
    runs: map.has("--runs") ? Number(map.get("--runs")) : 1,
    model: map.get("--model") ?? "gpt-4o",
    json: map.get("--json"),
  };
}
```

- [ ] **Step 4: Run the arg-parser test**

Run: `npm run test:experimental -- tests/cli.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Implement `cli/eval.ts`**

Create `experimental/eval-engine/cli/eval.ts`:

```ts
import { writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "./args";
import { runEvaluation } from "@/experimental/eval-engine/orchestrator/runEvaluation";
import { renderMarkdownReport } from "@/experimental/eval-engine/reports/markdown";

async function main(): Promise<number> {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error parsing arguments: ${(err as Error).message}`);
    console.error("");
    console.error("Usage: npx tsx experimental/eval-engine/cli/eval.ts --fixture <name> --goal <id> [--runs N] [--model M] [--json out.json]");
    return 2;
  }

  let curriculum;
  try {
    const modPath =
      args.source.kind === "fixture"
        ? path.resolve(__dirname, "../fixtures", `${args.source.name}.ts`)
        : path.resolve(process.cwd(), args.source.path);
    const mod = await import(modPath);
    curriculum = mod.curriculum;
    if (!curriculum) {
      const label = args.source.kind === "fixture" ? `Fixture ${args.source.name}` : `Module ${args.source.path}`;
      console.error(`${label} did not export a 'curriculum' object`);
      return 2;
    }
  } catch (err) {
    const label = args.source.kind === "fixture" ? `fixture '${args.source.name}'` : `curriculum '${args.source.path}'`;
    console.error(`Failed to load ${label}: ${(err as Error).message}`);
    return 2;
  }

  let report;
  try {
    report = await runEvaluation(curriculum, args.goal, { model: args.model, runs: args.runs });
  } catch (err) {
    console.error(`Eval engine error: ${(err as Error).message}`);
    return 2;
  }

  console.log(renderMarkdownReport(report));

  if (args.json) {
    writeFileSync(args.json, JSON.stringify(report, null, 2));
  }

  return report.overallVerdict.pass ? 0 : 1;
}

main().then((code) => process.exit(code));
```

- [ ] **Step 6: Smoke-check the CLI compiles (no real OpenAI call yet — fixture doesn't exist)**

Run: `npx tsx experimental/eval-engine/cli/eval.ts --fixture nope --goal lg.ng-bonding-one-point`
Expected: exit code 2; stderr contains `Failed to load fixture 'nope'`.

- [ ] **Step 7: Commit**

```bash
git add experimental/eval-engine/cli/ experimental/eval-engine/tests/cli.test.ts
git commit -m "Add CLI entry point and arg parser"
```

---

## Task 11: Hand-authored fixtures

**Files:**
- Create: `experimental/eval-engine/fixtures/good-bonding-lesson.ts`
- Create: `experimental/eval-engine/fixtures/bad-factual-bonding-lesson.ts`
- Create: `experimental/eval-engine/fixtures/off-topic-bonding-lesson.ts`
- Create: `experimental/eval-engine/fixtures/unsupported-claim-lesson.ts`
- Create: `experimental/eval-engine/fixtures/bait-option-fixture.ts`
- Create: `experimental/eval-engine/tests/fixtures.test.ts`

- [ ] **Step 1: Write the failing fixture-shape test**

Create `experimental/eval-engine/tests/fixtures.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { curriculum as good, expectedOverallPass as goodPass } from "@/experimental/eval-engine/fixtures/good-bonding-lesson";
import { curriculum as bad, expectedOverallPass as badPass } from "@/experimental/eval-engine/fixtures/bad-factual-bonding-lesson";
import { curriculum as offTopic, expectedOverallPass as offTopicPass } from "@/experimental/eval-engine/fixtures/off-topic-bonding-lesson";
import { curriculum as unsupported, expectedOverallPass as unsupportedPass } from "@/experimental/eval-engine/fixtures/unsupported-claim-lesson";
import { curriculum as bait, expectedOverallPass as baitPass } from "@/experimental/eval-engine/fixtures/bait-option-fixture";

describe("fixture exports", () => {
  it.each([
    ["good", good, goodPass, true],
    ["bad-factual", bad, badPass, false],
    ["off-topic", offTopic, offTopicPass, false],
    ["unsupported-claim", unsupported, unsupportedPass, true],
    ["bait-option", bait, baitPass, true],
  ])("%s exports a Curriculum and expected pass=%s", (_name, c, actualPass, expectedPass) => {
    expect(c.reading1.body.length).toBeGreaterThan(0);
    expect(c.mcq1.options.length).toBeGreaterThan(0);
    expect(actualPass).toBe(expectedPass);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:experimental -- tests/fixtures.test.ts`
Expected: FAIL — fixture modules not found.

- [ ] **Step 3: Author `good-bonding-lesson.ts`**

Create `experimental/eval-engine/fixtures/good-bonding-lesson.ts`. This fixture mirrors the existing real curriculum so the engine has a known-good baseline. Use the live curriculum content as the source of truth — import or copy from `lib/curriculum.ts`:

```ts
import type { Curriculum } from "@/lib/curriculum.types";

export const expectedOverallPass = true;

export const curriculum: Curriculum = {
  reading1: {
    id: "reading-bonding-rule",
    title: "The one-point bonding rule",
    body:
      "In a US residential service the utility's split-phase secondary uses a grounded neutral — one of the conductors is intentionally tied to earth. NEC 250.24(A) requires this neutral-to-ground bond to occur at exactly one point: the service disconnect (the main panel). The bonding screw ties the neutral bus, the equipment grounding bus, the panel enclosure, and the grounding electrode system together at that single point. Downstream of that point — in every subpanel — the neutral and the equipment grounding conductor (EGC) are kept electrically isolated.",
  },
  mcq1: {
    id: "mcq-where-is-bond",
    prompt: "Where is the neutral-to-ground bond located in a US residential service?",
    options: [
      {
        id: "service-disconnect",
        text: "At the service disconnect (the main panel), at exactly one point.",
        isCorrect: true,
      },
      {
        id: "every-subpanel",
        text: "At every panel, including each subpanel.",
        isCorrect: false,
        remediation:
          "Per NEC 250.142 the neutral bus and the EGC bus must be kept electrically isolated downstream of the service disconnect. A second bond at a subpanel creates a parallel return path through the EGC.",
        misconceptionTag: "misc.subpanels-need-own-bond",
      },
      {
        id: "anywhere",
        text: "Anywhere convenient — the location does not matter.",
        isCorrect: false,
        remediation:
          "NEC 250.24(A) is explicit: the bond is at the service disconnect. Multiple bonds violate 250.142 and 250.6.",
        misconceptionTag: "misc.more-bonds-is-safer",
      },
    ],
  },
  simulationCaptions: {
    oneBond:
      "With one bond at the service disconnect, normal load return current flows on the neutral. The EGC carries no current.",
    twoBond: {
      mechanism:
        "A second bond at the subpanel ties the neutral and the EGC together at two points. They form a parallel pair.",
      consequence:
        "Normal load return current divides between the neutral and the EGC in proportion to their admittances.",
      hazard:
        "Continuous current flows on the EGC, raceways, and bonded metal — surfaces that were never sized or insulated to carry it.",
    },
  },
  mcq2: {
    id: "mcq-what-goes-wrong",
    prompt: "What physically goes wrong when a second N-G bond is added at a subpanel?",
    options: [
      {
        id: "parallel-path",
        text: "The neutral and the EGC form a parallel return path, so load current flows on the EGC.",
        isCorrect: true,
      },
      {
        id: "voltage-rises",
        text: "The voltage across the panel rises above 240 V.",
        isCorrect: false,
        remediation:
          "Source voltage does not change. The problem is current redistribution: load return current now divides between the neutral and the EGC.",
        misconceptionTag: "misc.ground-and-neutral-are-the-same",
      },
    ],
  },
  voiceTutor: {
    groundingFacts: [
      "NEC 250.24(A) requires exactly one N-G bond at the service disconnect.",
      "NEC 250.142 forbids using the grounded conductor for grounding non-current-carrying parts downstream of the service disconnect.",
      "A second bond creates a parallel return path through the EGC, putting continuous load current on bonded metal.",
      "Multiple bonds make fault clearing unpredictable because fault current divides across multiple paths.",
      "NEC 250.6 prohibits arrangements that cause objectionable current on grounding conductors.",
    ],
    openingPrompt:
      "Walk me through where the bond goes and why a second bond is a problem. I'll ask one or two follow-ups.",
  },
};
```

- [ ] **Step 4: Author `bad-factual-bonding-lesson.ts`**

Create `experimental/eval-engine/fixtures/bad-factual-bonding-lesson.ts` — same shape as good, but with one deliberate factual error in the reading body that directly contradicts `fact.nec-250-142-subpanel-isolation`:

```ts
import type { Curriculum } from "@/lib/curriculum.types";
import { curriculum as good } from "./good-bonding-lesson";

export const expectedOverallPass = false;

export const curriculum: Curriculum = {
  ...good,
  reading1: {
    ...good.reading1,
    body:
      "In a US residential service the utility's split-phase secondary uses a grounded neutral. NEC 250.24(A) requires a neutral-to-ground bond. To improve safety, every subpanel should also have its own bonding screw installed between the neutral bus and the equipment grounding bus — this provides redundant grounding and helps clear faults faster. The main bonding jumper at the service disconnect plus a duplicate bond at each subpanel is the recommended modern practice.",
  },
};
```

- [ ] **Step 5: Author `off-topic-bonding-lesson.ts`**

Create `experimental/eval-engine/fixtures/off-topic-bonding-lesson.ts` — content is factually correct but teaches a different topic (GFCI testing) instead of one-point bonding. Should pass Factual Accuracy (no contradictions of in-scope KG facts) but fail Learning Goal Coverage:

```ts
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
  },
  voiceTutor: {
    groundingFacts: [
      "GFCIs trip at approximately 5 mA of line-to-ground leakage.",
      "Monthly testing is recommended.",
    ],
    openingPrompt: "Walk me through how a GFCI test works.",
  },
};
```

- [ ] **Step 6: Author `unsupported-claim-lesson.ts`**

Create `experimental/eval-engine/fixtures/unsupported-claim-lesson.ts` — good content plus a precise-number claim the KG can neither entail nor contradict. This validates that `unsupported` items surface in `unsureItems` without auto-failing the run:

```ts
import type { Curriculum } from "@/lib/curriculum.types";
import { curriculum as good } from "./good-bonding-lesson";

export const expectedOverallPass = true;

export const curriculum: Curriculum = {
  ...good,
  voiceTutor: {
    ...good.voiceTutor,
    groundingFacts: [
      ...good.voiceTutor.groundingFacts,
      "GFCIs typically trip in under 25 milliseconds at 5 mA of line-to-ground leakage.",
    ],
  },
};
```

- [ ] **Step 7: Author `bait-option-fixture.ts`**

Create `experimental/eval-engine/fixtures/bait-option-fixture.ts` — explicitly tests slot-role specialization. Wrong MCQ option states a known misconception verbatim. Should produce `contradicted-expected` (not `-unexpected`) and pass:

```ts
import type { Curriculum } from "@/lib/curriculum.types";
import { curriculum as good } from "./good-bonding-lesson";

export const expectedOverallPass = true;

export const curriculum: Curriculum = {
  ...good,
  mcq1: {
    ...good.mcq1,
    options: [
      ...good.mcq1.options,
      {
        id: "extra-bait",
        text: "A subpanel needs the neutral bonded to ground, just like the main panel, to be safe.",
        isCorrect: false,
        remediation:
          "Subpanels keep N and EGC isolated; a second bond creates a parallel return path through the EGC and bonded metal.",
        misconceptionTag: "misc.subpanels-need-own-bond",
      },
    ],
  },
};
```

- [ ] **Step 8: Run the fixture-shape test**

Run: `npm run test:experimental -- tests/fixtures.test.ts`
Expected: PASS — all 5 fixture-shape assertions green. (This test asserts each fixture exports the right shape and the right `expectedOverallPass` value. It does NOT run the engine against them — that's Task 12.)

- [ ] **Step 9: Commit**

```bash
git add experimental/eval-engine/fixtures/ experimental/eval-engine/tests/fixtures.test.ts
git commit -m "Add 5 hand-authored fixtures covering pass, factual-fail, off-topic, unsupported-claim, and bait-option cases"
```

---

## Task 12: Live integration tests (opt-in, gated on OPENAI_API_KEY)

**Files:**
- Create: `experimental/eval-engine/tests/live.eval.test.ts`

This task validates the full pipeline end-to-end with real OpenAI calls. Tests are skipped automatically when `OPENAI_API_KEY` is not set so CI stays free. Live runs cost roughly $0.50–$2 per full pass.

- [ ] **Step 1: Write the live test file**

Create `experimental/eval-engine/tests/live.eval.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { runEvaluation } from "@/experimental/eval-engine/orchestrator/runEvaluation";

const hasKey = !!process.env.OPENAI_API_KEY;
const liveIt = hasKey ? it : it.skip;

describe("live OpenAI integration (skipped without OPENAI_API_KEY)", () => {
  liveIt(
    "good-bonding-lesson passes both evaluators",
    async () => {
      const { curriculum } = await import("@/experimental/eval-engine/fixtures/good-bonding-lesson");
      const report = await runEvaluation(curriculum, "lg.ng-bonding-one-point");
      expect(report.overallVerdict.pass).toBe(true);
      expect(report.overallVerdict.minRating).toBeGreaterThanOrEqual(3);
    },
    60_000,
  );

  liveIt(
    "bad-factual-bonding-lesson fails on a contradicted-unexpected claim",
    async () => {
      const { curriculum } = await import("@/experimental/eval-engine/fixtures/bad-factual-bonding-lesson");
      const report = await runEvaluation(curriculum, "lg.ng-bonding-one-point");
      expect(report.overallVerdict.pass).toBe(false);
      const factual = report.evaluatorResults.find((r) => r.evaluatorId === "factual-accuracy")!;
      const hasUnexpected = factual.perItem.some((p) => p.verdict === "contradicted-unexpected");
      expect(hasUnexpected).toBe(true);
    },
    60_000,
  );

  liveIt(
    "off-topic-bonding-lesson fails on Learning Goal Coverage",
    async () => {
      const { curriculum } = await import("@/experimental/eval-engine/fixtures/off-topic-bonding-lesson");
      const report = await runEvaluation(curriculum, "lg.ng-bonding-one-point");
      expect(report.overallVerdict.pass).toBe(false);
      const coverage = report.evaluatorResults.find((r) => r.evaluatorId === "learning-goal-coverage")!;
      expect(coverage.rating).toBeLessThanOrEqual(2);
    },
    60_000,
  );

  liveIt(
    "bait-option-fixture still passes (wrong MCQ option produces contradicted-expected, not -unexpected)",
    async () => {
      const { curriculum } = await import("@/experimental/eval-engine/fixtures/bait-option-fixture");
      const report = await runEvaluation(curriculum, "lg.ng-bonding-one-point");
      const factual = report.evaluatorResults.find((r) => r.evaluatorId === "factual-accuracy")!;
      const baitItem = factual.perItem.find(
        (p) => "slot" in p.target && p.target.slot.kind === "mcqOption" && p.target.slot.optionId === "extra-bait",
      );
      expect(baitItem?.verdict === "contradicted-expected" || baitItem?.verdict === "supported").toBe(true);
      expect(report.overallVerdict.pass).toBe(true);
    },
    60_000,
  );

  liveIt(
    "unsupported-claim-lesson surfaces an unsureItem but can still pass",
    async () => {
      const { curriculum } = await import("@/experimental/eval-engine/fixtures/unsupported-claim-lesson");
      const report = await runEvaluation(curriculum, "lg.ng-bonding-one-point");
      const factual = report.evaluatorResults.find((r) => r.evaluatorId === "factual-accuracy")!;
      expect(factual.unsureItems.length).toBeGreaterThanOrEqual(1);
    },
    60_000,
  );
});
```

- [ ] **Step 2: Confirm the test file is skipped when no key is set**

Run: `unset OPENAI_API_KEY; npm run test:eval`
Expected: vitest reports 5 tests skipped under the live describe block. Exit code 0.

- [ ] **Step 3: Verify mocked test runs still ignore the live file**

Run: `npm run test:experimental`
Expected: all earlier tests pass; live tests do NOT run (excluded by the `--exclude '**/live.eval.test.ts'` flag in the npm script).

- [ ] **Step 4: (Optional, costs money) Run live tests with the key**

Run: `npm run test:eval`
Expected: 5 tests run, all pass. If any fail, iterate on prompts in `factualAccuracy.ts` / `learningGoalCoverage.ts` — see "Prompt iteration note" below. Do not loosen the assertion bar; the assertions encode the spec's verdict policy.

**Prompt iteration note:** LLM judge output is non-deterministic. If a live test fails sporadically, first try setting `runs: 3` via `majorityVote` in the orchestrator. If failures are consistent, the prompt needs tuning. Common fixes: clearer slot-role rules in the system message; more explicit "use exactly these verdict labels" instruction; reordering KG fact bullets so the most relevant facts appear first.

- [ ] **Step 5: Commit**

```bash
git add experimental/eval-engine/tests/live.eval.test.ts
git commit -m "Add live OpenAI integration tests gated on OPENAI_API_KEY"
```

---

## Task 13: Final README and tidy

**Files:**
- Modify: `experimental/eval-engine/README.md` (expand the stub from Task 1)

- [ ] **Step 1: Expand the README**

Replace the contents of `experimental/eval-engine/README.md` with:

```markdown
# Eval Engine (experimental)

Validates AI-generated lesson content against a structured Knowledge Graph for (a) factual correctness and (b) learning-goal coverage. Modelled on the Chan Zuckerberg Initiative's [Learning Commons](https://docs.learningcommons.org/) evaluator + Knowledge Graph architecture.

See `docs/superpowers/specs/2026-05-20-eval-engine-design.md` for the design.

## What's here

- `kg/` — Knowledge Graph: typed nodes (`LearningGoal`, `AtomicFact`, `Misconception`, `SourceExcerpt`) loaded from JSON files at startup. Hand-authored, seeded from NEC 2023 / Mike Holt sources.
- `evaluators/` — One evaluator per rubric dimension. v1 ships `factualAccuracy` and `learningGoalCoverage`. Each returns a multi-component structured `EvaluatorResult` (rating + reasoning + per-item verdicts + items needing human review).
- `judge/` — Thin OpenAI wrapper using `zodResponseFormat` for structured output. Mockable for tests.
- `orchestrator/` — Resolves the KG subgraph for a learning goal, dispatches evaluators in parallel, applies the fail-closed verdict policy.
- `reports/` — Markdown renderer for human reading. The JSON shape is the orchestrator's `EvaluationReport` type, consumed by the (future) content-generation engine.
- `cli/` — `npx tsx experimental/eval-engine/cli/eval.ts ...`
- `fixtures/` — Five hand-authored `Curriculum` literals covering pass, factual-fail, off-topic, unsupported-claim, and bait-option cases.
- `tests/` — Mock-first unit/integration tests (run via `npm run test:experimental`, free) and live OpenAI tests (run via `npm run test:eval`, gated on `OPENAI_API_KEY`).

## Quickstart

```
# Run against a fixture (needs OPENAI_API_KEY)
npx tsx experimental/eval-engine/cli/eval.ts \
  --fixture good-bonding-lesson \
  --goal lg.ng-bonding-one-point

# Free unit tests
npm run test:experimental

# Live integration tests (~$0.50–2 per run)
npm run test:eval
```

## Verdict policy

Fail-closed: a run **passes** only when every evaluator returns rating ≥ 3 AND there are zero `contradicted-unexpected` items. Unsupported claims surface as `unsureItems` (decision-support) but do not auto-fail — a human chooses between extending the KG with a cited fact or removing the claim.

Exit codes:
- `0` — lesson passed
- `1` — lesson failed evaluation
- `2` — engine error (network, malformed judge response, KG validation, missing key)

## Extending

- New evaluator: add a file in `evaluators/`, register it in `evaluators/registry.ts`. The shared `Evaluator<TLabel>` interface gives you typed multi-component output.
- New learning goal: drop new JSON node files into `kg/learning-goals/`, `kg/atomic-facts/`, `kg/misconceptions/`, `kg/sources/`. The loader validates on startup; missing references error loudly with the offending id.
- Swap OpenAI for a different provider (or add RAG): replace `judge/openaiJudge.ts` with another implementation of the `callJudge` function signature. Evaluators do not change.

## Non-goals for v1

- No content generation engine yet — the eval engine will be consumed by it in the next phase.
- No Misconception Coverage evaluator yet — designed to slot into the same interface in v2.
- No persistence of past eval runs.
- No expert-agreement-rate measurement (requires labeled expert-judged fixtures we don't have).
- No RAG over full NEC corpus — KG + AtomicFacts is the grounding mechanism for v1.
```

- [ ] **Step 2: Run the full mocked test suite for sanity**

Run: `npm run test:experimental`
Expected: all tests across all task files pass. Count should be ~25+ (4 KG + 1 KG-disk + 5 judge + 2 slots + 5 factual + 4 coverage-shape + 6 orchestrator + 2 markdown + 4 CLI + 5 fixtures = 38).

- [ ] **Step 3: Verify the main test suite still passes**

Run: `npm run test:run`
Expected: existing production tests pass (still 27 tests per the README; experimental is excluded).

- [ ] **Step 4: Commit**

```bash
git add experimental/eval-engine/README.md
git commit -m "Expand experimental/eval-engine README"
```

- [ ] **Step 5: Final cleanup verification**

Run: `git status`
Expected: clean working tree on branch `worktree-eval-engine`.

---

## Self-review checklist (for the executing agent)

Before declaring the plan complete, verify:

- [ ] Every spec section in `docs/superpowers/specs/2026-05-20-eval-engine-design.md` is covered by at least one task.
- [ ] No production file (`app/`, `lib/`, `components/`, `tests/` outside `/experimental/`) was modified except `package.json`, `vitest.config.ts`, and `.env.local.example`.
- [ ] `npm run test:run` still passes (production tests untouched).
- [ ] `npm run test:experimental` passes with no live calls.
- [ ] If `OPENAI_API_KEY` is set, `npm run test:eval` passes all 5 live integration tests.
- [ ] No type-only `// @ts-ignore`, no `any` outside the explicit `__judge` test seam, no TODO/FIXME comments.
