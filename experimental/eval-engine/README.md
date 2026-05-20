# Eval Engine (experimental)

Validates AI-generated lesson content against a structured Knowledge Graph for (a) factual correctness and (b) learning-goal coverage. Modelled on the Chan Zuckerberg Initiative's [Learning Commons](https://docs.learningcommons.org/) evaluator + Knowledge Graph architecture.

See `docs/superpowers/specs/2026-05-20-eval-engine-design.md` for the design.

**Status:** v1 is feature-complete and green (50/50 mocked tests passing). Ships the KG loader, two evaluators (`factualAccuracy`, `learningGoalCoverage`), the orchestrator + fail-closed verdict policy, an OpenAI judge with structured output and one retry, a CLI, and markdown reports. Ready to be driven by a content-generation engine — see [Using the engine from a content generator](#using-the-engine-from-a-content-generator) below.

## What's here

- `kg/` — Knowledge Graph: typed nodes (`LearningGoal`, `AtomicFact`, `Misconception`, `SourceExcerpt`) loaded from JSON files at startup. Hand-authored, seeded from NEC 2023 / Mike Holt sources.
- `evaluators/` — One evaluator per rubric dimension. v1 ships `factualAccuracy` and `learningGoalCoverage`. Each returns a multi-component structured `EvaluatorResult` (rating + reasoning + per-item verdicts + items needing human review).
- `judge/` — Thin OpenAI wrapper using `zodResponseFormat` for structured output. Mockable for tests.
- `orchestrator/` — Resolves the KG subgraph for a learning goal, dispatches evaluators in parallel, applies the fail-closed verdict policy.
- `reports/` — Markdown renderer for human reading. The JSON shape is the orchestrator's `EvaluationReport` type — the same object a content generator consumes programmatically (see [below](#using-the-engine-from-a-content-generator)).
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
```

> **Note:** `--curriculum <path>` dynamically imports the file you point at, which executes any top-level code in it. Only pass paths you trust. The `--fixture <name>` form is restricted to files under `experimental/eval-engine/fixtures/`.

```

# Live integration tests (~$0.50–2 per run)
npm run test:eval
```

## Verdict policy

Fail-closed: a run **passes** only when every evaluator returns rating ≥ 3 AND there are zero `contradicted-unexpected` items. Unsupported claims surface as `unsureItems` (decision-support) but do not auto-fail — a human chooses between extending the KG with a cited fact or removing the claim.

Exit codes:
- `0` — lesson passed
- `1` — lesson failed evaluation
- `2` — engine error (network, malformed judge response, KG validation, missing key)

## Using the engine from a content generator

The eval engine is a pure consumer-facing library: a generator hands it a `Curriculum` and a `learningGoalId`, and gets back a structured `EvaluationReport` that's actionable per-slot (which MCQ option, which reading body, which grounding fact failed and why).

The intended generation loop:

```ts
import { runEvaluation } from "@/experimental/eval-engine/orchestrator/runEvaluation";
import { loadKGFromDisk } from "@/experimental/eval-engine/kg";

const kg = loadKGFromDisk(); // load once, reuse across attempts
const goalId = "lg.ng-bonding-one-point";

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const curriculum = await generateCurriculum(goalId, { feedback: lastReport });
  const report = await runEvaluation(curriculum, goalId, { kg });

  if (report.overallVerdict.pass) {
    return curriculum; // ship it
  }

  // Failed: per-slot verdicts point at exactly what to regenerate
  lastReport = report;
}
throw new Error(`Could not produce a passing lesson for ${goalId} in ${MAX_ATTEMPTS} attempts`);
```

What the generator gets to act on:

- **`report.overallVerdict.pass`** — single boolean go/no-go. `pass` requires every evaluator rating ≥ 3 *and* zero `contradicted-unexpected` items.
- **`report.evaluatorResults[i].perItem`** — each entry is a `{ target, verdict, reasoning, citedKGNodeIds, confidence }`. `target` is a structured `SlotInstance` (see `evaluators/types.ts:CurriculumSlotId`) identifying the exact field — e.g. `{ kind: "mcqOption", mcqId, optionId, isCorrect, field }` — so the regenerator can rewrite just that slot instead of the whole lesson.
- **`report.evaluatorResults[i].unsureItems`** — claims the judge couldn't verify against the KG. These do *not* fail the lesson; they're a queue for a human (or a separate "extend the KG" agent) to choose between adding a cited fact or removing the claim.
- **`citedKGNodeIds`** — the AtomicFacts / SourceExcerpts the judge based each verdict on, so the regenerator can stay grounded in the same sources rather than drifting.

The KG also doubles as a *generation* input, not just a check: a generator can pull `kg.factsTaughtBy(goalId)`, `kg.misconceptionsAddressedBy(goalId)`, and `kg.excerptsCitedBy(factId)` to assemble a grounded prompt before generation, then use the eval engine as the verifier. This is the same context the evaluators see, which is what makes the loop converge — the generator and judge agree on what "correct for this goal" means.

Exit-code contract is stable for use as a subprocess too: `0` pass / `1` fail / `2` engine error (see [Verdict policy](#verdict-policy)).

## Extending

- New evaluator: add a file in `evaluators/`, register it in `evaluators/registry.ts`. The shared `Evaluator<TLabel>` interface gives you typed multi-component output.
- New learning goal: drop new JSON node files into `kg/learning-goals/`, `kg/atomic-facts/`, `kg/misconceptions/`, `kg/sources/`. The loader validates on startup; missing references error loudly with the offending id.
- Swap OpenAI for a different provider (or add RAG): replace `judge/openaiJudge.ts` with another implementation of the `callJudge` function signature. Evaluators do not change.

## Non-goals for v1

- No content generation engine in this package — the eval engine is the verifier half of the loop sketched in [Using the engine from a content generator](#using-the-engine-from-a-content-generator).
- No Misconception Coverage evaluator yet — designed to slot into the same interface in v2.
- No persistence of past eval runs.
- No expert-agreement-rate measurement (requires labeled expert-judged fixtures we don't have).
- No RAG over full NEC corpus — KG + AtomicFacts is the grounding mechanism for v1.
