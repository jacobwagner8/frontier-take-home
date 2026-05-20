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
