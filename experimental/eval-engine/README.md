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
