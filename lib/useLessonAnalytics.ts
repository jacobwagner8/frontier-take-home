"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LessonStep, McqId } from "./lessonMachine";

export type TimedStep =
  | "reading1"
  | "mcq1"
  | "mcq1b"
  | "mcq1c"
  | "simulation"
  | "mcq2"
  | "voiceTutor";

/** Stable telemetry keys for MCQ follow-up chats; the "remediation*" naming
 * is historical (the inline-MCQ flow replaced the old RemediationScreen). */
export type ChatSurface =
  | "remediation1"
  | "remediation1b"
  | "remediation1c"
  | "remediation2"
  | "finalRecap";

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
  mcq1b: McqStats;
  mcq1c: McqStats;
  mcq2: McqStats;
  simulationToggles: number;
  chatTurns: Record<ChatSurface, number>;
}

interface MutableAnalytics {
  perStepMs: Partial<Record<TimedStep, number>>;
  mcq1: McqStats;
  mcq1b: McqStats;
  mcq1c: McqStats;
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
    mcq1b: emptyMcqStats(),
    mcq1c: emptyMcqStats(),
    mcq2: emptyMcqStats(),
    simulationToggles: 0,
    chatTurns: {
      remediation1: 0,
      remediation1b: 0,
      remediation1c: 0,
      remediation2: 0,
      finalRecap: 0,
    },
  };
}

const TIMED_STEP_ORDER: TimedStep[] = [
  "reading1",
  "mcq1",
  "mcq1b",
  "mcq1c",
  "simulation",
  "mcq2",
  "voiceTutor",
];

function timedStepFor(step: LessonStep): TimedStep | null {
  if (step === "intro" || step === "done") return null;
  return (TIMED_STEP_ORDER as readonly LessonStep[]).includes(step)
    ? (step as TimedStep)
    : null;
}

function snapshotFrom(m: MutableAnalytics): AnalyticsSnapshot {
  const perStep: StepTime[] = TIMED_STEP_ORDER.filter(
    (s) => m.perStepMs[s] !== undefined,
  ).map((s) => ({ step: s, activeMs: m.perStepMs[s] ?? 0 }));
  const totalActiveMs = perStep.reduce((acc, s) => acc + s.activeMs, 0);
  return {
    totalActiveMs,
    perStep,
    mcq1: { ...m.mcq1 },
    mcq1b: { ...m.mcq1b },
    mcq1c: { ...m.mcq1c },
    mcq2: { ...m.mcq2 },
    simulationToggles: m.simulationToggles,
    chatTurns: { ...m.chatTurns },
  };
}

export interface UseLessonAnalyticsResult {
  snapshot: AnalyticsSnapshot;
  recordToggle: () => void;
  recordChatTurn: (surface: ChatSurface) => void;
  recordMcqAttempt: (mcqId: McqId, isCorrect: boolean) => void;
  reset: () => void;
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
    snapshotFrom(emptyMutable()),
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
    const delta = performance.now() - start;
    if (delta > 0) {
      stateRef.current.perStepMs[active] =
        (stateRef.current.perStepMs[active] ?? 0) + delta;
    }
    segmentStartRef.current = null;
  }, []);

  const openSegment = useCallback(() => {
    if (activeStepRef.current === null) return;
    if (!visibleRef.current) return;
    segmentStartRef.current = performance.now();
  }, []);

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

  useEffect(() => {
    const nextStep = timedStepFor(step);
    if (nextStep === activeStepRef.current) return;
    closeSegment();
    activeStepRef.current = nextStep;
    openSegment();
    flush();
  }, [step, closeSegment, openSegment, flush]);

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
    (mcqId: McqId, isCorrect: boolean) => {
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

  const reset = useCallback(() => {
    stateRef.current = emptyMutable();
    activeStepRef.current = null;
    segmentStartRef.current = null;
    flush();
  }, [flush]);

  return { snapshot, recordToggle, recordChatTurn, recordMcqAttempt, reset };
}
