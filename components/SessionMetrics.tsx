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
      <p className="text-[12px] leading-[1.5] text-text-muted italic">
        Shown here to illustrate a few metrics we could easily track. Students
        wouldn&apos;t see this panel in production — these events would be piped
        to dashboarding tools and analytics infrastructure on the Frontier
        backend.
      </p>

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
        <Row label="Final recap text turns" value={snapshot.chatTurns.finalRecap} />
      </div>
    </section>
  );
}
