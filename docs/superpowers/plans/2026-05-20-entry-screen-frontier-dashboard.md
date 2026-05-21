# Entry Screen — Frontier Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the `/` entry screen as today's lesson card inside a mock Frontier learning platform, and surface the "Frontier" brand on that page. Spec: `docs/superpowers/specs/2026-05-20-entry-screen-frontier-dashboard-design.md`.

**Architecture:** A single-page rewrite of `app/page.tsx` with all mock platform data as inline constants at the top of the file. No new components — `BrandMark` is reused, all other styling uses existing Tailwind tokens from `app/globals.css`. `LessonShell` and the lesson flow are untouched (Frontier branding is entry-only). `app/layout.tsx` metadata title is updated to surface the brand in the browser tab.

**Tech Stack:** Next 16 (App Router, `next/link`), React 19, Tailwind 4 (existing `@theme` tokens), no new dependencies.

> **Post-implementation note.** PR #43 review produced revisions that diverged from the embedded source below. Shipped state: course eyebrow reads "Electrical Fundamentals" (not "Residential Electrician Track"); greeting reads "Hello again, Jake." (time-of-day-neutral); header inner row wraps in `max-w-5xl mx-auto` for wide-viewport alignment; profile-chip visible name carries an `sr-only "Signed in as"` prefix; "Up next" line uses `<p>` instead of `<div>`; metadata title reads "Frontier — Electrical Fundamentals". The embedded code blocks below are left at planning-time intent — see the commit history on the branch for the final form.

---

## File Structure Overview

```
frontier-take-home/
├── app/
│   ├── layout.tsx          # MODIFY — metadata.title → "Frontier — Residential Electrician Track"
│   ├── page.tsx            # REWRITE — Frontier dashboard framing with today's lesson card
│   └── lesson/page.tsx     # unchanged
└── components/
    ├── BrandMark.tsx       # unchanged (reused as-is)
    ├── LessonShell.tsx     # unchanged
    └── ...                 # all other components unchanged
```

No new files. No new tests. The spec covers why: this is a static layout swap with no behavior beyond the existing `next/link` navigation.

---

## Task 1: Update `app/layout.tsx` metadata title

**Files:**
- Modify: `app/layout.tsx:11-15`

- [ ] **Step 1: Update `metadata.title`**

Open `app/layout.tsx`. Change the `title` field inside the `metadata` export. Leave `description` and everything else alone.

Before:

```tsx
export const metadata: Metadata = {
  title: "Neutral & Ground Bonding — Electrical Fundamentals",
  description:
    "A 5-10 minute lesson on why a residential electrical system bonds neutral and ground at exactly one point.",
};
```

After:

```tsx
export const metadata: Metadata = {
  title: "Frontier — Residential Electrician Track",
  description:
    "A 5-10 minute lesson on why a residential electrical system bonds neutral and ground at exactly one point.",
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors. (Next 16 builds the production bundle and runs typechecking.)

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "Update browser tab title to Frontier branding"
```

---

## Task 2: Rewrite `app/page.tsx` as the Frontier dashboard

**Files:**
- Modify: `app/page.tsx` (full rewrite, currently 25 lines)

- [ ] **Step 1: Replace `app/page.tsx` with the dashboard layout**

Open `app/page.tsx`. Replace the entire file contents with:

```tsx
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

const STUDENT_FIRST_NAME = "Jake";
const STUDENT_FULL_NAME = "Jake Wagner";
const STUDENT_INITIALS = "JW";

const COURSE_NAME = "Residential Electrician Track";
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
      <header className="px-4 pt-5 pb-3 flex items-center justify-between">
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
          <span className="text-sm text-text-muted">{STUDENT_FULL_NAME}</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pb-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2 max-w-md">
          <div className="text-[11px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
            {COURSE_NAME}
          </div>
          <h1 className="text-2xl font-semibold text-text-strong leading-tight tracking-[-0.01em]">
            Good morning, {STUDENT_FIRST_NAME}.
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

        <div className="max-w-md text-sm text-text-subtle">
          Up next: {NEXT_LESSON_LABEL}
        </div>
      </main>
    </div>
  );
}
```

Notes on the choices baked into this code:

- Top header is not the `LessonShell` header (no progress bar, no lesson title, no "Electrical Fundamentals" eyebrow). The entry page mocks a platform shell, not a lesson shell — so it inlines its own layout. `LessonShell` is intentionally not reused here.
- Course progress bar uses the same markup pattern as `LessonShell`'s progress bar (`bg-border` track, `bg-brand` fill, ARIA `progressbar`) for visual consistency.
- The "Start lesson" link reuses the exact className from the old `app/page.tsx` so the CTA visual doesn't drift.
- Top-right profile chip is decorative (`aria-hidden` on the initials circle). The visible name is the only thing assistive tech sees there.

- [ ] **Step 2: Run the dev server and smoke-test manually**

Run: `npm run dev` and visit `http://localhost:3000/`.

Confirm:
- Top-left shows the green BrandMark + "Frontier" wordmark.
- Top-right shows a green `JW` circle + "Jake Wagner".
- Eyebrow: "RESIDENTIAL ELECTRICIAN TRACK" (uppercase, tracked, muted).
- Greeting: "Good morning, Jake."
- Progress row: "Day 4 · 3 / 30 lessons" with a thin progress bar filled to ~10%.
- Today's lesson card with the lesson title, tagline, and `Start lesson →` button.
- "Up next: Lesson 5 — GFCI vs AFCI" beneath the card.
- Clicking `Start lesson` routes to `/lesson` and the existing lesson flow appears unchanged.
- Browser tab title reads "Frontier — Residential Electrician Track".

Stop the dev server when done (Ctrl-C).

- [ ] **Step 3: Run tests and build**

Run: `npm run test:run`
Expected: PASS, 90 / 90 (no test files were touched, and no production code outside `app/page.tsx` and `app/layout.tsx` was touched).

Run: `npm run build`
Expected: build + typecheck succeed.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "Reframe entry screen as Frontier dashboard"
```

---

## Task 3: Final verification before handoff

**Files:** none modified — verification only.

- [ ] **Step 1: Re-run the full test suite**

Run: `npm run test:run`
Expected: 90 / 90 PASS.

- [ ] **Step 2: Re-run build and lint**

Run: `npm run build && npm run lint`
Expected: both pass with no errors.

- [ ] **Step 3: One more manual smoke pass through the full flow**

Run: `npm run dev`. From `http://localhost:3000/`:
- Confirm the dashboard renders as described in Task 2 Step 2.
- Click `Start lesson`. Confirm the intro screen reads "Let's get started…" exactly as before.
- Click `Begin`. Move through reading → MCQ 1 → simulation → MCQ 2 → voice tutor (or skip if no API key) → completion.
- Confirm the in-lesson header still shows the existing minimal BrandMark + "Electrical Fundamentals" eyebrow — i.e., the Frontier branding does NOT appear inside the lesson.

Stop the dev server.

- [ ] **Step 4: Confirm the working tree is clean**

Run: `git status`
Expected: `nothing to commit, working tree clean` — both task commits have landed.

---

## Out of scope (do not implement)

- New components, abstractions, or shared platform shell.
- Real progress, a lesson catalog, or any data layer.
- Auth, profile interactivity in the top-right chip.
- Changes to `LessonShell`, `BrandMark`, or any in-lesson screen.
- New automated tests (the spec explicitly opts out — coverage is the existing 80 tests staying green plus the manual smoke).
