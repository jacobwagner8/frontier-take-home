# Inline MCQ Remediation — Design Spec

**Date:** 2026-05-20
**Status:** Approved
**Audience:** Take-home reviewer / future maintainer.

## Goal

Collapse the separate remediation page into the multiple-choice screen so the wrong-answer explanation appears beneath the radio group rather than on a new route. On a correct answer, show a positive note and a per-MCQ rationale on the same screen and relabel the primary action from **Submit** to **Next**. The intent is to keep the learner's context (question + options) visible while they read the explanation, instead of context-switching to a separate page.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Wrong-answer flow | Inline explanation + **Try again** button (clears selection, returns to picking) | Preserves today's retry pedagogy; the only thing changing is layout, not learning loop. |
| Correct-answer copy source | New required `rationale: string` on the `MCQ` type, authored per question | Curriculum data is the single source of truth; reviewable in code. |
| Correct-answer flow | Inline rationale + **Next** button that advances the lesson | Replaces the implicit "advance on correct" with an explicit confirmation step so the learner reads the rationale before moving on. |
| Follow-up chat | Stays inline, anchored next to **Try again** when the wrong option has a `misconceptionTag` | The misconception chat is the only entry point to `FollowUpChat`; dropping it would orphan the feature. |
| Dispatch contract | `MCQuestionScreen` only calls `onAnswer` on **Next** (correct path); wrong attempts use a new `onWrongAttempt(opt)` callback for analytics | Keeps the reducer's `ANSWER_MCQ` action a pure "advance" signal; wrong selections never enter the state machine. |
| State machine | Drop `remediation1 / remediation1b / remediation1c / remediation2` from `LessonStep`, the reducer, and `progressFor` | Remediation is no longer a page, so it has no place in the linear step graph. |
| Analytics chat-surface keys | Keep `remediation1 / remediation1b / remediation1c / remediation2` as `ChatSurface` labels | They are internal telemetry keys; `SessionMetrics` sums them and a rename would churn snapshot stability for no learner-facing gain. |
| `RemediationScreen.tsx` | Delete | Its behavior moves entirely into `MCQuestionScreen`. |

## Architecture

### Component: `MCQuestionScreen`

Today's local state is `selectedId: string | null`. It grows to two pieces of state:

```ts
const [selectedId, setSelectedId] = useState<string | null>(null);
const [submittedId, setSubmittedId] = useState<string | null>(null);
```

The conceptual phase is derived, not stored:

- `submittedId === null` → **picking**
- `submittedId !== null && option.isCorrect === false` → **wrong**
- `submittedId !== null && option.isCorrect === true` → **correct**

Rendering rules by phase:

| Element | picking | wrong | correct |
|---|---|---|---|
| Radio group | enabled | disabled, submitted option highlighted danger | disabled, submitted option highlighted success |
| Inline panel beneath radios | hidden | wrong option's `remediation` | MCQ's `rationale` with a "Correct" header |
| Primary button | **Submit** (disabled until selection) | **Try again** (resets to picking, clears `selectedId` + `submittedId`) | **Next** (calls `onAnswer(submittedOption)`) |
| Secondary button | — | **Ask a follow-up** when the wrong option has a `misconceptionTag` | — |
| `FollowUpChat` | — | rendered below the panel when open | — |
| Back button (via `LessonFooter`) | visible if `onBack` provided | visible if `onBack` provided | hidden — selection is already submitted; the next step is `Next` |

Submit handler flow:

1. Resolve the chosen option from `selectedId`.
2. Call `onWrongAttempt(opt)` if wrong, OR remember `submittedId` for the correct case.
3. In either case, set `submittedId = selectedId`. Do not call `onAnswer` here.
4. `onAnswer(opt)` is called only by the **Next** click handler in the correct phase.

`Try again` clears both `selectedId` and `submittedId`, returning to `picking`.

### Component: `RemediationScreen.tsx`

Deleted. No callers remain after `app/lesson/page.tsx` is updated.

### Data: `lib/curriculum.types.ts` and `lib/curriculum.ts`

Add `rationale: string` (required) to `MCQ`:

```ts
export interface MCQ {
  id: string;
  prompt: string;
  options: MCQOption[];
  rationale: string;
}
```

Author rationale copy for `mcq1`, `mcq1b`, `mcq1c`, `mcq2`. Each rationale should be 2–4 sentences, electrically accurate, and oriented around *why the chosen path is correct* rather than restating the prompt. Reviewable as part of the PR; reviewer (Jacob) can request edits to copy without touching the structural change.

### State machine: `lib/lessonMachine.ts`

`LessonStep` shrinks:

```ts
export type LessonStep =
  | "intro"
  | "reading1"
  | "mcq1"
  | "mcq1b"
  | "mcq1c"
  | "simulation"
  | "mcq2"
  | "voiceTutor"
  | "done";
```

