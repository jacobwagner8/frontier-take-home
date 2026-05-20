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
