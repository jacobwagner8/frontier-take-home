# Skip Lesson Intro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the lesson's `intro` step so clicking "Start lesson →" on the dashboard lands directly on the reading screen. Spec: `docs/superpowers/specs/2026-05-20-skip-lesson-intro-design.md`.

**Architecture:** Narrow the `LessonStep` union by deleting the `"intro"` literal, change `initialLessonState` to start at `reading1`, drop the intro render branch in the lesson page, and adjust the analytics step-tracking predicate to match the new type. Tests that referenced `"intro"` are updated in the same commit because narrowing the exported type breaks the build in every file that touches the literal.

**Tech Stack:** TypeScript (discriminated-union narrowing), React 19, Next 16 App Router, Vitest. No new dependencies.

---

## File Structure Overview

```
frontier-take-home/
├── app/
│   └── lesson/page.tsx                  # MODIFY — delete the {state.step === "intro" && (...)} branch
├── lib/
│   ├── lessonMachine.ts                 # MODIFY — drop "intro" from union/order/backTargets, change initialLessonState
│   └── useLessonAnalytics.ts            # MODIFY — narrow timedStepFor predicate
├── tests/
│   ├── lessonMachine.test.ts            # MODIFY — drop/rewrite intro-specific assertions
│   └── useLessonAnalytics.test.ts       # MODIFY — replace "intro" props with "done"; rename the exclusion test
└── docs/superpowers/
    ├── specs/2026-05-20-skip-lesson-intro-design.md   # already committed
    └── plans/2026-05-20-skip-lesson-intro.md          # this file
```

No new files. Single atomic commit per the rationale in the architecture note.

---

## Task 1: Remove the intro step (atomic commit)

