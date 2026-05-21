# Inline MCQ Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move wrong-answer remediation and correct-answer rationale into `MCQuestionScreen` so they render inline beneath the radio group rather than on a separate page. After Submit, the wrong-answer flow gets **Try again** + optional **Ask a follow-up**; the correct-answer flow gets a positive **Correct** panel and the Submit button relabels to **Next**.

**Architecture:** `MCQuestionScreen` becomes a small phase machine (`picking | wrong | correct`) using two local `useState`s (`selectedId`, `submittedId`). The lesson reducer's `ANSWER_MCQ` action simplifies to "always advance" because the MCQ only dispatches when the learner clicks **Next** on a correct answer. Wrong attempts are reported via a new `onWrongAttempt(opt)` callback so analytics still records them without involving the state machine. The `remediation*` lesson steps are removed; `RemediationScreen.tsx` is deleted.

**Tech Stack:** Next.js (this repo's pinned version — see `node_modules/next/dist/docs/` per `AGENTS.md`), React 19, Tailwind, Vitest, React Testing Library, `@testing-library/user-event`, `@testing-library/jest-dom`. No new dependencies.

---

## File Structure

**Modified files**

| Path | Change |
|---|---|
| `lib/curriculum.types.ts` | Add required `rationale: string` to `MCQ`. |
| `lib/curriculum.ts` | Add `rationale` strings to `mcq1`, `mcq1b`, `mcq1c`, `mcq2`. |
| `components/MCQuestionScreen.tsx` | Absorb inline wrong/correct UI. New props: `onWrongAttempt`, `onChatTurn`. `onAnswer` now fires only on the Next click. |
| `app/lesson/page.tsx` | Drop the four `state.step === "remediationX"` blocks. Each MCQ instance gains `onWrongAttempt` + `onChatTurn` props. Remove `RemediationScreen` import. |
| `lib/lessonMachine.ts` | Drop `remediation1 / remediation1b / remediation1c / remediation2` from `LessonStep`. Remove `REMEDIATION_FOR`, the `remediationRetry` table, and `lastWrongOptionId`. Simplify `ANSWER_MCQ` to always advance and `progressFor` to drop the rollup. |
| `lib/useLessonAnalytics.ts` | Drop `REMEDIATION_PARENT` and the rollup in `timedStepFor`. `ChatSurface` and `AnalyticsSnapshot` shapes unchanged. |
| `tests/curriculum.test.ts` | New: every MCQ has a non-empty `rationale`. |
| `tests/MCQuestionScreen.test.tsx` | New tests for inline wrong/correct phases and follow-up chat. Existing Back tests unchanged. |
| `tests/lessonMachine.test.ts` | Drop all `remediation*` cases. Update `ANSWER_MCQ` tests so wrong answers also advance. Drop progress rollup cases. |
| `tests/useLessonAnalytics.test.ts` | Drop the "rolls remediation1 time into mcq1" test. Update the chat-turn test to call the hook with a valid `LessonStep`. |

**Deleted files**

| Path | Reason |
|---|---|
| `components/RemediationScreen.tsx` | Behavior moves entirely into `MCQuestionScreen`. |

---

## Task 1: Add `rationale` to MCQ type and curriculum data

**Files:**
- Modify: `lib/curriculum.types.ts`
- Modify: `lib/curriculum.ts`
- Modify: `tests/curriculum.test.ts`

This task is data + types only. No UI consumes `rationale` yet, so the existing UI keeps working after this lands.

- [ ] **Step 1: Add a failing curriculum test for `rationale`**

Add a new `it` block to `tests/curriculum.test.ts` after the existing wrong-option check:

```ts
it("every MCQ has a non-empty rationale", () => {
  for (const mcq of allMcqs) {
    expect(mcq.rationale, `${mcq.id}`).toBeTruthy();
    expect(mcq.rationale.length, `${mcq.id}`).toBeGreaterThan(20);
  }
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run tests/curriculum.test.ts`
Expected: FAIL — `rationale` is `undefined` on every MCQ.

- [ ] **Step 3: Add `rationale` to the `MCQ` interface**

Edit `lib/curriculum.types.ts` so the `MCQ` interface reads:

```ts
export interface MCQ {
  id: string;
  prompt: string;
  options: MCQOption[];
  rationale: string;
}
```

- [ ] **Step 4: Author rationale copy for all four MCQs**

Edit `lib/curriculum.ts`. Add a `rationale` field to each of `mcq1`, `mcq1b`, `mcq1c`, `mcq2`, placed after the `options` array.

For `mcq1`:

```ts
rationale: `Exactly one bond, at the service disconnect — that's NEC 250.24(A). That single point gives every fault one defined low-impedance path back to the utility transformer, and keeps normal return current entirely on the neutral. Anywhere else (or everywhere), and the EGC starts carrying load current it was never sized for — exactly what NEC 250.142 prohibits.`,
```

For `mcq1b`:

```ts
rationale: `The metallic path from faulted case → EGC → main bonding jumper → service neutral → utility transformer is what turns a hot-to-case fault into a short circuit. That low-impedance return drives hundreds or thousands of amps and trips a 15 or 20 A breaker in milliseconds. The bond is what makes the breaker effective for ground faults; without it, even an intact breaker can't see the fault.`,
```

For `mcq1c`:

```ts
rationale: `Under normal load the EGC carries no current at all. With the system bonded only at the service disconnect, downstream neutral and EGC are kept on separate buses, so return current has no electrical path onto the EGC. It comes alive only when a hot conductor accidentally touches grounded metal — briefly, long enough to trip the breaker — and then returns to zero.`,
```

For `mcq2`:

```ts
rationale: `A second bond creates a parallel return path: load current can now return either through the neutral or through the EGC plus every bonded raceway and metal box. It divides between the two by their relative impedances, so the EGC carries continuous current it wasn't sized or insulated for. Voltage drops along that grounded metal show up as touch voltage between surfaces that should all sit at the same potential — the exact hazard the single-bond rule prevents.`,
```

- [ ] **Step 5: Run all tests to verify they pass**

Run: `npx vitest run`
Expected: all 89+ tests pass. The new curriculum test passes; nothing else regresses.

- [ ] **Step 6: Run `tsc` to verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors. (`MCQ` is consumed only via `curriculum.ts` and component props that don't yet read `rationale`.)

- [ ] **Step 7: Commit**

```bash
git add lib/curriculum.types.ts lib/curriculum.ts tests/curriculum.test.ts
git commit -m "Add rationale field to MCQ and author per-question copy"
```

---

## Task 2: Inline wrong-answer remediation in `MCQuestionScreen`

**Files:**
- Modify: `components/MCQuestionScreen.tsx`
- Modify: `tests/MCQuestionScreen.test.tsx`

Add a new local phase. Submitting a wrong option renders its `remediation` inline, disables the radios, shows **Try again**, and (when the option has a `misconceptionTag`) shows **Ask a follow-up** that opens `FollowUpChat`. **The component does NOT call `onAnswer` on a wrong submit.**

- [ ] **Step 1: Write failing tests for the wrong-answer flow**

Add these tests at the bottom of `tests/MCQuestionScreen.test.tsx`. Keep the existing Back-button tests intact.

```ts
describe("MCQuestionScreen wrong-answer inline flow", () => {
  it("renders remediation text inline when a wrong option is submitted", async () => {
    const user = userEvent.setup();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAnswer={() => {}}
        onWrongAttempt={() => {}}
      />,
    );
    const wrong = curriculum.mcq1.options.find((o) => !o.isCorrect)!;
    await user.click(screen.getByLabelText(wrong.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(
      screen.getByText(wrong.remediation as string, { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("calls onWrongAttempt with the chosen option and does NOT call onAnswer", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    const onWrongAttempt = vi.fn();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAnswer={onAnswer}
        onWrongAttempt={onWrongAttempt}
      />,
    );
    const wrong = curriculum.mcq1.options.find((o) => !o.isCorrect)!;
    await user.click(screen.getByLabelText(wrong.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(onWrongAttempt).toHaveBeenCalledTimes(1);
    expect(onWrongAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ id: wrong.id }),
    );
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("disables radios after a wrong submit until Try again is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAnswer={() => {}}
        onWrongAttempt={() => {}}
      />,
    );
    const wrong = curriculum.mcq1.options.find((o) => !o.isCorrect)!;
    await user.click(screen.getByLabelText(wrong.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }

    await user.click(screen.getByRole("button", { name: /try again/i }));

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).not.toBeDisabled();
    }
    expect(
      screen.queryByText(wrong.remediation as string, { exact: false }),
    ).not.toBeInTheDocument();
  });

  it("renders Ask a follow-up only when the wrong option has a misconceptionTag", async () => {
    const user = userEvent.setup();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAnswer={() => {}}
        onWrongAttempt={() => {}}
      />,
    );
    const taggedWrong = curriculum.mcq1.options.find(
      (o) => !o.isCorrect && o.misconceptionTag,
    )!;
    await user.click(screen.getByLabelText(taggedWrong.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(
      screen.getByRole("button", { name: /ask a follow-up/i }),
    ).toBeInTheDocument();
  });
});
```

Required new imports at the top of the test file (if not already present):

```ts
import { vi } from "vitest";
```

(The file already imports `vi` — verify and skip if so.)

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run tests/MCQuestionScreen.test.tsx`
Expected: the four new tests FAIL — the component still calls `onAnswer` on every submit and has no `onWrongAttempt` prop.

- [ ] **Step 3: Replace `MCQuestionScreen.tsx` with the inline-phase implementation**

Replace the entire contents of `components/MCQuestionScreen.tsx` with:

```tsx
"use client";

import { useId, useState } from "react";
import type { MCQ, MCQOption } from "@/lib/curriculum.types";
import { LessonFooter } from "./LessonFooter";
import { FollowUpChat } from "./FollowUpChat";

interface Props {
  mcq: MCQ;
  onAnswer: (option: MCQOption) => void;
  onWrongAttempt?: (option: MCQOption) => void;
  onChatTurn?: () => void;
  onBack?: () => void;
}

export function MCQuestionScreen({
  mcq,
  onAnswer,
  onWrongAttempt,
  onChatTurn,
  onBack,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const promptId = useId();

  const submitted = submittedId
    ? (mcq.options.find((o) => o.id === submittedId) ?? null)
    : null;
  const phase: "picking" | "wrong" | "correct" =
    submitted === null ? "picking" : submitted.isCorrect ? "correct" : "wrong";

  function handleSubmit() {
    const opt = mcq.options.find((o) => o.id === selectedId);
    if (!opt) return;
    setSubmittedId(opt.id);
    if (!opt.isCorrect) onWrongAttempt?.(opt);
  }

  function handleTryAgain() {
    setSelectedId(null);
    setSubmittedId(null);
    setChatOpen(false);
  }

  function handleNext() {
    if (submitted && submitted.isCorrect) onAnswer(submitted);
  }

  return (
    <section className="flex flex-col gap-5">
      <h2
        id={promptId}
        className="text-xl font-semibold text-text-strong leading-snug tracking-[-0.005em]"
      >
        {mcq.prompt}
      </h2>
      <div
        role="radiogroup"
        aria-labelledby={promptId}
        className="flex flex-col gap-2.5"
      >
        {mcq.options.map((opt) => {
          const isSelected = selectedId === opt.id;
          const isSubmitted = submittedId === opt.id;
          let visual = "border-border bg-surface hover:bg-canvas";
          if (phase === "picking" && isSelected) {
            visual = "border-brand bg-brand-soft/40";
          } else if (isSubmitted && phase === "wrong") {
            visual = "border-danger bg-danger/5";
          } else if (isSubmitted && phase === "correct") {
            visual = "border-brand bg-brand-soft/40";
          }
          return (
            <label
              key={opt.id}
              className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl border text-[15px] transition-colors ${visual} ${
                phase === "picking" ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <input
                type="radio"
                name={mcq.id}
                value={opt.id}
                checked={isSelected}
                disabled={phase !== "picking"}
                onChange={() => setSelectedId(opt.id)}
                className="accent-brand w-4 h-4"
              />
              <span className="text-text">{opt.text}</span>
            </label>
          );
        })}
      </div>

      {phase === "wrong" && submitted && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-3 p-4 rounded-2xl bg-danger/5 border border-danger/20"
        >
          <div className="text-[11px] uppercase tracking-[0.08em] text-danger font-semibold">
            Not quite
          </div>
          <p className="text-[15px] leading-[1.6] text-text whitespace-pre-wrap">
            {submitted.remediation}
          </p>
        </div>
      )}

      {phase === "correct" && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-3 p-4 rounded-2xl bg-brand-soft/40 border border-brand/30"
        >
          <div className="text-[11px] uppercase tracking-[0.08em] text-brand font-semibold">
            Correct
          </div>
          <p className="text-[15px] leading-[1.6] text-text whitespace-pre-wrap">
            {mcq.rationale}
          </p>
        </div>
      )}

      <LessonFooter onBack={phase === "picking" ? onBack : undefined}>
        {phase === "picking" && (
          <button
            type="button"
            disabled={!selectedId}
            onClick={handleSubmit}
            className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)] disabled:bg-border disabled:text-text-subtle disabled:shadow-none disabled:cursor-not-allowed"
          >
            Submit
          </button>
        )}
        {phase === "wrong" && (
          <div className="flex gap-2">
            {submitted?.misconceptionTag && (
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="px-4 py-3 rounded-2xl border border-border text-text-strong font-medium hover:bg-canvas"
              >
                Ask a follow-up
              </button>
            )}
            <button
              type="button"
              onClick={handleTryAgain}
              className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
            >
              Try again
            </button>
          </div>
        )}
        {phase === "correct" && (
          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
          >
            Next
          </button>
        )}
      </LessonFooter>

      {chatOpen && submitted?.misconceptionTag && (
        <FollowUpChat
          misconceptionTag={submitted.misconceptionTag}
          onClose={() => setChatOpen(false)}
          onUserSent={onChatTurn}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify the new wrong-answer tests pass**

Run: `npx vitest run tests/MCQuestionScreen.test.tsx`
Expected: all existing tests + the four new wrong-answer tests pass.

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors yet, because `app/lesson/page.tsx` only passes `mcq` / `onAnswer` / `onBack`, all of which still exist on the new component.

- [ ] **Step 6: Commit**

```bash
git add components/MCQuestionScreen.tsx tests/MCQuestionScreen.test.tsx
git commit -m "Render wrong-answer remediation inline in MCQuestionScreen"
```

---

## Task 3: Inline correct-answer rationale and Next button

**Files:**
- Modify: `tests/MCQuestionScreen.test.tsx`

The implementation already landed in Task 2 (the same component handles all three phases). This task adds the test coverage for the correct path.

- [ ] **Step 1: Add failing tests for the correct-answer flow**

Append to `tests/MCQuestionScreen.test.tsx`:

```ts
describe("MCQuestionScreen correct-answer inline flow", () => {
  it("renders the MCQ's rationale and a Next button when correct is submitted", async () => {
    const user = userEvent.setup();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAnswer={() => {}}
        onWrongAttempt={() => {}}
      />,
    );
    const correct = curriculum.mcq1.options.find((o) => o.isCorrect)!;
    await user.click(screen.getByLabelText(correct.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(
      screen.getByText(curriculum.mcq1.rationale, { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /next/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /submit/i }),
    ).not.toBeInTheDocument();
  });

  it("does NOT call onAnswer on the Submit click; calls it only on Next", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAnswer={onAnswer}
        onWrongAttempt={() => {}}
      />,
    );
    const correct = curriculum.mcq1.options.find((o) => o.isCorrect)!;
    await user.click(screen.getByLabelText(correct.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(onAnswer).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ id: correct.id, isCorrect: true }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/MCQuestionScreen.test.tsx`
Expected: all MCQuestionScreen tests pass (the component implementation from Task 2 already supports this; this task is test coverage only).

- [ ] **Step 3: Commit**

```bash
git add tests/MCQuestionScreen.test.tsx
git commit -m "Cover correct-answer inline rationale + Next in MCQuestionScreen tests"
```

---

## Task 4: Wire new MCQ props in `app/lesson/page.tsx`

**Files:**
- Modify: `app/lesson/page.tsx`

The MCQ component now records wrong attempts via a new callback. Update the page to pass `onWrongAttempt` and to thread `onChatTurn` directly through `MCQuestionScreen` (instead of through the soon-to-be-removed `RemediationScreen`). The remediation step blocks in this file are left in place for now — they're dead code (unreachable, since the MCQ no longer dispatches on wrong) but they still compile against the unchanged `lessonMachine`. Task 5 deletes them along with the state machine cleanup.

- [ ] **Step 1: Update each MCQ instance in `app/lesson/page.tsx`**

For each of the four `<MCQuestionScreen ...>` instances (mcq1, mcq1b, mcq1c, mcq2), do two edits:

1. Change the `onAnswer` body from:

```tsx
onAnswer={(opt) => {
  analytics.recordMcqAttempt("mcq1", opt.isCorrect);
  dispatch({ type: "ANSWER_MCQ", mcqId: "mcq1", optionId: opt.id });
}}
```

to:

```tsx
onAnswer={(opt) => {
  analytics.recordMcqAttempt("mcq1", true);
  dispatch({ type: "ANSWER_MCQ", mcqId: "mcq1", optionId: opt.id });
}}
onWrongAttempt={() => analytics.recordMcqAttempt("mcq1", false)}
onChatTurn={() => analytics.recordChatTurn("remediation1")}
```

Substitute `mcq1` → `mcq1b` / `mcq1c` / `mcq2` and `remediation1` → `remediation1b` / `remediation1c` / `remediation2` for the other three.

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: all tests pass — the lesson reducer still handles `ANSWER_MCQ` for both correct and wrong (wrong path becomes unreachable from the UI but still typechecks).

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Smoke the dev server**

Run: `npm run dev` and open the lesson page.
- Pick the correct answer on `mcq1`: rationale appears inline, **Next** advances to `mcq1b`.
- Pick a wrong answer on `mcq1b`: remediation appears inline, **Try again** + **Ask a follow-up** visible. Click **Try again**, pick correct, advance.
- Verify the dead `state.step === "remediationX"` blocks are never reached — the lesson never visits a remediation page.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add app/lesson/page.tsx
git commit -m "Route MCQ wrong attempts inline via onWrongAttempt"
```

---

## Task 5: Drop remediation steps from state machine, analytics, page, and delete `RemediationScreen`

**Files:**
- Modify: `lib/lessonMachine.ts`
- Modify: `lib/useLessonAnalytics.ts`
- Modify: `app/lesson/page.tsx`
- Modify: `tests/lessonMachine.test.ts`
- Modify: `tests/useLessonAnalytics.test.ts`
- Delete: `components/RemediationScreen.tsx`

- [ ] **Step 1: Update `tests/lessonMachine.test.ts` — drop remediation cases and update `ANSWER_MCQ` tests**

The full updated file:

```ts
import { describe, it, expect } from "vitest";
import {
  initialLessonState,
  lessonReducer,
  LessonState,
  LessonStep,
  progressFor,
} from "@/lib/lessonMachine";
import { curriculum } from "@/lib/curriculum";

describe("lessonReducer", () => {
  it("starts at intro", () => {
    expect(initialLessonState.step).toBe("intro");
  });

  it("intro → reading1 on ADVANCE", () => {
    const next = lessonReducer(initialLessonState, { type: "ADVANCE" });
    expect(next.step).toBe("reading1");
  });

  it("reading1 → mcq1 on ADVANCE", () => {
    const state: LessonState = { ...initialLessonState, step: "reading1" };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.step).toBe("mcq1");
  });

  it("mcq1 → mcq1b when answered correctly", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq1" };
    const correctId = curriculum.mcq1.options.find((o) => o.isCorrect)!.id;
    const next = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq1",
      optionId: correctId,
    });
    expect(next.step).toBe("mcq1b");
  });

  it("mcq1b correct → mcq1c", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq1b" };
    const correctId = curriculum.mcq1b.options.find((o) => o.isCorrect)!.id;
    const next = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq1b",
      optionId: correctId,
    });
    expect(next.step).toBe("mcq1c");
  });

  it("mcq1c correct → simulation", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq1c" };
    const correctId = curriculum.mcq1c.options.find((o) => o.isCorrect)!.id;
    const next = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq1c",
      optionId: correctId,
    });
    expect(next.step).toBe("simulation");
  });

  it("simulation → mcq2 on ADVANCE", () => {
    const state: LessonState = { ...initialLessonState, step: "simulation" };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.step).toBe("mcq2");
  });

  it("mcq2 correct → voiceTutor", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq2" };
    const correctId = curriculum.mcq2.options.find((o) => o.isCorrect)!.id;
    const next = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq2",
      optionId: correctId,
    });
    expect(next.step).toBe("voiceTutor");
  });

  it("voiceTutor → done on ADVANCE", () => {
    const state: LessonState = { ...initialLessonState, step: "voiceTutor" };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.step).toBe("done");
  });
});

describe("lessonReducer GO_BACK", () => {
  const backCases: Array<[LessonStep, LessonStep]> = [
    ["reading1", "intro"],
    ["mcq1", "reading1"],
    ["mcq1b", "mcq1"],
    ["mcq1c", "mcq1b"],
    ["simulation", "mcq1c"],
    ["mcq2", "simulation"],
    ["voiceTutor", "mcq2"],
  ];

  it.each(backCases)("GO_BACK from %s lands on %s", (from, to) => {
    const state: LessonState = { ...initialLessonState, step: from };
    const next = lessonReducer(state, { type: "GO_BACK" });
    expect(next.step).toBe(to);
  });

  const noBackSteps: LessonStep[] = ["intro", "done"];

  it.each(noBackSteps)("GO_BACK is a no-op from %s", (step) => {
    const state: LessonState = { ...initialLessonState, step };
    const next = lessonReducer(state, { type: "GO_BACK" });
    expect(next).toEqual(state);
  });
});

describe("progressFor", () => {
  it("returns 0/7 for intro (lesson not started)", () => {
    expect(progressFor("intro")).toEqual({ current: 0, total: 7 });
  });

  it("returns 1/7 for reading1", () => {
    expect(progressFor("reading1")).toEqual({ current: 1, total: 7 });
  });

  it("returns 2/7 for mcq1", () => {
    expect(progressFor("mcq1")).toEqual({ current: 2, total: 7 });
  });

  it("returns 3/7 for mcq1b", () => {
    expect(progressFor("mcq1b")).toEqual({ current: 3, total: 7 });
  });

  it("returns 4/7 for mcq1c", () => {
    expect(progressFor("mcq1c")).toEqual({ current: 4, total: 7 });
  });

  it("returns 6/7 for mcq2", () => {
    expect(progressFor("mcq2")).toEqual({ current: 6, total: 7 });
  });

  it("returns 7/7 for done (lesson complete)", () => {
    expect(progressFor("done")).toEqual({ current: 7, total: 7 });
  });
});
```

- [ ] **Step 2: Run lessonMachine tests to confirm they fail**

Run: `npx vitest run tests/lessonMachine.test.ts`
Expected: typecheck errors / test failures — `remediation*` literals appear in test fixtures but the source still defines them, so the tests should actually pass against the old reducer. If they pass, that's fine — the test changes are forward-compatible. If they fail, proceed to Step 3.

(If they pass, that just means the simpler `ANSWER_MCQ` semantics agree with the existing behavior for the correct-answer subset. Moving on.)

- [ ] **Step 3: Update `lib/lessonMachine.ts`**

Replace the full contents with:

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

export type ReadingMcqId = "mcq1" | "mcq1b" | "mcq1c";
export type McqId = ReadingMcqId | "mcq2";

export interface LessonState {
  step: LessonStep;
}

export type LessonAction =
  | { type: "ADVANCE" }
  | { type: "GO_BACK" }
  | { type: "ANSWER_MCQ"; mcqId: McqId; optionId: string };

const backTargets: Partial<Record<LessonStep, LessonStep>> = {
  reading1: "intro",
  mcq1: "reading1",
  mcq1b: "mcq1",
  mcq1c: "mcq1b",
  simulation: "mcq1c",
  mcq2: "simulation",
  voiceTutor: "mcq2",
};

export const initialLessonState: LessonState = { step: "intro" };

const linearOrder: LessonStep[] = [
  "intro",
  "reading1",
  "mcq1",
  "mcq1b",
  "mcq1c",
  "simulation",
  "mcq2",
  "voiceTutor",
  "done",
];

function nextLinear(step: LessonStep): LessonStep {
  const i = linearOrder.indexOf(step);
  return i >= 0 && i < linearOrder.length - 1 ? linearOrder[i + 1] : step;
}

export function lessonReducer(
  state: LessonState,
  action: LessonAction,
): LessonState {
  switch (action.type) {
    case "ADVANCE":
      return { ...state, step: nextLinear(state.step) };

    case "GO_BACK": {
      const target = backTargets[state.step];
      if (!target) return state;
      return { step: target };
    }

    case "ANSWER_MCQ":
      return { step: nextLinear(state.step) };
  }
}

export function progressFor(step: LessonStep): {
  current: number;
  total: number;
} {
  const visible: LessonStep[] = [
    "reading1",
    "mcq1",
    "mcq1b",
    "mcq1c",
    "simulation",
    "mcq2",
    "voiceTutor",
  ];
  const total = visible.length;
  if (step === "done") return { current: total, total };
  const idx = visible.indexOf(step);
  return { current: idx < 0 ? 0 : idx + 1, total };
}
```

- [ ] **Step 4: Update `lib/useLessonAnalytics.ts`**

Drop `REMEDIATION_PARENT` and simplify `timedStepFor`. Replace lines 86–100 (the constant and function) with:

```ts
function timedStepFor(step: LessonStep): TimedStep | null {
  if (step === "intro" || step === "done") return null;
  return (TIMED_STEP_ORDER as readonly LessonStep[]).includes(step)
    ? (step as TimedStep)
    : null;
}
```

Delete the `REMEDIATION_PARENT` constant entirely. The `ChatSurface` union, the `chatTurns` keys, and the `AnalyticsSnapshot` shape are unchanged.

- [ ] **Step 5: Update `tests/useLessonAnalytics.test.ts`**

Two edits:

(a) In the "increments chatTurns by surface" test (around line 41), change the hook call from `useLessonAnalytics("remediation1")` to `useLessonAnalytics("mcq1")`. The `recordChatTurn("remediation1")` calls inside `act` stay the same — that surface key is still valid.

(b) Delete the entire "rolls remediation1 time into mcq1" test (around lines 153–174).

- [ ] **Step 6: Update `app/lesson/page.tsx` — remove dead remediation blocks and the `RemediationScreen` import**

Replace the entire contents of `app/lesson/page.tsx` with:

```tsx
"use client";

import { useReducer } from "react";
import { LessonShell } from "@/components/LessonShell";
import { ReadingScreen } from "@/components/ReadingScreen";
import { MCQuestionScreen } from "@/components/MCQuestionScreen";
import { SimulationScreen } from "@/components/SimulationScreen";
import { VoiceTutorScreen } from "@/components/VoiceTutorScreen";
import { CompletionScreen } from "@/components/CompletionScreen";
import {
  initialLessonState,
  lessonReducer,
  progressFor,
} from "@/lib/lessonMachine";
import { useLessonAnalytics } from "@/lib/useLessonAnalytics";
import { curriculum } from "@/lib/curriculum";

export default function LessonPage() {
  const [state, dispatch] = useReducer(lessonReducer, initialLessonState);
  const analytics = useLessonAnalytics(state.step);
  const progress = progressFor(state.step);
  const goBack = () => dispatch({ type: "GO_BACK" });

  return (
    <LessonShell progress={progress}>
      {state.step === "intro" && (
        <div className="flex-1 flex flex-col justify-center items-start gap-5 max-w-md">
          <p className="text-base leading-relaxed text-text-muted">
            Let&apos;s get started. This will take about 5-10 minutes.
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: "ADVANCE" })}
            className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
          >
            Begin
          </button>
        </div>
      )}

      {state.step === "reading1" && (
        <ReadingScreen
          section={curriculum.reading1}
          onAdvance={() => dispatch({ type: "ADVANCE" })}
          onBack={goBack}
        />
      )}

      {state.step === "mcq1" && (
        <MCQuestionScreen
          mcq={curriculum.mcq1}
          onAnswer={(opt) => {
            analytics.recordMcqAttempt("mcq1", true);
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq1", optionId: opt.id });
          }}
          onWrongAttempt={() => analytics.recordMcqAttempt("mcq1", false)}
          onChatTurn={() => analytics.recordChatTurn("remediation1")}
          onBack={goBack}
        />
      )}

      {state.step === "mcq1b" && (
        <MCQuestionScreen
          mcq={curriculum.mcq1b}
          onAnswer={(opt) => {
            analytics.recordMcqAttempt("mcq1b", true);
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq1b", optionId: opt.id });
          }}
          onWrongAttempt={() => analytics.recordMcqAttempt("mcq1b", false)}
          onChatTurn={() => analytics.recordChatTurn("remediation1b")}
          onBack={goBack}
        />
      )}

      {state.step === "mcq1c" && (
        <MCQuestionScreen
          mcq={curriculum.mcq1c}
          onAnswer={(opt) => {
            analytics.recordMcqAttempt("mcq1c", true);
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq1c", optionId: opt.id });
          }}
          onWrongAttempt={() => analytics.recordMcqAttempt("mcq1c", false)}
          onChatTurn={() => analytics.recordChatTurn("remediation1c")}
          onBack={goBack}
        />
      )}

      {state.step === "simulation" && (
        <SimulationScreen
          onAdvance={() => dispatch({ type: "ADVANCE" })}
          onBack={goBack}
          onToggle={analytics.recordToggle}
        />
      )}

      {state.step === "mcq2" && (
        <MCQuestionScreen
          mcq={curriculum.mcq2}
          onAnswer={(opt) => {
            analytics.recordMcqAttempt("mcq2", true);
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq2", optionId: opt.id });
          }}
          onWrongAttempt={() => analytics.recordMcqAttempt("mcq2", false)}
          onChatTurn={() => analytics.recordChatTurn("remediation2")}
          onBack={goBack}
        />
      )}

      {state.step === "voiceTutor" && (
        <VoiceTutorScreen
          onAdvance={() => dispatch({ type: "ADVANCE" })}
          onBack={goBack}
          onChatTurn={() => analytics.recordChatTurn("finalRecap")}
        />
      )}

      {state.step === "done" && (
        <CompletionScreen snapshot={analytics.snapshot} />
      )}
    </LessonShell>
  );
}
```

- [ ] **Step 7: Delete `components/RemediationScreen.tsx`**

Run: `git rm components/RemediationScreen.tsx`
Expected: file removed.

- [ ] **Step 8: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass. No remaining references to `RemediationScreen` or the `remediation*` lesson steps.

- [ ] **Step 9: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Search for any straggling references**

Run: `grep -RIn "RemediationScreen\|remediation1\|remediation2\|remediation1b\|remediation1c" app components lib tests`
Expected: matches only inside `useLessonAnalytics.ts` (`ChatSurface` keys, intentional), `useLessonAnalytics.test.ts` (the chat-surface test, intentional), `SessionMetrics.tsx` (the chat-turns roll-up, intentional), and `app/lesson/page.tsx` (`recordChatTurn("remediation1")` etc., intentional). No remaining `RemediationScreen` import or `state.step === "remediation*"` comparisons.

- [ ] **Step 11: Commit**

```bash
git add lib/lessonMachine.ts lib/useLessonAnalytics.ts app/lesson/page.tsx tests/lessonMachine.test.ts tests/useLessonAnalytics.test.ts components/RemediationScreen.tsx
git commit -m "Drop remediation steps; delete RemediationScreen"
```

---

## Task 6: Manual smoke and final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the dev server and walk a full lesson**

Run: `npm run dev`

Walk the lesson end-to-end:
1. **Intro → Reading → mcq1**: pick a wrong option, verify the inline remediation panel appears under the radios with the option's `remediation` text, **Try again** + **Ask a follow-up** buttons visible. Open the follow-up chat, send one message, close it.
2. Click **Try again**, pick the correct option, verify the **Correct** panel appears with the mcq1 `rationale` and a **Next** button. Click **Next**, advance to `mcq1b`.
3. Repeat the wrong→correct cycle on `mcq1b` and `mcq1c`, then proceed through `simulation`, `mcq2`, `voiceTutor`, `done`.
4. On the completion screen, open the SessionMetrics panel. Verify:
   - MCQ attempt counts increment on every Submit (including wrong attempts).
   - "Remediation chat turns" reflects the follow-up chat messages sent.
   - Time per step never shows a "remediation" entry — time on a question rolls into the parent MCQ step.

- [ ] **Step 2: Stop the dev server and run the full test suite + typecheck one final time**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests pass, no type errors.

- [ ] **Step 3: Verify clean git status**

Run: `git status`
Expected: working tree clean. All work committed.

- [ ] **Step 4: Quick sanity check of the branch log**

Run: `git log --oneline main..HEAD`
Expected: 5 commits on `worktree-inline-mcq-remediation` beyond the spec commit:
1. Add rationale field to MCQ and author per-question copy
2. Render wrong-answer remediation inline in MCQuestionScreen
3. Cover correct-answer inline rationale + Next in MCQuestionScreen tests
4. Route MCQ wrong attempts inline via onWrongAttempt
5. Drop remediation steps; delete RemediationScreen

(The spec commit itself was cherry-picked into this worktree from main before implementation began.)
