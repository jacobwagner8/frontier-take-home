# Skip Lesson Intro — Design Spec

**Date:** 2026-05-20
**Status:** Approved
**Audience:** Take-home reviewer.

## Goal

Remove the lesson's intro screen ("Let's get started. This will take about 5-10 minutes." + Begin button). The dashboard entry at `/` already frames the lesson with title, duration, and a Start CTA — the intro is now a redundant extra click. Clicking "Start lesson →" should land directly on the reading screen.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Approach | Remove `intro` from the state machine entirely | Smaller machine, no dead UI branches, same behavior on direct `/lesson` visits. |
| Initial state | `{ step: "reading1" }` | First content step. |
| `reading1` Back button | Removed (no upstream destination) | Lesson page already gates Back on `backTargets[step]` existing; no UI change beyond the data table. |
| `RESTART_LESSON` target | Now lands on `reading1` instead of `intro` | One fewer click to restart. Matches the new entry flow. |

## Files

**Modified**

- `lib/lessonMachine.ts`
  - Drop `"intro"` from the `LessonStep` union.
  - Change `initialLessonState` to `{ step: "reading1" }`.
  - Drop `"intro"` from `linearOrder`.
  - Drop the `reading1: "intro"` entry from `backTargets` (table key gone — reading1 simply has no back).
  - Update the inline comment on `backTargets` so it no longer references `intro`.
  - `progressFor` already handles unknown steps by returning `current: 0`, so the intro-specific test case can simply be dropped without code changes.
- `app/lesson/page.tsx`
  - Delete the `{state.step === "intro" && (...)}` render branch in full.
- `lib/useLessonAnalytics.ts`
  - In `timedStepFor`, change `if (step === "intro" || step === "done") return null;` to `if (step === "done") return null;`. Same behavior, narrower predicate.
- `tests/useLessonAnalytics.test.ts`
  - "starts with a zeroed snapshot" test (line ~7): replace `useLessonAnalytics("intro")` with `useLessonAnalytics("done")`. The test asserts an empty-snapshot baseline — any step that `timedStepFor` returns `null` for works; `done` is the remaining one.
  - "excludes intro and done from perStep" test (line ~195): rename to "excludes done from perStep". Drop the `intro` initial-step transition; start at `"reading1"` and verify time accumulates there, then rerender to `"done"` and verify no `done` bucket appears.
- `tests/lessonMachine.test.ts`
  - "starts at intro" → "starts at reading1" — assert `initialLessonState.step === "reading1"`.
  - Delete "intro → reading1 on ADVANCE" — no longer reachable.
  - "RESTART_LESSON returns to intro from any step" → "returns to reading1 from any step".
  - Remove the `["reading1", "intro"]` row from the back-target parameterized table (reading1 now has no back target; the existing "no-op when no back target" coverage is sufficient).
  - Remove the `linearOrder` entry for `"intro"` if asserted directly.
  - Delete the `progressFor("intro") returns 0/7` test (step no longer exists in the type).

**Unchanged**

- `app/page.tsx` (dashboard), `LessonShell`, the curriculum content, simulation, voice tutor, completion screen, analytics.

## Testing

- `npm run test:run` — adjusted suite passes (expected count: 90 minus 2-3 dropped intro-specific tests, depending on exact assertion granularity).
- `npm run build` — typecheck must still pass after the `LessonStep` union narrows.
- Manual smoke: load `/`, click `Start lesson →`, confirm the reading screen renders immediately with no intermediate "Let's get started" frame. Then restart from the completion screen and confirm the same.

No new automated tests needed — this is a removal, not an addition. Existing coverage of the linear flow (`reading1 → mcq1 → ... → done`) continues to exercise the lesson's whole spine.

## Behavioral consequences

- Direct visits to `/lesson` (refresh, bookmark) also skip the intro — they now open on the reading screen. Same outcome as clicking from the dashboard; no special-case routing.
- Per-step analytics buckets (`reading1`, `mcq1`, etc.) are unaffected. `intro` was already excluded from `progressFor`'s `visible` array, so no analytics change.

## Out of scope

- No changes to the dashboard, curriculum, or any other lesson screen.
- No new entry routes, no query params, no auto-advance effects.
- No changes to `progressFor`'s `total` count (it's already 7 visible content steps; the intro was never counted).

## Risks

- **TypeScript exhaustiveness:** narrowing `LessonStep` could surface latent `switch` non-exhaustive warnings if any file casts or compares against the literal `"intro"`. Mitigation: run `npm run build` (which typechecks) and grep for stray `"intro"` literals before declaring done.