Reducer changes:
- `ANSWER_MCQ` always advances via `nextLinear(state.step)`. The `option.isCorrect` branch and `REMEDIATION_FOR` table are deleted, as is the `remediationRetry` table inside `ADVANCE`.
- `lastWrongOptionId` field is removed from `LessonState` (no consumers remain).
- `backTargets` is unchanged (none of the dropped steps had a back target).

`progressFor()` loses the `remediationOf` table. The `visible` array is unchanged; the function simplifies to a direct `indexOf` against `visible`.

### Page: `app/lesson/page.tsx`

- All four `state.step === "remediationX"` blocks are deleted.
- Each `MCQuestionScreen` gains an `onWrongAttempt` prop that calls `analytics.recordMcqAttempt(mcqId, false)`. The existing `onAnswer` simplifies to record-correct + dispatch:
  ```ts
  onAnswer={(opt) => {
    analytics.recordMcqAttempt("mcq1", true);
    dispatch({ type: "ANSWER_MCQ", mcqId: "mcq1", optionId: opt.id });
  }}
  onWrongAttempt={() => analytics.recordMcqAttempt("mcq1", false)}
  onChatTurn={() => analytics.recordChatTurn("remediation1")}
  ```
- The `onChatTurn` prop moves from `RemediationScreen` to `MCQuestionScreen` and continues to use the existing `remediation*` `ChatSurface` keys.

### Analytics: `lib/useLessonAnalytics.ts`

- `timedStepFor` loses the `REMEDIATION_PARENT` rollup since `LessonStep` no longer contains remediation steps. The function simplifies to: `intro / done → null`, otherwise check membership in `TIMED_STEP_ORDER`.
- `REMEDIATION_PARENT` constant is deleted.
- `ChatSurface` union is unchanged.
- No change to the `AnalyticsSnapshot` shape — `SessionMetrics`' "Remediation chat turns" row continues to sum the four `remediation*` buckets.

## Error handling

There are no async boundaries in this flow. The only edge cases:

- User clicks Submit with no selection — already prevented by the disabled-button state.
- User triggers a state transition while `FollowUpChat` is open — closing chat is handled by `FollowUpChat`'s own `onClose`; the `chatOpen` boolean is local to `MCQuestionScreen` and resets when the component unmounts on advance.
- A wrong option without a `misconceptionTag` — the **Ask a follow-up** button simply doesn't render, matching today's behavior.

## Testing

### Unit tests

- `lessonMachine.test.ts`
  - Delete all `remediation*` cases (state transitions, GO_BACK no-ops, progress rollups).
  - Update `ANSWER_MCQ` tests: wrong answer for `mcq1`/`mcq1b`/`mcq1c`/`mcq2` advances to the next step (same as correct).
  - Update `progressFor` tests: remove the four "collapses remediationX onto mcqX" cases.
- `MCQuestionScreen.test.tsx`
  - Existing Back-button tests continue to pass.
  - New: submitting a wrong option renders its `remediation` text inline, disables radios, shows **Try again**, and does NOT call `onAnswer`.
  - New: submitting a wrong option calls `onWrongAttempt` exactly once with the chosen option.
  - New: **Try again** re-enables radios, clears selection, and hides the remediation panel.
  - New: submitting the correct option renders the MCQ's `rationale` inline, disables radios, shows **Next**, and calls `onAnswer` only when **Next** is clicked.
  - New: wrong option with a `misconceptionTag` renders an **Ask a follow-up** button that opens `FollowUpChat` inline; the close handler hides it.
- `useLessonAnalytics.test.ts`
  - If any test asserts the `remediation*` → `mcq*` time rollup, delete it (the steps no longer exist).
  - Otherwise unchanged.

### Manual smoke (golden path + edges)

- Pick the correct answer on mcq1 → rationale appears with **Next** → clicking advances to mcq1b. Selected option remains highlighted with success styling.
- Pick a wrong answer on mcq1b → remediation appears, radios disabled, **Try again** + **Ask a follow-up** visible. Click **Try again** → state resets; pick correct → advance.
- Open follow-up chat on a wrong answer, send a message → `SessionMetrics` "Remediation chat turns" increments. Close chat → state preserved (still on wrong phase with **Try again** visible). Pick correct → advance.
- Back button works at the start of an MCQ (phase = picking); not relevant once submitted.

## Out of scope

- Visual polish on the inline panels (color tokens beyond reusing `danger` / `brand-soft`). The structural change ships first; styling refinements can follow.
- Auto-advance on correct (e.g., a 2-second timer). The user explicitly chose an explicit **Next** click so the learner reads the rationale.
- Persisting wrong-answer state across browser reloads.
- Changing the misconception-chat experience itself — only its anchor point moves.
