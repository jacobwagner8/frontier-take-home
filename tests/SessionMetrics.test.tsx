import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionMetrics } from "@/components/SessionMetrics";
import type { AnalyticsSnapshot } from "@/lib/useLessonAnalytics";

const baseline: AnalyticsSnapshot = {
  totalActiveMs: 222_000,
  perStep: [
    { step: "reading1", activeMs: 74_000 },
    { step: "mcq1", activeMs: 35_000 },
    { step: "mcq1b", activeMs: 18_000 },
    { step: "mcq1c", activeMs: 12_000 },
    { step: "simulation", activeMs: 48_000 },
    { step: "mcq2", activeMs: 22_000 },
    { step: "voiceTutor", activeMs: 43_000 },
  ],
  mcq1: { attempts: 2, wrongAttempts: 1, firstTryCorrect: false },
  mcq1b: { attempts: 1, wrongAttempts: 0, firstTryCorrect: true },
  mcq1c: { attempts: 0, wrongAttempts: 0, firstTryCorrect: false },
  mcq2: { attempts: 1, wrongAttempts: 0, firstTryCorrect: true },
  simulationToggles: 3,
  chatTurns: {
    remediation1: 2,
    remediation1b: 0,
    remediation1c: 0,
    remediation2: 0,
    finalRecap: 5,
  },
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
    expect(screen.getByText(/^Reading Q1a$/)).toBeInTheDocument();
    expect(screen.getByText("35s")).toBeInTheDocument();
    expect(screen.getByText(/^Reading Q1b$/)).toBeInTheDocument();
    expect(screen.getByText("18s")).toBeInTheDocument();
    expect(screen.getByText(/^Reading Q1c$/)).toBeInTheDocument();
    expect(screen.getByText("12s")).toBeInTheDocument();
    expect(screen.getByText(/^Simulation$/)).toBeInTheDocument();
    expect(screen.getByText("48s")).toBeInTheDocument();
    expect(screen.getByText(/^Sim Q2$/)).toBeInTheDocument();
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
    expect(screen.getAllByText(/first try/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders zero rows rather than collapsing empty engagement", () => {
    const empty: AnalyticsSnapshot = {
      ...baseline,
      simulationToggles: 0,
      chatTurns: {
        remediation1: 0,
        remediation1b: 0,
        remediation1c: 0,
        remediation2: 0,
        finalRecap: 0,
      },
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
    expect(screen.getAllByText("0s").length).toBeGreaterThanOrEqual(6);
  });
});
