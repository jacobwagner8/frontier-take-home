import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

  it("clears all counters and timing buckets when reset() is called", () => {
    const { result, rerender } = renderHook(
      ({ step }) => useLessonAnalytics(step),
      { initialProps: { step: "mcq1" as const } },
    );
    act(() => {
      result.current.recordMcqAttempt("mcq1", false);
      result.current.recordMcqAttempt("mcq1", true);
      result.current.recordToggle();
      result.current.recordChatTurn("finalRecap");
    });
    rerender({ step: "mcq1" });
    expect(result.current.snapshot.mcq1.attempts).toBe(2);
    expect(result.current.snapshot.simulationToggles).toBe(1);
    expect(result.current.snapshot.chatTurns.finalRecap).toBe(1);

    act(() => {
      result.current.reset();
    });

    expect(result.current.snapshot.mcq1).toEqual({
      attempts: 0,
      wrongAttempts: 0,
      firstTryCorrect: false,
    });
    expect(result.current.snapshot.simulationToggles).toBe(0);
    expect(result.current.snapshot.chatTurns).toEqual({
      remediation1: 0,
      remediation2: 0,
      finalRecap: 0,
    });
    expect(result.current.snapshot.perStep).toEqual([]);
  });
});

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
