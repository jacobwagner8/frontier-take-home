# Lesson Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture per-step active time and engagement counters during a lesson run and render a session-metrics panel on `CompletionScreen`. In-memory only; no persistence or transport.

**Architecture:** Single `useLessonAnalytics(step)` hook in `app/lesson/page.tsx` (alongside `useReducer(lessonReducer)`) owns the analytics state. The lesson reducer is not modified. Screens receive narrow event-recorder callback props from the page; `useChat` grows one optional `onUserSent` callback so both chat surfaces (`FollowUpChat`, `TextRecapChat`) report turns through the same code path that already guards send.

**Tech Stack:** Next.js (this repo's pinned version — see `node_modules/next/dist/docs/` per `AGENTS.md`), React 19, Tailwind, Vitest, React Testing Library, `@testing-library/user-event`. No new dependencies.

---

## File Structure

**New files**

| Path | Responsibility |
|---|---|
| `lib/formatDuration.ts` | Pure `formatMs(ms): string` → `"Xh Ym Zs"` (leading zero components dropped). Imported by `SessionMetrics`. |
| `lib/useLessonAnalytics.ts` | Hook + `AnalyticsSnapshot` type + recorder functions. Owns all analytics state and timing. Single source of truth. |
| `components/SessionMetrics.tsx` | Renders an `AnalyticsSnapshot` as a labeled block matching the existing `bg-surface-muted rounded-2xl` convention. |
| `tests/formatDuration.test.ts` | Pure unit tests. |
| `tests/useLessonAnalytics.test.ts` | Hook tests via `renderHook` from `@testing-library/react`. Uses Vitest fake timers and manual `visibilitychange` dispatch. |
| `tests/SessionMetrics.test.tsx` | Snapshot rendering tests against fixed `AnalyticsSnapshot` inputs. |

**Modified files**

| Path | Change |
|---|---|
| `lib/useChat.ts` | Add optional `onUserSent?: () => void` to `UseChatOptions`. Call after the `!input.trim() \|\| busy` guard, before the fetch. |
| `components/FollowUpChat.tsx` | Add optional `onUserSent?: () => void` prop, forward to `useChat`. |
| `components/TextRecapChat.tsx` | Add optional `onUserSent?: () => void` prop, forward to `useChat`. |
| `components/RemediationScreen.tsx` | Add optional `onChatTurn?: () => void`, pass as `onUserSent` to `FollowUpChat`. |
| `components/VoiceTutorScreen.tsx` | Add optional `onChatTurn?: () => void`, pass as `onUserSent` to `TextRecapChat`. |
| `components/SimulationScreen.tsx` | Add optional `onToggle?: () => void` prop, call from `handleToggle`. |
| `components/CompletionScreen.tsx` | Add optional `snapshot?: AnalyticsSnapshot` prop. Render `<SessionMetrics />` when present. |
| `app/lesson/page.tsx` | Instantiate `useLessonAnalytics(state.step)`. Call `recordMcqAttempt` from the `ANSWER_MCQ` dispatch handler. Thread `onToggle` / `onChatTurn` / `snapshot` into screen props. |

`MCQuestionScreen.tsx` is **not** modified — the `ANSWER_MCQ` handler in `app/lesson/page.tsx` already has both `mcqId` and `option.isCorrect`, so the analytics call belongs there, not behind another prop.

---

## Task 1: `formatDuration` utility

**Files:**
- Create: `lib/formatDuration.ts`
- Test: `tests/formatDuration.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/formatDuration.test.ts
import { describe, it, expect } from "vitest";
import { formatMs } from "@/lib/formatDuration";

describe("formatMs", () => {
  it("renders zero as 0s", () => {
    expect(formatMs(0)).toBe("0s");
  });

  it("renders sub-minute durations as seconds", () => {
    expect(formatMs(12_000)).toBe("12s");
  });

  it("rounds sub-second remainders down", () => {
    expect(formatMs(12_900)).toBe("12s");
  });

  it("renders minute-and-second durations", () => {
    expect(formatMs(72_000)).toBe("1m 12s");
  });

  it("omits leading zero components for sub-hour durations", () => {
    expect(formatMs(60_000)).toBe("1m 0s");
  });

  it("renders multi-hour durations", () => {
    expect(formatMs(3_725_000)).toBe("1h 2m 5s");
  });

  it("clamps negative inputs to 0s", () => {
    expect(formatMs(-500)).toBe("0s");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/formatDuration.test.ts`
Expected: FAIL — `Cannot find module '@/lib/formatDuration'`

- [ ] **Step 3: Implement `formatMs`**

```ts
// lib/formatDuration.ts
export function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/formatDuration.test.ts`
Expected: PASS — 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/formatDuration.ts tests/formatDuration.test.ts
git commit -m "Add formatMs duration helper"
```

---

## Task 2: `useLessonAnalytics` — type, snapshot defaults, counter recorders

This task introduces the hook without timing logic. Timing comes in Task 3 to keep tests scoped.

**Files:**
- Create: `lib/useLessonAnalytics.ts`
- Test: `tests/useLessonAnalytics.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/useLessonAnalytics.test.ts
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLessonAnalytics } from "@/lib/useLessonAnalytics";

