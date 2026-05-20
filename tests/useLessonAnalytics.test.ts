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
