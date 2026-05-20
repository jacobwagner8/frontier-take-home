# Lesson Analytics — Design Spec

**Date:** 2026-05-20
**Status:** Approved
**Audience:** Take-home reviewer. Not student-facing.

## Goal

Track per-step engagement during a single lesson run and surface a summary panel on the completion screen, so a reviewer can see at a glance how the user moved through the lesson. The feature exists to demonstrate basic in-app monitoring; it is not part of the learner experience.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Where the view lives | Inline on `CompletionScreen` | Reviewer sees it immediately on finishing the lesson; no extra route. |
| Persistence | In-memory only | Resets on reload. Sufficient for a demo. No storage, history, or transmission. |
| Idle handling | Pause timer on `document.visibilityState === "hidden"` | Time-on-step reflects active attention, not wall clock. |
| Storage / transport | None | YAGNI. No analytics provider, no localStorage, no server calls. |

## Architecture

A single `useLessonAnalytics(step)` hook lives in `app/lesson/page.tsx` alongside the existing `useReducer(lessonReducer)`. It returns:

```ts
{
  snapshot: AnalyticsSnapshot;
  recordToggle: () => void;
  recordChatTurn: (surface: "remediation1" | "remediation2" | "finalRecap") => void;
  recordMcqAttempt: (mcqId: "mcq1" | "mcq2", isCorrect: boolean) => void;
}
```

The hook is the single source of truth for analytics state. The lesson reducer is unchanged — analytics are layered on, not woven into the state machine. Pages receive narrow event-recorder props and call them at the relevant interaction points.

### Step timing

The hook observes `step` via `useEffect`. On every transition, it closes the previous step's active-time bucket and opens a new one. A `visibilitychange` listener pauses the active bucket when the tab is hidden and resumes when visible.

**Step roll-up:** `remediation1` time accumulates into the `mcq1` bucket, and `remediation2` into `mcq2`. From the reviewer's perspective "time on Question 1" is one number across initial attempt + remediation + retry.

**Surfaced step buckets:** `reading1`, `mcq1`, `simulation`, `mcq2`, `voiceTutor`. `intro` and `done` are excluded — pre/post-lesson, not meaningful as engagement.

### Event sources

| Event | Where it fires |
|---|---|
| `recordMcqAttempt` | Called from the same handler in `app/lesson/page.tsx` that dispatches `ANSWER_MCQ`, so attempt counts stay in lockstep with reducer state |
| `recordToggle` | `SimulationScreen` `handleToggle` — every user-initiated state change counts (the toggle has no programmatic flips) |
| `recordChatTurn("remediation1" \| "remediation2")` | `FollowUpChat.send` — one increment per user `send()` call (one turn = one user message) |
| `recordChatTurn("finalRecap")` | `TextRecapChat.send` — same one-per-user-send semantics |

`FollowUpChat` does not know which remediation it's in, so the surface label is set by the parent (`RemediationScreen`) and passed as a prop.

## Data model

```ts
interface StepTime {
  step: "reading1" | "mcq1" | "simulation" | "mcq2" | "voiceTutor";
  activeMs: number;
}

interface McqStats {
  attempts: number;       // total clicks of an answer option
  wrongAttempts: number;  // attempts where isCorrect === false
  firstTryCorrect: boolean;
}

interface AnalyticsSnapshot {
  totalActiveMs: number;
  perStep: StepTime[];
  mcq1: McqStats;
  mcq2: McqStats;
  simulationToggles: number;
  chatTurns: {
    remediation1: number;
    remediation2: number;
    finalRecap: number;
  };
}
```

## UI

A new `<SessionMetrics snapshot={...} />` component rendered inside `CompletionScreen` below the existing "lesson complete" copy. Layout:

```
─ Session metrics ─────────────────────
  Total active time              3m 42s

  Time per step
    Reading                      1m 14s
    Question 1                     35s
    Simulation                     48s
    Question 2                     22s
    Voice / text recap           1m 03s

  Engagement
    Question 1 attempts         2 (1 wrong)
    Question 2 attempts         1 (first try ✓)
    Simulation toggles          3
    Remediation chat turns      2
    Final recap chat turns      5
```

