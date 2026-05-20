import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

const STUDENT_FIRST_NAME = "Jake";
const STUDENT_FULL_NAME = "Jake Wagner";
const STUDENT_INITIALS = "JW";

const COURSE_NAME = "Electrical Fundamentals";
const DAY_NUMBER = 4;
const LESSONS_COMPLETED = 3;
const LESSONS_TOTAL = 30;

const TODAY_LESSON_NUMBER = 4;
const TODAY_LESSON_DURATION = "5–10 min";
const TODAY_LESSON_TITLE = "Neutral & Ground Bonding";
const TODAY_LESSON_TAGLINE = "One bond, exactly one place.";

const NEXT_LESSON_LABEL = "Lesson 5 — GFCI vs AFCI";

export default function Home() {
  const progressPercent = (LESSONS_COMPLETED / LESSONS_TOTAL) * 100;

  return (
    <div className="min-h-dvh flex flex-col bg-canvas text-text">
      <header className="px-4 pt-5 pb-3">
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark />
            <span className="text-base font-semibold text-text-strong tracking-[-0.01em]">
              Frontier
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand text-white text-[11px] font-semibold"
            >
              {STUDENT_INITIALS}
            </span>
            <span className="text-sm text-text-muted">
              <span className="sr-only">Signed in as </span>
              {STUDENT_FULL_NAME}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pb-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2 max-w-md">
          <div className="text-[11px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
            {COURSE_NAME}
          </div>
          <h1 className="text-2xl font-semibold text-text-strong leading-tight tracking-[-0.01em]">
            Hello again, {STUDENT_FIRST_NAME}.
          </h1>
          <div className="mt-1 flex items-center gap-3 text-xs text-text-subtle tabular-nums">
            <span>Day {DAY_NUMBER}</span>
            <span aria-hidden="true">·</span>
            <span>
              {LESSONS_COMPLETED} / {LESSONS_TOTAL} lessons
            </span>
          </div>
          <div
            className="mt-1 h-1 w-full bg-border rounded-full overflow-hidden"
            role="progressbar"
            aria-label="Course progress"
            aria-valuemin={0}
            aria-valuemax={LESSONS_TOTAL}
            aria-valuenow={LESSONS_COMPLETED}
          >
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <section className="max-w-md rounded-2xl border border-border bg-surface-muted p-5 flex flex-col gap-3">
          <div className="text-[11px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
            Today&apos;s lesson · Lesson {TODAY_LESSON_NUMBER} · {TODAY_LESSON_DURATION}
          </div>
          <h2 className="text-xl font-semibold text-text-strong leading-tight">
            {TODAY_LESSON_TITLE}
          </h2>
          <p className="text-base leading-relaxed text-text-muted">
            {TODAY_LESSON_TAGLINE}
          </p>
          <Link
            href="/lesson"
            className="self-start mt-2 px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)] hover:opacity-95"
          >
            Start lesson →
          </Link>
        </section>

        <p className="max-w-md text-sm text-text-subtle">
          Up next: {NEXT_LESSON_LABEL}
        </p>
      </main>
    </div>
  );
}