**Files (all modified together; narrowing `LessonStep` breaks the build everywhere it's referenced):**

- Modify: `lib/lessonMachine.ts`
- Modify: `app/lesson/page.tsx`
- Modify: `lib/useLessonAnalytics.ts`
- Modify: `tests/lessonMachine.test.ts`
- Modify: `tests/useLessonAnalytics.test.ts`

### Step 1: Edit `lib/lessonMachine.ts`

Four targeted edits in this file.

- [ ] **1a. Remove `"intro"` from the `LessonStep` union.**

Find:

```ts
export type LessonStep =
  | "intro"
  | "reading1"
  | "mcq1"
```

Replace with:

```ts
export type LessonStep =
  | "reading1"
  | "mcq1"
```

- [ ] **1b. Update `initialLessonState`.**

Find:

```ts
export const initialLessonState: LessonState = { step: "intro" };
```

Replace with:

```ts
export const initialLessonState: LessonState = { step: "reading1" };
```

- [ ] **1c. Drop `"intro"` from `linearOrder`.**

Find:

```ts
const linearOrder: LessonStep[] = [
  "intro",
  "reading1",
  "mcq1",
```

Replace with:

```ts
const linearOrder: LessonStep[] = [
  "reading1",
  "mcq1",
```

- [ ] **1d. Drop the `reading1: "intro"` entry from `backTargets` and update the comment.**

Find:

```ts
/** Steps that expose a Back affordance, with their explicit destinations.
 * Non-linear cases (remediation, intro, done) are intentionally omitted —
 * see the Back UX decisions in the PR description. */
const backTargets: Partial<Record<LessonStep, LessonStep>> = {
  reading1: "intro",
  mcq1: "reading1",
  mcq1b: "mcq1",
  mcq1c: "mcq1b",
  simulation: "mcq1c",
  mcq2: "simulation",
  voiceTutor: "mcq2",
};
```

Replace with:

```ts
/** Steps that expose a Back affordance, with their explicit destinations.
 * reading1 is the first content step and has no back target. Remediation
 * and `done` are also intentionally omitted. */
const backTargets: Partial<Record<LessonStep, LessonStep>> = {
  mcq1: "reading1",
  mcq1b: "mcq1",
  mcq1c: "mcq1b",
  simulation: "mcq1c",
  mcq2: "simulation",
  voiceTutor: "mcq2",
};
```

### Step 2: Edit `app/lesson/page.tsx` — delete the intro render branch

- [ ] **2a. Remove the intro render branch.**

Find:

```tsx
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
```

Replace with:

```tsx
      {state.step === "reading1" && (
```

(The intro `<div>...</div>` block plus its trailing blank line is removed. The remaining file is otherwise unchanged.)

### Step 3: Edit `lib/useLessonAnalytics.ts` — narrow `timedStepFor`

- [ ] **3a. Drop `"intro"` from the early-return guard.**

Find:

```ts
function timedStepFor(step: LessonStep): TimedStep | null {
  if (step === "intro" || step === "done") return null;
```

Replace with:

```ts
function timedStepFor(step: LessonStep): TimedStep | null {
  if (step === "done") return null;
```

### Step 4: Edit `tests/lessonMachine.test.ts` — update intro-specific assertions

- [ ] **4a. Update "starts at intro" assertion.**

Find:

```ts
  it("starts at intro", () => {
    expect(initialLessonState.step).toBe("intro");
  });

  it("intro → reading1 on ADVANCE", () => {
    const next = lessonReducer(initialLessonState, { type: "ADVANCE" });
    expect(next.step).toBe("reading1");
  });
```

Replace with:

```ts
  it("starts at reading1", () => {
    expect(initialLessonState.step).toBe("reading1");
  });
```

(The "intro → reading1 on ADVANCE" test is deleted — it asserted a transition that no longer exists. ADVANCE from reading1 is already covered by the next test in the file.)

- [ ] **4b. Update "RESTART_LESSON" expectation.**

Find:

```ts
  it("RESTART_LESSON returns to intro from any step", () => {
    const state: LessonState = { ...initialLessonState, step: "done" };
    const next = lessonReducer(state, { type: "RESTART_LESSON" });
    expect(next.step).toBe("intro");
  });
```

Replace with:

```ts
  it("RESTART_LESSON returns to reading1 from any step", () => {
    const state: LessonState = { ...initialLessonState, step: "done" };
    const next = lessonReducer(state, { type: "RESTART_LESSON" });
    expect(next.step).toBe("reading1");
  });
```

- [ ] **4c. Drop the `["reading1", "intro"]` back-target row.**

Find:

```ts
  const backCases: Array<[LessonStep, LessonStep]> = [
    ["reading1", "intro"],
    ["mcq1", "reading1"],
```

Replace with:

```ts
  const backCases: Array<[LessonStep, LessonStep]> = [
    ["mcq1", "reading1"],
```

- [ ] **4d. Update `noBackSteps` — drop `"intro"`, add `"reading1"`.**

Find:

```ts
  const noBackSteps: LessonStep[] = [
    "intro",
    "remediation1",
    "remediation1b",
    "remediation1c",
    "remediation2",
    "done",
  ];
```

Replace with:

```ts
  const noBackSteps: LessonStep[] = [
    "reading1",
    "remediation1",
    "remediation1b",
    "remediation1c",
    "remediation2",
    "done",
  ];
```

- [ ] **4e. Drop the `progressFor("intro")` test.**

Find:

```ts
  it("returns 0/7 for intro (lesson not started)", () => {
    expect(progressFor("intro")).toEqual({ current: 0, total: 7 });
  });

  it("returns 1/7 for reading1", () => {
```

Replace with:

```ts
  it("returns 1/7 for reading1", () => {
```

### Step 5: Edit `tests/useLessonAnalytics.test.ts` — replace `"intro"` props

- [ ] **5a. Update the "starts with a zeroed snapshot" test.**

Find:

```ts
    const { result } = renderHook(() => useLessonAnalytics("intro"));
```

Replace with:

```ts
    const { result } = renderHook(() => useLessonAnalytics("done"));
```

(Both `intro` and `done` are excluded from time-tracking by `timedStepFor`, so the empty-baseline assertion still holds. `done` is the remaining excluded step.)

- [ ] **5b. Rename and simplify the "excludes intro and done from perStep" test.**

Find:

```ts
  it("excludes intro and done from perStep", () => {
    const { result, rerender } = renderHook(
      ({ step }) => useLessonAnalytics(step),
      { initialProps: { step: "intro" as const } },
    );
    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    rerender({ step: "reading1" as never });
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    rerender({ step: "done" as never });
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    rerender({ step: "done" });

    expect(result.current.snapshot.perStep.map((s) => s.step)).toEqual([
      "reading1",
    ]);
    expect(result.current.snapshot.totalActiveMs).toBe(2_000);
  });
```

Replace with:

```ts
  it("excludes done from perStep", () => {
    const { result, rerender } = renderHook(
      ({ step }) => useLessonAnalytics(step),
      { initialProps: { step: "reading1" as const } },
    );
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    rerender({ step: "done" as never });
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(result.current.snapshot.perStep.map((s) => s.step)).toEqual([
      "reading1",
    ]);
    expect(result.current.snapshot.totalActiveMs).toBe(2_000);
  });
```

### Step 6: Verify the build and tests pass

- [ ] **6a. Run tests.**

Run: `npm run test:run`
Expected: PASS. Test count drops from 90 to 88 (two intro-specific tests deleted: "intro → reading1 on ADVANCE" and `progressFor("intro")`; one renamed in place).

- [ ] **6b. Run build.**

Run: `npm run build`
Expected: build + typecheck succeed. No "Type '\"intro\"' is not assignable" errors.

- [ ] **6c. Run lint.**

Run: `npm run lint`
Expected: no NEW errors. (The pre-existing `experimental/eval-engine/` lint findings on origin/main are unrelated.)

### Step 7: Sanity-grep for stray `"intro"` references

- [ ] **7a. Confirm no production code still references `"intro"`.**

Run: `grep -rn "\"intro\"" --include="*.ts" --include="*.tsx" lib/ app/ components/ tests/`
Expected: zero results.

If any references remain in the diff, investigate before continuing. The grep should report nothing.

### Step 8: Commit

- [ ] **8a. Stage and commit all changes in one commit.**

```bash
git add lib/lessonMachine.ts app/lesson/page.tsx lib/useLessonAnalytics.ts tests/lessonMachine.test.ts tests/useLessonAnalytics.test.ts
git commit -m "Remove lesson intro step

Clicking Start lesson on the dashboard now lands directly on the
reading screen. The intro 'Let's get started' page (single Begin
button) was redundant with the dashboard CTA. Direct visits to
/lesson skip the screen too. RESTART_LESSON now restarts on
reading1.

Reading screen loses its Back affordance because there is no
upstream destination. Analytics timedStepFor predicate narrows
from 'intro || done' to just 'done'."
```

---

## Task 2: Final verification

**Files:** none modified — verification only.

### Step 1: Re-run the full test suite

- [ ] **Run:** `npm run test:run`
- Expected: 88 / 88 PASS.

### Step 2: Re-run build and lint

- [ ] **Run:** `npm run build && npm run lint`
- Expected: build clean. Lint has the same 17 pre-existing experimental/eval-engine findings as origin/main — no new errors in files this task touched.

### Step 3: Manual smoke via dev server + curl

The lesson page is a client component, so curl returns the React Server Component shell with the initial step already chosen. Walk through the flow:

- [ ] **Start the dev server in the background:**

```bash
npm run dev &
DEV_PID=$!
sleep 6
```

- [ ] **Verify `/` still loads (HTTP 200) and contains `Start lesson`:**

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/
curl -sS http://localhost:3000/ | grep -c "Start lesson"
```

Expected: `HTTP 200` and a count of at least `1`.

- [ ] **Verify `/lesson` no longer renders the "Let's get started" copy:**

```bash
curl -sS http://localhost:3000/lesson | grep -c "Let.s get started"
```

Expected: `0`.

- [ ] **Verify `/lesson` now renders the reading content directly.** The reading section title is the stable phrase "One bond, exactly one place" (defined in `lib/curriculum.ts` `reading1.title`):

```bash
curl -sS http://localhost:3000/lesson | grep -c "One bond, exactly one place"
```

Expected: at least `1`.

- [ ] **Stop the dev server:**

```bash
kill $DEV_PID 2>/dev/null
wait 2>/dev/null
```

### Step 4: Confirm clean working tree

- [ ] **Run:** `git status`
- Expected: `nothing to commit, working tree clean`.

---

## Out of scope (do not implement)

- Changes to the dashboard entry page (`app/page.tsx`), lesson shell, curriculum content, simulation, voice tutor, or completion screen.
- New routes, query-param-based skip flags, or auto-advance effects.
- Changes to `progressFor`'s `total` count — already 7 visible content steps; intro was never counted.
- Any refactor of the analytics hook beyond the one-line predicate narrowing.
