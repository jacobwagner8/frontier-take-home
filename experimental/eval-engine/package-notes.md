# New dependencies introduced by experimental/eval-engine

| Package | Why | Used in |
|---|---|---|
| `openai` (^4.55) | Structured-output judge calls via `zodResponseFormat`. The existing app uses raw `fetch` for its chat route; the eval engine prefers the SDK for type-safe parsed responses. | `judge/openaiJudge.ts` |
| `zod` (^3.23) | Runtime validation of KG JSON files at load time, and judge response schemas. | `kg/schemas.ts`, `evaluators/*` |
| `tsx` (^4) | Run the CLI without a build step (`npx tsx experimental/eval-engine/cli/eval.ts ...`). | `cli/eval.ts` |

All three are isolated to `/experimental/`. Production code (`app/`, `lib/`, `components/`) does not import them.