describe("useLessonAnalytics — counters", () => {
  it("starts with a zeroed snapshot", () => {
    const { result } = renderHook(() => useLessonAnalytics("intro"));
    const s = result.current.snapshot;

    expect(s.totalActiveMs).toBe(0);
    expect(s.perStep).toEqual([]);
    expect(s.mcq1).toEqual({
      attempts: 0,
      wrongAttempts: 0,
      firstTryCorrect: false,
    });
    expect(s.mcq2).toEqual({
      attempts: 0,
      wrongAttempts: 0,
      firstTryCorrect: false,
    });
    expect(s.simulationToggles).toBe(0);
    expect(s.chatTurns).toEqual({
      remediation1: 0,
      remediation2: 0,
      finalRecap: 0,
    });
  });

  it("increments simulationToggles on each recordToggle", () => {
    const { result } = renderHook(() => useLessonAnalytics("simulation"));
    act(() => {
      result.current.recordToggle();
      result.current.recordToggle();
      result.current.recordToggle();
    });
    expect(result.current.snapshot.simulationToggles).toBe(3);
  });

  it("increments chatTurns by surface", () => {
    const { result } = renderHook(() => useLessonAnalytics("remediation1"));
    act(() => {
      result.current.recordChatTurn("remediation1");
      result.current.recordChatTurn("remediation1");
      result.current.recordChatTurn("finalRecap");
    });
    expect(result.current.snapshot.chatTurns).toEqual({
      remediation1: 2,
      remediation2: 0,
      finalRecap: 1,
    });
  });

  it("records MCQ attempts and tracks first-try correctness", () => {
    const { result } = renderHook(() => useLessonAnalytics("mcq1"));
    act(() => {
      result.current.recordMcqAttempt("mcq1", true);
    });
    expect(result.current.snapshot.mcq1).toEqual({
      attempts: 1,
      wrongAttempts: 0,
      firstTryCorrect: true,
    });
  });

  it("records wrong then correct attempts on the same MCQ", () => {
    const { result } = renderHook(() => useLessonAnalytics("mcq2"));
    act(() => {
      result.current.recordMcqAttempt("mcq2", false);
      result.current.recordMcqAttempt("mcq2", false);
      result.current.recordMcqAttempt("mcq2", true);
    });
    expect(result.current.snapshot.mcq2).toEqual({
      attempts: 3,
      wrongAttempts: 2,
      firstTryCorrect: false,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/useLessonAnalytics.test.ts`
Expected: FAIL — `Cannot find module '@/lib/useLessonAnalytics'`

- [ ] **Step 3: Implement counter-only version of the hook**

```ts
// lib/useLessonAnalytics.ts
"use client";

import { useCallback, useRef, useState } from "react";
import type { LessonStep } from "./lessonMachine";

export type TimedStep =
  | "reading1"
  | "mcq1"
  | "simulation"
  | "mcq2"
  | "voiceTutor";

export type ChatSurface = "remediation1" | "remediation2" | "finalRecap";

export interface StepTime {
  step: TimedStep;
  activeMs: number;
}

export interface McqStats {
  attempts: number;
  wrongAttempts: number;
  firstTryCorrect: boolean;
}

export interface AnalyticsSnapshot {
  totalActiveMs: number;
  perStep: StepTime[];
  mcq1: McqStats;
  mcq2: McqStats;
  simulationToggles: number;
  chatTurns: Record<ChatSurface, number>;
}

interface MutableAnalytics {
  perStepMs: Partial<Record<TimedStep, number>>;
  mcq1: McqStats;
  mcq2: McqStats;
  simulationToggles: number;
  chatTurns: Record<ChatSurface, number>;
}

function emptyMcqStats(): McqStats {
  return { attempts: 0, wrongAttempts: 0, firstTryCorrect: false };
}

function emptyMutable(): MutableAnalytics {
  return {
    perStepMs: {},
    mcq1: emptyMcqStats(),
    mcq2: emptyMcqStats(),
    simulationToggles: 0,
    chatTurns: { remediation1: 0, remediation2: 0, finalRecap: 0 },
  };
}

const TIMED_STEP_ORDER: TimedStep[] = [
  "reading1",
  "mcq1",
  "simulation",
  "mcq2",
  "voiceTutor",
];

function snapshotFrom(m: MutableAnalytics): AnalyticsSnapshot {
  const perStep: StepTime[] = TIMED_STEP_ORDER.filter(
    (s) => m.perStepMs[s] !== undefined,
  ).map((s) => ({ step: s, activeMs: m.perStepMs[s] ?? 0 }));
  const totalActiveMs = perStep.reduce((acc, s) => acc + s.activeMs, 0);
  return {
    totalActiveMs,
    perStep,
    mcq1: { ...m.mcq1 },
    mcq2: { ...m.mcq2 },
    simulationToggles: m.simulationToggles,
    chatTurns: { ...m.chatTurns },
  };
}

export interface UseLessonAnalyticsResult {
  snapshot: AnalyticsSnapshot;
  recordToggle: () => void;
  recordChatTurn: (surface: ChatSurface) => void;
  recordMcqAttempt: (mcqId: "mcq1" | "mcq2", isCorrect: boolean) => void;
}

export function useLessonAnalytics(
  _step: LessonStep,
): UseLessonAnalyticsResult {
  const stateRef = useRef<MutableAnalytics>(emptyMutable());
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot>(() =>
    snapshotFrom(stateRef.current),
  );

  const flush = useCallback(() => {
    setSnapshot(snapshotFrom(stateRef.current));
  }, []);

  const recordToggle = useCallback(() => {
    stateRef.current.simulationToggles += 1;
    flush();
  }, [flush]);

  const recordChatTurn = useCallback(
    (surface: ChatSurface) => {
      stateRef.current.chatTurns[surface] += 1;
      flush();
    },
    [flush],
  );

  const recordMcqAttempt = useCallback(
    (mcqId: "mcq1" | "mcq2", isCorrect: boolean) => {
      const stats = stateRef.current[mcqId];
      if (stats.attempts === 0 && isCorrect) {
        stats.firstTryCorrect = true;
      }
      stats.attempts += 1;
      if (!isCorrect) stats.wrongAttempts += 1;
      flush();
    },
    [flush],
  );

  return { snapshot, recordToggle, recordChatTurn, recordMcqAttempt };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/useLessonAnalytics.test.ts`
Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/useLessonAnalytics.ts tests/useLessonAnalytics.test.ts
git commit -m "Add useLessonAnalytics counter scaffolding"
```

---

## Task 3: `useLessonAnalytics` — step timing + visibility pause

Add the timing dimension on top of the Task 2 scaffolding.

**Files:**
- Modify: `lib/useLessonAnalytics.ts`
- Modify: `tests/useLessonAnalytics.test.ts`

- [ ] **Step 1: Add failing timing tests**

Append to `tests/useLessonAnalytics.test.ts`:

```ts
import { vi } from "vitest";

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useLessonAnalytics — timing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accumulates time into the current step bucket", () => {
    const { result, rerender } = renderHook(
      ({ step }) => useLessonAnalytics(step),
      { initialProps: { step: "reading1" as const } },
    );
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    rerender({ step: "mcq1" });
    expect(
      result.current.snapshot.perStep.find((s) => s.step === "reading1")
        ?.activeMs,
    ).toBe(5_000);
  });

  it("rolls remediation1 time into mcq1", () => {
    const { result, rerender } = renderHook(
      ({ step }) => useLessonAnalytics(step),
      { initialProps: { step: "mcq1" as "mcq1" | "remediation1" } },
    );
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    rerender({ step: "remediation1" });
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    rerender({ step: "mcq1" });
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    rerender({ step: "simulation" as never });

    expect(
      result.current.snapshot.perStep.find((s) => s.step === "mcq1")?.activeMs,
    ).toBe(6_000);
  });

  it("pauses accumulation when the tab is hidden", () => {
    const { result, rerender } = renderHook(
      ({ step }) => useLessonAnalytics(step),
      { initialProps: { step: "reading1" as const } },
    );
    act(() => {
      vi.advanceTimersByTime(1_000);
      setVisibility("hidden");
      vi.advanceTimersByTime(10_000);
      setVisibility("visible");
      vi.advanceTimersByTime(2_000);
    });
    rerender({ step: "mcq1" });
    expect(
      result.current.snapshot.perStep.find((s) => s.step === "reading1")
        ?.activeMs,
    ).toBe(3_000);
  });

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

  it("totalActiveMs is the sum of per-step buckets", () => {
    const { result, rerender } = renderHook(
      ({ step }) => useLessonAnalytics(step),
      { initialProps: { step: "reading1" as const } },
    );
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    rerender({ step: "simulation" as never });
    act(() => {
      vi.advanceTimersByTime(2_500);
    });
    rerender({ step: "done" as never });
    expect(result.current.snapshot.totalActiveMs).toBe(5_500);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/useLessonAnalytics.test.ts`
Expected: FAIL — new timing tests fail because the hook doesn't accumulate time yet.

- [ ] **Step 3: Add timing to the hook**

Replace the body of `useLessonAnalytics` in `lib/useLessonAnalytics.ts` with the timing-aware version:

```ts
const REMEDIATION_PARENT: Partial<Record<LessonStep, TimedStep>> = {
  remediation1: "mcq1",
  remediation2: "mcq2",
};

function timedStepFor(step: LessonStep): TimedStep | null {
  if (step === "intro" || step === "done") return null;
  const rolled = REMEDIATION_PARENT[step];
  if (rolled) return rolled;
  return (TIMED_STEP_ORDER as readonly LessonStep[]).includes(step)
    ? (step as TimedStep)
    : null;
}

export function useLessonAnalytics(
  step: LessonStep,
): UseLessonAnalyticsResult {
  const stateRef = useRef<MutableAnalytics>(emptyMutable());
  const activeStepRef = useRef<TimedStep | null>(null);
  const segmentStartRef = useRef<number | null>(null);
  const visibleRef = useRef<boolean>(
    typeof document === "undefined"
      ? true
      : document.visibilityState !== "hidden",
  );
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot>(() =>
    snapshotFrom(stateRef.current),
  );

  const flush = useCallback(() => {
    setSnapshot(snapshotFrom(stateRef.current));
  }, []);

  const closeSegment = useCallback(() => {
    const active = activeStepRef.current;
    const start = segmentStartRef.current;
    if (active === null || start === null) {
      segmentStartRef.current = null;
      return;
    }
    const delta = Date.now() - start;
    if (delta > 0) {
      stateRef.current.perStepMs[active] =
        (stateRef.current.perStepMs[active] ?? 0) + delta;
    }
    segmentStartRef.current = null;
  }, []);

  const openSegment = useCallback(() => {
    if (activeStepRef.current === null) return;
    if (!visibleRef.current) return;
    segmentStartRef.current = Date.now();
  }, []);

  // Visibility tracking.
  useEffect(() => {
    if (typeof document === "undefined") return;
    function onChange() {
      const nowVisible = document.visibilityState !== "hidden";
      if (nowVisible === visibleRef.current) return;
      if (nowVisible) {
        visibleRef.current = true;
        openSegment();
      } else {
        closeSegment();
        visibleRef.current = false;
      }
    }
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [openSegment, closeSegment]);

  // Step transitions.
  useEffect(() => {
    const nextStep = timedStepFor(step);
    if (nextStep === activeStepRef.current) return;
    closeSegment();
    activeStepRef.current = nextStep;
    openSegment();
    flush();
  }, [step, closeSegment, openSegment, flush]);

  // Flush on unmount so any in-flight segment is captured.
  useEffect(() => {
    return () => {
      closeSegment();
    };
  }, [closeSegment]);

  const recordToggle = useCallback(() => {
    stateRef.current.simulationToggles += 1;
    flush();
  }, [flush]);

  const recordChatTurn = useCallback(
    (surface: ChatSurface) => {
      stateRef.current.chatTurns[surface] += 1;
      flush();
    },
    [flush],
  );

  const recordMcqAttempt = useCallback(
    (mcqId: "mcq1" | "mcq2", isCorrect: boolean) => {
      const stats = stateRef.current[mcqId];
      if (stats.attempts === 0 && isCorrect) {
        stats.firstTryCorrect = true;
      }
      stats.attempts += 1;
      if (!isCorrect) stats.wrongAttempts += 1;
      flush();
    },
    [flush],
  );

  // Republish snapshot when step changes so consumers see fresh timing buckets.
  useEffect(() => {
    flush();
  }, [step, flush]);

  return { snapshot, recordToggle, recordChatTurn, recordMcqAttempt };
}
```

Also add `useEffect` to the top-level import in the file:
```ts
import { useCallback, useEffect, useRef, useState } from "react";
```

The closing call to `flush()` inside the step-change effect already publishes after each rerender. Snapshot reads only reflect *closed* segments — open-segment time is captured on the next transition or unmount. That matches how the tests poll after a `rerender`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/useLessonAnalytics.test.ts`
Expected: PASS — all 10 tests pass (5 counter + 5 timing).

- [ ] **Step 5: Commit**

```bash
git add lib/useLessonAnalytics.ts tests/useLessonAnalytics.test.ts
git commit -m "Time per-step active duration with visibility pause"
```

---

## Task 4: `SessionMetrics` component

**Files:**
- Create: `components/SessionMetrics.tsx`
- Test: `tests/SessionMetrics.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/SessionMetrics.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionMetrics } from "@/components/SessionMetrics";
import type { AnalyticsSnapshot } from "@/lib/useLessonAnalytics";

const baseline: AnalyticsSnapshot = {
  totalActiveMs: 222_000,
  perStep: [
    { step: "reading1", activeMs: 74_000 },
    { step: "mcq1", activeMs: 35_000 },
    { step: "simulation", activeMs: 48_000 },
    { step: "mcq2", activeMs: 22_000 },
    { step: "voiceTutor", activeMs: 43_000 },
  ],
  mcq1: { attempts: 2, wrongAttempts: 1, firstTryCorrect: false },
  mcq2: { attempts: 1, wrongAttempts: 0, firstTryCorrect: true },
  simulationToggles: 3,
  chatTurns: { remediation1: 2, remediation2: 0, finalRecap: 5 },
};

describe("SessionMetrics", () => {
  it("renders the total active time", () => {
    render(<SessionMetrics snapshot={baseline} />);
    expect(screen.getByText(/total active time/i)).toBeInTheDocument();
    expect(screen.getByText("3m 42s")).toBeInTheDocument();
  });

  it("renders each timed step with its formatted duration", () => {
    render(<SessionMetrics snapshot={baseline} />);
    expect(screen.getByText(/^Reading$/)).toBeInTheDocument();
    expect(screen.getByText("1m 14s")).toBeInTheDocument();
    expect(screen.getByText(/^Question 1$/)).toBeInTheDocument();
    expect(screen.getByText("35s")).toBeInTheDocument();
    expect(screen.getByText(/^Simulation$/)).toBeInTheDocument();
    expect(screen.getByText("48s")).toBeInTheDocument();
    expect(screen.getByText(/^Question 2$/)).toBeInTheDocument();
    expect(screen.getByText("22s")).toBeInTheDocument();
    expect(screen.getByText(/voice \/ text recap/i)).toBeInTheDocument();
    expect(screen.getByText("43s")).toBeInTheDocument();
  });

  it("formats MCQ attempts as 'N (M wrong)' when wrongAttempts > 0", () => {
    render(<SessionMetrics snapshot={baseline} />);
    expect(screen.getByText(/2 \(1 wrong\)/)).toBeInTheDocument();
  });

  it("formats MCQ attempts as 'first try ✓' when firstTryCorrect", () => {
    render(<SessionMetrics snapshot={baseline} />);
    expect(screen.getByText(/first try/i)).toBeInTheDocument();
  });

  it("renders zero rows rather than collapsing empty engagement", () => {
    const empty: AnalyticsSnapshot = {
      ...baseline,
      simulationToggles: 0,
      chatTurns: { remediation1: 0, remediation2: 0, finalRecap: 0 },
    };
    render(<SessionMetrics snapshot={empty} />);
    expect(screen.getByText(/simulation toggles/i)).toBeInTheDocument();
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });

  it("renders a step with no recorded time as 0s", () => {
    const partial: AnalyticsSnapshot = {
      ...baseline,
      perStep: [{ step: "reading1", activeMs: 5_000 }],
    };
    render(<SessionMetrics snapshot={partial} />);
    expect(screen.getByText("5s")).toBeInTheDocument();
    expect(screen.getAllByText("0s").length).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/SessionMetrics.test.tsx`
Expected: FAIL — `Cannot find module '@/components/SessionMetrics'`

- [ ] **Step 3: Implement `SessionMetrics`**

```tsx
// components/SessionMetrics.tsx
import { formatMs } from "@/lib/formatDuration";
import type {
  AnalyticsSnapshot,
  McqStats,
  TimedStep,
} from "@/lib/useLessonAnalytics";

interface Props {
  snapshot: AnalyticsSnapshot;
}

const STEP_LABELS: Record<TimedStep, string> = {
  reading1: "Reading",
  mcq1: "Question 1",
  simulation: "Simulation",
  mcq2: "Question 2",
  voiceTutor: "Voice / text recap",
};

const STEP_ORDER: TimedStep[] = [
  "reading1",
  "mcq1",
  "simulation",
  "mcq2",
  "voiceTutor",
];

function formatMcq(stats: McqStats): string {
  if (stats.attempts === 0) return "0";
  if (stats.firstTryCorrect && stats.wrongAttempts === 0) {
    return "1 (first try ✓)";
  }
  if (stats.wrongAttempts > 0) {
    return `${stats.attempts} (${stats.wrongAttempts} wrong)`;
  }
  return String(stats.attempts);
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-3 text-[14px] leading-[1.55]">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-text-strong tabular-nums">{value}</span>
    </div>
  );
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.08em] text-text-strong font-semibold">
      {children}
    </div>
  );
}

export function SessionMetrics({ snapshot }: Props) {
  const stepDurations = new Map(
    snapshot.perStep.map((s) => [s.step, s.activeMs]),
  );

  return (
    <section
      aria-label="Session metrics"
      className="flex flex-col gap-4 p-4 bg-surface-muted rounded-2xl w-full"
    >
      <GroupHeading>Session metrics</GroupHeading>

      <Row label="Total active time" value={formatMs(snapshot.totalActiveMs)} />

      <div className="flex flex-col gap-2">
        <GroupHeading>Time per step</GroupHeading>
        {STEP_ORDER.map((step) => (
          <Row
            key={step}
            label={STEP_LABELS[step]}
            value={formatMs(stepDurations.get(step) ?? 0)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <GroupHeading>Engagement</GroupHeading>
        <Row label="Question 1 attempts" value={formatMcq(snapshot.mcq1)} />
        <Row label="Question 2 attempts" value={formatMcq(snapshot.mcq2)} />
        <Row label="Simulation toggles" value={snapshot.simulationToggles} />
        <Row
          label="Remediation chat turns"
          value={snapshot.chatTurns.remediation1 + snapshot.chatTurns.remediation2}
        />
        <Row label="Final recap chat turns" value={snapshot.chatTurns.finalRecap} />
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/SessionMetrics.test.tsx`
Expected: PASS — all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/SessionMetrics.tsx tests/SessionMetrics.test.tsx
git commit -m "Add SessionMetrics panel component"
```

---

## Task 5: Thread `onUserSent` through `useChat`

**Files:**
- Modify: `lib/useChat.ts`

- [ ] **Step 1: Add optional `onUserSent` to `UseChatOptions`**

Replace the `UseChatOptions` interface and the guard block inside `send()`:

```ts
interface UseChatOptions {
  buildBody: (messages: ChatMessage[]) => unknown;
  /** Fires once per accepted user send, after input/busy guards pass. */
  onUserSent?: () => void;
}
```

```ts
async function send() {
  if (!input.trim() || busy) return;
  onUserSent?.();
  const next: ChatMessage[] = [
    ...messages,
    { role: "user", content: input.trim() },
  ];
  // ... unchanged below
}
```

Destructure `onUserSent` at the top of the hook body:
```ts
export function useChat({ buildBody, onUserSent }: UseChatOptions): UseChatResult {
```

- [ ] **Step 2: Run the existing test suite to confirm no regression**

Run: `npx vitest run`
Expected: PASS — every previously green test stays green.

- [ ] **Step 3: Commit**

```bash
git add lib/useChat.ts
git commit -m "Surface user-send events from useChat"
```

---

## Task 6: Thread `onUserSent` through `FollowUpChat` and `TextRecapChat`

**Files:**
- Modify: `components/FollowUpChat.tsx`
- Modify: `components/TextRecapChat.tsx`

- [ ] **Step 1: Add optional prop to `FollowUpChat`**

Edit `components/FollowUpChat.tsx`:

```ts
interface Props {
  misconceptionTag: string;
  onClose: () => void;
  onUserSent?: () => void;
}

export function FollowUpChat({ misconceptionTag, onClose, onUserSent }: Props) {
  const { messages, input, setInput, busy, send } = useChat({
    buildBody: (msgs) => ({
      context: "follow_up",
      misconceptionTag,
      messages: msgs,
    }),
    onUserSent,
  });
  // ... unchanged below
```

- [ ] **Step 2: Add optional prop to `TextRecapChat`**

Edit `components/TextRecapChat.tsx`:

```ts
interface Props {
  onDone: () => void;
  onUserSent?: () => void;
}

export function TextRecapChat({ onDone, onUserSent }: Props) {
  const { messages, input, setInput, busy, send } = useChat({
    buildBody: (msgs) => ({
      context: "voice_fallback",
      messages: msgs,
    }),
    onUserSent,
  });
  // ... unchanged below
```

- [ ] **Step 3: Run full test suite to confirm no regression**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/FollowUpChat.tsx components/TextRecapChat.tsx
git commit -m "Forward chat send events through chat components"
```

---

## Task 7: Thread `onChatTurn` through `RemediationScreen` and `VoiceTutorScreen`

**Files:**
- Modify: `components/RemediationScreen.tsx`
- Modify: `components/VoiceTutorScreen.tsx`

- [ ] **Step 1: Edit `RemediationScreen`**

```ts
interface Props {
  wrongOption: MCQOption;
  onAdvance: () => void;
  onChatTurn?: () => void;
}

export function RemediationScreen({
  wrongOption,
  onAdvance,
  onChatTurn,
}: Props) {
  // ... unchanged ...
  {chatOpen && wrongOption.misconceptionTag && (
    <FollowUpChat
      misconceptionTag={wrongOption.misconceptionTag}
      onClose={() => setChatOpen(false)}
      onUserSent={onChatTurn}
    />
  )}
```

- [ ] **Step 2: Edit `VoiceTutorScreen`**

```ts
interface Props {
  onAdvance: () => void;
  onChatTurn?: () => void;
}

export function VoiceTutorScreen({ onAdvance, onChatTurn }: Props) {
  // ... unchanged ...
  {mode === "text" ? (
    <TextRecapChat onDone={onAdvance} onUserSent={onChatTurn} />
  ) : (
    // ... unchanged ...
  )}
```

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/RemediationScreen.tsx components/VoiceTutorScreen.tsx
git commit -m "Forward chat-turn callbacks from screens"
```

---

## Task 8: Add `onToggle` to `SimulationScreen`

**Files:**
- Modify: `components/SimulationScreen.tsx`
- Modify: `tests/SimulationScreen.test.tsx`

- [ ] **Step 1: Add a failing test asserting the callback fires**

Append to `tests/SimulationScreen.test.tsx` inside the existing `describe("SimulationScreen toggle behavior", ...)` block (or its own describe):

```ts
import { vi } from "vitest";

describe("SimulationScreen analytics callbacks", () => {
  it("calls onToggle each time the toggle is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <SimulationScreen onAdvance={() => {}} onToggle={onToggle} />,
    );
    const toggle = screen.getByRole("checkbox");
    await user.click(toggle);
    await user.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(2);
  });
});
```

(Top-of-file: `vi` may already be imported; if not, add `vi` to the existing `vitest` import.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/SimulationScreen.test.tsx`
Expected: FAIL — `Property 'onToggle' does not exist on type ...` or the assertion fails.

- [ ] **Step 3: Add `onToggle` to `SimulationScreen`**

Edit `components/SimulationScreen.tsx`:

```ts
interface Props {
  onAdvance: () => void;
  onToggle?: () => void;
}

export function SimulationScreen({ onAdvance, onToggle }: Props) {
  const [secondBond, setSecondBond] = useState(false);
  const [hasToggled, setHasToggled] = useState(false);
  const { oneBond, twoBond } = curriculum.simulationCaptions;

  const handleToggle = (next: boolean) => {
    setSecondBond(next);
    setHasToggled(true);
    onToggle?.();
  };
  // ... unchanged below
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/SimulationScreen.test.tsx`
Expected: PASS — 7 tests pass (6 existing + 1 new).

- [ ] **Step 5: Commit**

```bash
git add components/SimulationScreen.tsx tests/SimulationScreen.test.tsx
git commit -m "Emit onToggle from SimulationScreen for analytics"
```

---

## Task 9: Render `SessionMetrics` on `CompletionScreen`

**Files:**
- Modify: `components/CompletionScreen.tsx`

- [ ] **Step 1: Add optional `snapshot` prop and render the panel**

Edit `components/CompletionScreen.tsx`:

```tsx
import { BrandMark } from "./BrandMark";
import { SessionMetrics } from "./SessionMetrics";
import type { AnalyticsSnapshot } from "@/lib/useLessonAnalytics";

interface Props {
  onRestart: () => void;
  snapshot?: AnalyticsSnapshot;
}

export function CompletionScreen({ onRestart, snapshot }: Props) {
  return (
    <section className="flex-1 flex flex-col justify-start items-start gap-5 max-w-md">
      <BrandMark size={36} />
      <h2 className="text-2xl font-semibold text-text-strong leading-tight tracking-[-0.01em]">
        Lesson complete
      </h2>
      <p className="text-base leading-relaxed text-text-muted">
        Quick recap to take with you: in a residential system, neutral and
        ground are bonded at exactly one point — the service disconnect. Any
        second bond downstream creates parallel return paths through the EGC
        and bonded metal, putting load current and touch voltage where they
        should never be.
      </p>
      {snapshot && <SessionMetrics snapshot={snapshot} />}
      <button
        type="button"
        onClick={onRestart}
        className="px-5 py-3 rounded-2xl border border-border text-text-strong font-medium hover:bg-canvas"
      >
        Restart lesson
      </button>
    </section>
  );
}
```

Note: changed `justify-center` to `justify-start` on the outer section so the now-taller content lays out from the top rather than centering off-screen.

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/CompletionScreen.tsx
git commit -m "Render session metrics on completion screen"
```

---

## Task 10: Wire the hook into `app/lesson/page.tsx`

**Files:**
- Modify: `app/lesson/page.tsx`

- [ ] **Step 1: Instantiate the hook and thread callbacks**

Edit `app/lesson/page.tsx`:

```tsx
"use client";

import { useReducer } from "react";
import { LessonShell } from "@/components/LessonShell";
import { ReadingScreen } from "@/components/ReadingScreen";
import { MCQuestionScreen } from "@/components/MCQuestionScreen";
import { RemediationScreen } from "@/components/RemediationScreen";
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
        />
      )}

      {state.step === "mcq1" && (
        <MCQuestionScreen
          mcq={curriculum.mcq1}
          onAnswer={(opt) => {
            analytics.recordMcqAttempt("mcq1", opt.isCorrect);
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq1", optionId: opt.id });
          }}
        />
      )}

      {state.step === "remediation1" && state.lastWrongOptionId && (
        <RemediationScreen
          wrongOption={
            curriculum.mcq1.options.find(
              (o) => o.id === state.lastWrongOptionId,
            )!
          }
          onAdvance={() => dispatch({ type: "ADVANCE" })}
          onChatTurn={() => analytics.recordChatTurn("remediation1")}
        />
      )}

      {state.step === "simulation" && (
        <SimulationScreen
          onAdvance={() => dispatch({ type: "ADVANCE" })}
          onToggle={analytics.recordToggle}
        />
      )}

      {state.step === "mcq2" && (
        <MCQuestionScreen
          mcq={curriculum.mcq2}
          onAnswer={(opt) => {
            analytics.recordMcqAttempt("mcq2", opt.isCorrect);
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq2", optionId: opt.id });
          }}
        />
      )}

      {state.step === "remediation2" && state.lastWrongOptionId && (
        <RemediationScreen
          wrongOption={
            curriculum.mcq2.options.find(
              (o) => o.id === state.lastWrongOptionId,
            )!
          }
          onAdvance={() => dispatch({ type: "ADVANCE" })}
          onChatTurn={() => analytics.recordChatTurn("remediation2")}
        />
      )}

      {state.step === "voiceTutor" && (
        <VoiceTutorScreen
          onAdvance={() => dispatch({ type: "ADVANCE" })}
          onChatTurn={() => analytics.recordChatTurn("finalRecap")}
        />
      )}

      {state.step === "done" && (
        <CompletionScreen
          onRestart={() => dispatch({ type: "RESTART_LESSON" })}
          snapshot={analytics.snapshot}
        />
      )}
    </LessonShell>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (no output).

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: PASS — all suites pass.

- [ ] **Step 4: Commit**

```bash
git add app/lesson/page.tsx
git commit -m "Wire useLessonAnalytics into lesson page"
```

---

## Task 11: Manual smoke test

This is not a code task — it's the verification the spec calls for.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Open the lesson in a browser.

- [ ] **Step 2: Run through a happy path**

Walk through: intro → reading → answer Q1 correctly → simulation (toggle at least once) → answer Q2 correctly → text recap (send 1-2 turns) → done.
On the completion screen, confirm:
- Total active time ≈ wall clock minus any time the tab was hidden
- Each per-step row has a non-zero duration
- "Question 1 attempts" shows `1 (first try ✓)`
- "Simulation toggles" matches what you clicked
- "Final recap chat turns" matches your sends

- [ ] **Step 3: Run through a wrong-answer path**

Restart. This time answer Q1 wrong, open the follow-up chat, send 2 turns, close, retry correctly. Confirm:
- "Question 1 attempts" shows `2 (1 wrong)`
- "Remediation chat turns" shows `2`
- mcq1's time includes the remediation time (compare to wall clock)

- [ ] **Step 4: Verify visibility pause**

Restart, advance to reading, switch tabs for ~10 seconds, switch back, advance immediately. The reading step's recorded time should be the active-tab time only.

- [ ] **Step 5: Final typecheck + test run**

Run: `npx tsc --noEmit && npx vitest run`
Expected: both green.

---

## Self-Review Notes

- **Spec coverage:** every section in the spec maps to at least one task (formatDuration → Task 1; hook scaffolding → Task 2; timing/visibility → Task 3; UI → Task 4; chat plumbing → Tasks 5-7; sim toggle → Task 8; CompletionScreen render → Task 9; wiring → Task 10; manual smoke → Task 11).
- **MCQuestionScreen modification:** the spec listed it as modified, but the cleaner design wires the call from `app/lesson/page.tsx` where both `mcqId` and `isCorrect` are already available. The plan reflects this and the spec's "Files Modified" table should be read accordingly.
- **`useChat.ts` modification:** the spec's "files modified" table omitted `useChat.ts`. The plan adds it (Task 5) because forwarding `onUserSent` from the hook gives both chat surfaces correct guard semantics for free; duplicating the guard in each component would have been worse.
- **Type consistency:** `TimedStep`, `ChatSurface`, `AnalyticsSnapshot`, `McqStats`, and recorder signatures are defined once in Task 2 and referenced consistently in Tasks 3, 4, 8, 9, 10.
