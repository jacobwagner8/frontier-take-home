# Eval Engine for AI-Generated Lesson Content — Design

**Date:** 2026-05-20
**Status:** Approved (brainstormed; awaiting written-spec review)
**Scope:** Experimental. All code lives under `/experimental/eval-engine/`. Production app (`app/`, `lib/`, `components/`) is untouched.

## Motivation

The current production app deliberately hand-authors every technical claim. The original design doc (`docs/superpowers/specs/2026-05-18-bonding-teaching-tool-design.md`) lists "subject-matter accuracy" as the highest-risk failure mode and chose hand-authored content for that reason: README design decision #1 and spec lines 22 and 159 explicitly forbid AI-generated technical claims.

We now want to explore allowing AI-generated content into lesson plans. To do that safely, we need a gate strong enough to overturn that original decision: an **evaluation engine** that, given a learning goal and a candidate AI-generated `Curriculum` object, judges two things:

1. **Factual correctness** — are all claims made in the lesson content true?
2. **Learning-goal coverage** — does the lesson actually teach and answer the learning goal?

This document specifies the eval engine. The companion **content generation engine** is out of scope for this spec; the eval engine is built first because the generation engine will consume its output to drive retries.

## Architectural Influence

Modelled on the Chan Zuckerberg Initiative's [Learning Commons](https://docs.learningcommons.org/) — specifically the Evaluator and Knowledge Graph architectures:

- **Evaluator pattern** (LC docs): one evaluator per rubric dimension; multi-component structured output (rating, reasoning, identified topics, per-criterion evidence); LLM-driven with N-run majority-vote in dev; explicitly framed as **decision-support, not ground truth** ("Do not use accuracy alone to fully automate high-stakes decisions").
- **Knowledge Graph pattern** (LC docs): typed nodes + edges (Standards, Learning Components, Curriculum, Learning Progressions) providing structured grounding for downstream tools.

Learning Commons' own KG and evaluators are K-12-focused — no NEC / electrical content; their existing evaluators judge grade-level complexity rather than factual correctness — so we **mirror the architecture** with our own KG seeded from NEC 2023 / Mike Holt / IAEI sources, and our own evaluators specialized for technical-accuracy judgment.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Input shape | Structured `Curriculum` object (the existing type) | Each text slot retains its semantic role (reading body vs. wrong MCQ option vs. tutor grounding fact). Evaluators specialize per slot role; plain markdown couldn't. |
| Truth source | LLM-as-judge **grounded by an in-process Knowledge Graph subgraph** | Middle path between raw LLM-as-judge (rejected — same hallucination risk that drove the original "no AI" decision) and full RAG infra (overbuild for v1). KG provides curated AtomicFacts + SourceExcerpts as judge context. |
| Pedagogy check | Rubric-based coverage evaluator with criteria **derived from the KG** | Adding a new fact to a learning goal in the KG automatically grows the coverage check — no evaluator code changes. |
| Architecture | Real KG (typed nodes/edges) + structured evaluators (multi-component output) | Cleanest expression of the Learning Commons pattern at minimal complexity. Evolves into per-claim multi-step pipelines without changing the evaluator interface. |
| v1 evaluators | Factual Accuracy + Learning Goal Coverage | Misconception Coverage and others land later, on the same interface. |
| Language / stack | TypeScript, OpenAI SDK, `zod`, no DB | Matches the repo; reuses existing `.env.local` key; the only new dep is `zod` for KG schema validation. |
| Verdict policy | Fail-closed: pass only if every evaluator ≥ rating 3 AND zero `contradicted-unexpected` items | The eval gate must be strict enough to overturn the original "no AI" decision. Unsupported claims are decision-support, not auto-fail. |

## Scope