Visual treatment matches the existing `bg-surface-muted rounded-2xl` block convention (same pattern as the "What changed?" and "Single bond" blocks). Section headings use the existing uppercase-tracked label style. Times format as `Hh Mm Ss` with leading components dropped when zero.

If a section is empty (e.g., user got both MCQs first-try, no chat turns), the rows still render with `0` rather than collapsing — the absence is itself information for the reviewer.

## Files

**New**
- `lib/useLessonAnalytics.ts` — hook + types + helpers
- `lib/formatDuration.ts` — `formatMs(ms): string` (extracted so it can be unit-tested independently)
- `components/SessionMetrics.tsx`
- `tests/useLessonAnalytics.test.ts`
- `tests/formatDuration.test.ts`
- `tests/SessionMetrics.test.tsx`

**Modified**
- `app/lesson/page.tsx` — instantiate hook, wire callbacks into screens, pass snapshot to `CompletionScreen`
- `components/CompletionScreen.tsx` — accept optional `snapshot` prop, render `<SessionMetrics />`
- `components/SimulationScreen.tsx` — accept optional `onToggle` callback, call from `handleToggle`
- `components/MCQuestionScreen.tsx` — accept optional `onAttempt(isCorrect)` callback
- `components/RemediationScreen.tsx` — accept optional `onChatTurn` callback, pass through to `FollowUpChat`
- `components/FollowUpChat.tsx` — accept optional `onSend` callback, call after `send()`
- `components/TextRecapChat.tsx` — accept optional `onSend` callback, call after `send()`
- `components/VoiceTutorScreen.tsx` — accept optional `onChatTurn` callback, pass to `TextRecapChat`

All new props are optional. Components stay usable in isolation (tests already mount them with minimal props).

## Testing

**`useLessonAnalytics.test.ts`**
- Step transitions close previous bucket and open new one
- `remediation1` time rolls into `mcq1` bucket
- Tab-hidden pause: timer does not advance while `visibilityState === "hidden"`
- Tab-visible resume: timer advances after `visibilitychange` back to `"visible"`
- `recordMcqAttempt` increments correctly; `wrongAttempts` only when `isCorrect === false`
- `firstTryCorrect` is true iff first attempt was correct
- `recordToggle` and `recordChatTurn` increment counters

Tests use Vitest fake timers and stub `document.visibilityState` / dispatch `visibilitychange` events.

**`formatDuration.test.ts`**
- `0ms → "0s"`, `12_000ms → "12s"`, `72_000ms → "1m 12s"`, `3_725_000ms → "1h 2m 5s"`

**`SessionMetrics.test.tsx`**
- Renders all expected rows given a fixed snapshot
- Shows "first try ✓" when `firstTryCorrect && wrongAttempts === 0`
- Shows `"N (M wrong)"` format when `wrongAttempts > 0`

## Out of scope

- localStorage persistence or run history
- Sending metrics off-device (no provider, no fetch, no beacon)
- Multi-run comparison
- Per-message content capture, token counts, latency
- Charts or visualizations beyond labeled rows
- A separate `/analytics` route
- Privacy / opt-out UI (no PII is captured; in-memory only)

## Risks

- **`visibilitychange` reliability in tests:** jsdom does not fire `visibilitychange` on `document.visibilityState` reassignment. Tests will need to set the property and dispatch the event manually. Plan to wrap the visibility read in a tiny helper so it can be stubbed cleanly.
- **Stale-closure timer bugs in the hook:** the active-bucket and visibility logic both touch the same accumulator. Plan to keep the timing state in a `useRef` and only push to React state on flush, so React rerenders don't lose mid-step accumulation.
- **Optional-callback fan-out:** five components grow optional props. To prevent drift, callsites in `app/lesson/page.tsx` are the only place these are wired in production; default behavior with `undefined` callbacks is exercised by the existing component tests.