**In scope (v1):**
- `/experimental/eval-engine/` self-contained package
- In-process Knowledge Graph: typed nodes, JSON-on-disk, in-memory traversal
- Two evaluators: Factual Accuracy, Learning Goal Coverage
- Orchestrator: parallel evaluator execution, fail-closed verdict, markdown + JSON report
- CLI: `npx tsx experimental/eval-engine/cli/eval.ts ...`
- Hand-authored test fixtures covering pass, factual-fail, off-topic-fail, unsupported-claims, and bait-option cases
- Mock-first test layering (free, runs every push) + opt-in live integration tests (gated on `OPENAI_API_KEY`)
- KG seeded for the existing `lg.ng-bonding-one-point` learning goal only

**Out of scope (explicit non-goals for v1):**
- No content generation engine (separate future spec)
- No retry/regenerate loop driven by eval output (the generation engine's job)
- No Misconception Coverage evaluator (lands in v2 on the same interface)
- No persistence of past eval runs
- No telemetry / expert-agreement-rate measurement (acknowledged but deferred — requires labeled expert-judged examples we don't have)
- No RAG over full NEC corpus (KG + AtomicFacts is the grounding mechanism for v1)
- No Python / Jupyter SDK parity with Learning Commons
- No graph DB (JSON files + in-memory map are sufficient at v1 scale)
- No changes to production code (`app/`, `lib/`, `components/`) — strict one-way import: `/experimental/` may read `lib/curriculum.types.ts`; nothing in production may import from `/experimental/`

## Architecture

### Top-level layout

All new code under `/experimental/eval-engine/`:

```
experimental/
  eval-engine/
    README.md
    package-notes.md

    kg/
      learning-goals/
        ng-bonding-one-point.json
      atomic-facts/
        nec-250-24a-single-bond.json
        nec-250-142-subpanel-isolation.json
        parallel-return-mechanism.json
        fault-clearing-impairment.json
        objectionable-current-on-egc.json
        ...
      misconceptions/
        subpanels-need-own-bond.json
        ground-and-neutral-are-the-same.json
        more-bonds-is-safer.json
      sources/
        nec-2023-250-24a.json
        nec-2023-250-142.json
        ...
      schemas.ts             # zod schemas for each node type
      index.ts               # loader + in-memory traversal helpers

    evaluators/
      types.ts               # EvaluatorResult, Evaluator interface, RubricLevel, KGContext
      factualAccuracy.ts
      learningGoalCoverage.ts
      registry.ts            # array of registered evaluators

    judge/
      openaiJudge.ts         # thin OpenAI wrapper: prompt + JSON-schema + retry
      majorityVote.ts        # optional N-run aggregator (LC dev-time pattern)

    orchestrator/
      runEvaluation.ts       # entry: (Curriculum, learningGoalId) → EvaluationReport
      verdict.ts             # fail-closed overall-verdict policy
      report.ts              # render EvaluationReport → markdown

    cli/
      eval.ts                # CLI: --fixture / --curriculum / --goal / --runs / --json

    fixtures/
      good-bonding-lesson.ts
      bad-factual-bonding-lesson.ts
      off-topic-bonding-lesson.ts
      unsupported-claim-lesson.ts
      bait-option-fixture.ts

    tests/
      kg.test.ts                       # KG loader + traversal + zod validation
      factualAccuracy.test.ts          # aggregation logic with mocked judge
      learningGoalCoverage.test.ts     # aggregation logic with mocked judge
      orchestrator.test.ts             # full pipeline with mocked judge
      live.eval.test.ts                # opt-in: real OpenAI calls against fixtures
```

**Import discipline:** `/experimental/eval-engine/` may import from `lib/curriculum.types.ts` (read-only — for the `Curriculum` type). No file in `lib/`, `app/`, or `components/` may import from `/experimental/`. Production stays clean.

### Knowledge Graph schema

Four node types, JSON-on-disk, one node per file. Edges are implicit via id references; the loader builds the in-memory graph at startup.

| Node | Purpose | Key fields |
|---|---|---|
| `LearningGoal` | The unit the user asks to evaluate against | `id`, `question`, `summary`, `prerequisites: LearningGoalId[]`, `teaches: AtomicFactId[]`, `addresses: MisconceptionId[]` |
| `AtomicFact` | A vetted, atomic, citable claim — the ground-truth unit | `id`, `statement`, `scope` (tag, e.g. `nec-bonding`), `confidence: high\|medium\|low`, `cites: SourceExcerptId[]` |
| `Misconception` | A named common wrong belief | `id`, `name`, `statement` (the wrong belief verbatim), `correction`, `correctedBy: AtomicFactId[]` |
| `SourceExcerpt` | Verbatim source text + citation metadata | `id`, `sourceType: NEC\|MikeHolt\|IAEI`, `citation` (e.g. `NEC 2023 250.24(A)`), `text`, `url?` |

**Sample node files:**

```jsonc
// kg/learning-goals/ng-bonding-one-point.json
{
  "type": "LearningGoal",
  "id": "lg.ng-bonding-one-point",
  "question": "Why a US residential electrical system can have neutral and ground bonded at exactly one point, and what physically goes wrong if there is more than one.",
  "summary": "Single N-G bond at the service disconnect; downstream second bonds create parallel return paths via the EGC.",
  "prerequisites": ["lg.kirchhoff-current-law", "lg.neutral-vs-egc-roles"],
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

```jsonc
// kg/atomic-facts/nec-250-24a-single-bond.json
{
  "type": "AtomicFact",
  "id": "fact.nec-250-24a-single-bond",
  "statement": "In a US residential service, NEC 250.24(A) requires the neutral-to-EGC bond to occur at exactly one point: the service disconnect.",
  "scope": "nec-bonding",
  "confidence": "high",
  "cites": ["src.nec-2023-250-24a"]
}
```

```jsonc
// kg/misconceptions/subpanels-need-own-bond.json
{
  "type": "Misconception",
  "id": "misc.subpanels-need-own-bond",
  "name": "Subpanels need their own N-G bond",
  "statement": "A subpanel needs N bonded to ground to be safe, just like the main panel.",
  "correction": "Subpanels keep N and EGC isolated; a second bond creates a parallel return path through the EGC and bonded metal.",
  "correctedBy": ["fact.nec-250-142-subpanel-isolation", "fact.parallel-return-mechanism"]
}
```

**Loader (`kg/index.ts`)** reads all JSON, validates with zod, builds `Map<id, Node>` per type, and exposes typed traversal helpers:

```ts
kg.getLearningGoal(id): LearningGoal
kg.factsTaughtBy(learningGoalId): AtomicFact[]
kg.misconceptionsAddressedBy(learningGoalId): Misconception[]
kg.excerptsCitedBy(factId): SourceExcerpt[]
kg.resolveContext(learningGoalId): KGContext   // bundles the whole subgraph for a judge
```

**Why this shape:**
- AtomicFacts are the ground-truth unit handed to the LLM judge — structured grounding without RAG.
- Hand-authored for v1, seeded from existing `lib/curriculum.ts` + the original spec. Roughly a half-day of curriculum-author work for the N-G bonding goal.
- Misconceptions are first-class nodes so a future Misconception Coverage evaluator (v2) reads them directly from the KG, not from MCQ-shaped artifacts.
- Source excerpts are separated from facts so one source can ground multiple facts, and so the judge's evidence output can cite by id.

### Evaluator interface and rubrics

```ts
// evaluators/types.ts
export type RubricLevel = 1 | 2 | 3 | 4;

export interface RubricLevelDef { level: RubricLevel; label: string; description: string; }
export interface EvaluatorRubric {
  dimension: string;
  levels: [RubricLevelDef, RubricLevelDef, RubricLevelDef, RubricLevelDef];
}

export type CurriculumSlotId =
  | { kind: "reading"; field: "body" }
  | { kind: "mcq"; mcqId: string; field: "prompt" }
  | { kind: "mcqOption"; mcqId: string; optionId: string; isCorrect: boolean; field: "text" | "remediation" }
  | { kind: "tutorGroundingFact"; index: number }
  | { kind: "simulationCaption"; key: string };

export interface PerItemVerdict<TLabel extends string> {
  target: { slot: CurriculumSlotId; excerpt: string };
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

export interface KGContext {
  learningGoal: LearningGoal;
  taughtFacts: AtomicFact[];
  addressedMisconceptions: Misconception[];
  sourceExcerpts: SourceExcerpt[];
}

export interface Evaluator<TLabel extends string> {
  id: string;
  dimension: string;
  rubric: EvaluatorRubric;
  evaluate(curriculum: Curriculum, ctx: KGContext, opts?: { runs?: number }): Promise<EvaluatorResult<TLabel>>;
}
```

`CurriculumSlotId` carries the **semantic role** of each text fragment (note `isCorrect` on MCQ options). Plain markdown couldn't preserve this.

#### Evaluator 1 — Factual Accuracy

Verdict labels:

| Verdict | Meaning |
|---|---|
| `supported` | Claim entailed by ≥1 AtomicFact in KGContext |
| `contradicted-expected` | Claim contradicts an AtomicFact AND the slot is a wrong MCQ option whose contradiction matches a Misconception in `learningGoal.addresses` — **correct behavior** for bait options |
| `contradicted-unexpected` | Claim contradicts an AtomicFact in any other slot — **fail** |
| `unsupported` | Claim neither entailed nor contradicted — needs human review or KG extension |

The judge prompt is **parameterized by slot role**. For `reading.body`, `remediation`, `tutorGroundingFact`, and *correct* MCQ options, all claims must be `supported`. For *wrong* MCQ options, the judge is told the linked misconceptions and looks for `contradicted-expected`.

Rubric:

| Level | Label | Definition |
|---|---|---|
| 4 | Accurate | Zero `contradicted-unexpected`; ≥80% claims `supported`; all wrong-option contradictions match a known misconception |
| 3 | Mostly accurate | Zero `contradicted-unexpected`; 50–80% supported |
| 2 | Concerns | One `contradicted-unexpected` OR <50% supported |
| 1 | Failing | ≥2 `contradicted-unexpected` |

Output: per-claim verdicts grouped by slot; `unsureItems` = all `unsupported` claims, surfaced for human decision (extend the KG with a new AtomicFact + citation, or reject the lesson).

#### Evaluator 2 — Learning Goal Coverage

Coverage criteria are **derived from the KG at runtime**, not hand-authored per evaluator. For a given `learningGoal` the criteria set is:

- 1 criterion: "lesson reading-section body communicates the learning goal's summary, in the student's reading flow"
- 1 criterion per `learningGoal.teaches` fact: "lesson teaches this fact in any **student-facing** slot — reading body, simulation captions, correct MCQ options, remediation paragraphs, or tutor grounding facts. Wrong MCQ options do NOT count as teaching."
- 1 criterion per `learningGoal.addresses` misconception: "lesson explicitly surfaces this misconception (typically as a wrong MCQ option) AND addresses it (typically in the linked remediation paragraph). Both halves must be present for `met`; presence of only one is `partial`."

Verdict per criterion: `met` | `partial` | `missing`.

Rubric:

| Level | Label | Definition |
|---|---|---|
| 4 | Full coverage | All `teaches` criteria `met`; ≥80% `addresses` criteria `met`-or-`partial` |
| 3 | Adequate | All `teaches` criteria `met`-or-`partial`; ≥50% misconceptions covered |
| 2 | Gaps | Any `teaches` criterion `missing` (except the summary) |
| 1 | Off-target | The summary criterion is `missing` — lesson doesn't actually teach the goal |

#### Judge layer

`judge/openaiJudge.ts` is a thin abstraction so we can swap providers / add RAG / move to multi-step pipelines later without touching evaluators:

```ts
export async function callJudge<T>(req: {
  systemMessage: string;
  userMessage: string;
  responseSchema: ZodSchema<T>;
}, opts: { model: string }): Promise<{ parsed: T; raw: string }>;
```

`majorityVote(call, n=3, keyBy)` is a separate utility for dev-time reliability runs (LC's recommended pattern). Production runs default to N=1.

### Orchestrator, verdict, CLI, report output

**Orchestrator (`orchestrator/runEvaluation.ts`):**

```ts
export interface EvaluationReport {
  learningGoalId: string;
  curriculumSummary: { readingTitle: string; mcqCount: number };
  evaluatorResults: EvaluatorResult<string>[];
  overallVerdict: {
    pass: boolean;
    minRating: RubricLevel;
    summary: string;
    needsHumanReview: number;
  };
  generatedAt: string;
}

export async function runEvaluation(
  curriculum: Curriculum,
  learningGoalId: string,
  opts?: { runs?: number; model?: string }
): Promise<EvaluationReport>;
```

Flow: load KG → `kg.resolveContext(learningGoalId)` → run registered evaluators **in parallel** (no shared state) → compute overall verdict → assemble report.

**Verdict policy (fail-closed on contradictions and rating; decision-support on uncertainty):**
- `pass: true` iff every evaluator returns `rating >= 3` AND there are zero `contradicted-unexpected` items
- Otherwise `pass: false`
- `needsHumanReview > 0` (i.e. `unsupported` claims surfaced as `unsureItems`) does **not** auto-fail. Uncertainty is decision-support, not failure, per the Learning Commons posture. The report surfaces these loudly so a human chooses between "extend KG with a cited fact and re-run" or "remove the claim from the lesson". "Fail-closed" here means **a known contradiction or a sub-3 rating blocks the gate**, not "any uncertainty blocks the gate" — the latter would make the engine unusable on novel claims.

**CLI:**

```
npx tsx experimental/eval-engine/cli/eval.ts \
  --fixture good-bonding-lesson \
  --goal lg.ng-bonding-one-point \
  [--runs 3] [--model gpt-4o] [--json report.json]
```

- `--fixture` resolves to a hand-authored fixture under `fixtures/`
- `--curriculum` alternative loads a `.ts` module exporting a `Curriculum`
- Prints markdown report to stdout; optionally writes structured JSON to `--json`
- Exits `0` on `pass: true`, `1` on `pass: false`, `2` on engine error (network, malformed judge response, KG validation, missing key)

**Report shape (markdown, sketched):**

```md
# Evaluation Report

**Learning Goal:** lg.ng-bonding-one-point
**Overall:** FAIL (worst rating: 2 / Concerns; 3 items need human review)

## Factual Accuracy — Rating: 2 / Concerns

### Contradictions (must fix)
- **reading.body**: "...a subpanel needs its own bonding screw..."
  - Verdict: contradicted-unexpected
  - Contradicts: fact.nec-250-142-subpanel-isolation (NEC 2023 250.142)
  - Reasoning: [judge's words]

### Unsupported claims (decision-support — your call)
- **tutorGroundingFact[3]**: "GFCIs typically trip within 3 cycles."
  - Not entailed by any AtomicFact in scope nec-bonding.
  - Action: either extend KG with a cited source, or remove the claim.

## Learning Goal Coverage — Rating: 4 / Full coverage
- met: reading communicates the summary
- met: teaches fact.nec-250-24a-single-bond
- met: addresses misc.subpanels-need-own-bond
...
```

**JSON report** = the full `EvaluationReport` object, stable schema. This is what the future content-generation engine consumes — `evaluatorResults[].perItem` lets it regenerate only the broken slots, not the whole lesson.

## Testing Strategy

| Layer | What | When it runs | LLM cost |
|---|---|---|---|
| KG validation | Every JSON file parses zod schema; every id reference resolves; no orphan facts or sources; traversal helpers return expected sets | Every push (`npm run test:experimental`) | $0 |
| Evaluator unit tests | `callJudge` mocked; assert evaluators' aggregation logic (verdict rollup → rating, fail-closed policy, `unsureItems` surfacing) | Every push | $0 |
| Orchestrator integration tests | Full `runEvaluation` pipeline with mocked judge; verifies report shape, parallel execution, exit codes | Every push | $0 |
| Live eval integration tests | Real OpenAI calls against fixtures | Opt-in: `npm run test:eval` (skipped if no `OPENAI_API_KEY`) | ~$0.50–2 per full run |

**Test isolation from main suite:** `/experimental/**/*.test.ts` excluded from default `npm test` so production velocity is unaffected. Two new package scripts: `test:experimental` (mocked-only, free) and `test:eval` (live, opt-in, key-gated).

**Fixtures** (each is a `Curriculum` literal + `expectedOverallPass: boolean`):

| Fixture | What it tests | Expected verdict |
|---|---|---|
| `good-bonding-lesson` | Smoke test — mirrors the existing real curriculum. Note: both this fixture and the KG are seeded from the same NEC + Mike Holt sources, so a pass here primarily validates the plumbing end-to-end, not the engine's discriminative power. Real signal comes from the four fixtures below. | PASS, both evaluators ≥ 3 |
| `bad-factual-bonding-lesson` | Reading body asserts "subpanels need their own bonding screw" — direct contradiction of `fact.nec-250-142-subpanel-isolation` | FAIL — `contradicted-unexpected` |
| `off-topic-bonding-lesson` | Factually correct, but teaches GFCI testing instead of one-point bonding | Factual Accuracy ≥ 3, Coverage = 1 → FAIL |
| `unsupported-claim-lesson` | Adds a claim the KG can neither entail nor contradict (e.g. specific GFCI trip-time numbers) | `unsureItems` surfaces it; verdict can still PASS — validates decision-support framing |
| `bait-option-fixture` | Wrong MCQ option states a known misconception | `contradicted-expected` → does NOT fail (validates slot-role specialization) |

## Failure Modes (Eval Engine Itself)

| Failure | Handling | Exit code |
|---|---|---|
| OpenAI 5xx / network error | Retry once with backoff; if still failing, abort with clear error | 2 |
| Judge returns malformed JSON | Log raw response; retry once with stricter instruction; then abort | 2 |
| Judge low confidence on >50% of items | Run completes; report includes "JUDGE LOW CONFIDENCE" banner; verdict still computed | 0/1 per normal |
| KG validation error at startup | Print offending file + zod issue path; abort | 2 |
| Learning goal id not found | Clear error listing available goal ids; abort | 2 |
| Empty curriculum slot | Judge sees empty; evaluator records `missing-content` per-item; coverage drops | normal |
| `OPENAI_API_KEY` missing on CLI run | Clear error pointing to `.env.local`; abort before any LLM call | 2 |

Exit codes are deliberate: `0` = lesson passed; `1` = lesson failed evaluation; `2` = engine error (not the lesson's fault). This lets a future generation engine distinguish "regenerate the lesson" from "retry the eval call".

## v1 → v2 Evolution Path

The interfaces above are designed so v1 → v2 is additive, not a rewrite:

| v2 capability | How it slots in |
|---|---|
| Misconception Coverage evaluator | New file under `evaluators/`, register in `registry.ts`. Consumes existing KG. Zero changes to KG schema or judge layer. |
| Multi-step evaluator pipelines (Option C internals) | The `Evaluator` interface stays the same; `factualAccuracy.ts` internally decomposes into claim-extraction → per-claim judgment → aggregation. `perItem[]` already accommodates per-claim output. |
| RAG over full NEC corpus | New `judge/ragJudge.ts` implementing the same `callJudge` interface; swap in via DI in evaluator constructors. |
| Content generation engine consuming eval output | Consumes the stable `EvaluationReport` JSON. Per-slot `perItem[]` lets it regenerate only broken slots. |
| Expert-agreement-rate measurement | Add labeled fixtures with expert verdicts; new `npm run measure:agreement` script that runs evaluators against them and reports per-evaluator agreement %. |

## Open Questions (deferred — not blocking v1)

- Which OpenAI model? Default to `gpt-4o` for v1; will benchmark vs. `gpt-4o-mini` on fixtures once the engine runs. Cheaper-model use is gated on agreement-rate measurement.
- KG seeding workflow for a *new* learning goal (post-v1, when we add lesson 2+). Likely a small authoring CLI later; out of v1 scope.
- Whether to persist eval reports for trend analysis once the generation engine is iterating. Out of v1 scope (no persistence).
