# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the brainstormed Educational design direction (cream + teal + Inter) across every screen, plus replace the simulation SVG with the stylized-realistic panel cutaway. Spec: `docs/superpowers/specs/2026-05-19-ui-redesign-design.md`.

**Architecture:** Tailwind 4 CSS-first tokens in `app/globals.css` give every component a single source of truth for color and radius. Two tiny new components (`BrandMark`, `Toggle`) carry shared chrome. The rest is per-file style application — JSX shapes and component contracts stay the same, so the 27-test suite continues to pass.

**Tech Stack:** Tailwind 4 (`@theme inline`), Next 16 (`next/font/google` for Inter), React 19, native `<dialog>` (preserved from Phase 4), native `<input type=radio>` (preserved from Phase 1 review).

---

## File Structure Overview

```
frontier-take-home/
├── app/
│   ├── globals.css                 # extend @theme with new color/radius/shadow tokens
│   ├── layout.tsx                  # swap Geist → Inter; drop Geist Mono
│   ├── page.tsx                    # landing redesign (brand mark + headline + CTA)
│   └── lesson/page.tsx             # unchanged (just composes screens)
├── components/
│   ├── BrandMark.tsx               # NEW — 22×22 inline lightning-bolt SVG
│   ├── Toggle.tsx                  # NEW — visually-hidden checkbox + styled pill label
│   ├── LessonShell.tsx             # restyle header + progress bar to spec
│   ├── ReadingScreen.tsx           # restyle prose + CTA
│   ├── MCQuestionScreen.tsx        # restyle radio labels (brand-soft tint on selected)
│   ├── RemediationScreen.tsx       # restyle eyebrow + buttons
│   ├── SimulationScreen.tsx        # MAJOR: new SVG, new Toggle, new callout
│   ├── VoiceTutorScreen.tsx        # restyle status + transcript log + buttons
│   ├── FollowUpChat.tsx            # restyle dialog + input primitive
│   ├── TextRecapChat.tsx           # restyle input + Done CTA
│   └── CompletionScreen.tsx        # centered card + brand mark + restart
└── tests/                          # untouched — 27 tests must still pass after each task
```

---

## Phase 0 — Tokens, font, primitives

### Task 1: Extend `app/globals.css` with the design tokens

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace the existing `@theme inline` block**

Open `app/globals.css`. Replace the `@theme inline { ... }` block (currently containing the Geist font variables) with the spec's full token table:

```css
@theme inline {
  --font-sans: var(--font-inter);

  --color-canvas: #FAFAF7;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F5F5F0;

  --color-text: #1C1917;
  --color-text-strong: #0C0A09;
  --color-text-muted: #57534E;
  --color-text-subtle: #78716C;

  --color-border: #E7E5E4;

  --color-brand: #0F766E;
  --color-brand-soft: #CCFBF1;

  --color-neutral-wire: #A8A29E;
  --color-danger: #DC2626;

  --radius-card: 1rem;
  --radius-card-lg: 1.5rem;
}
```

- [ ] **Step 2: Update the `:root` and dark `@media` blocks**

Drop the existing `--background` / `--foreground` pair (replaced by canvas/text tokens). Remove the `prefers-color-scheme: dark` override entirely — the cream canvas works in both contexts and the spec is light-only. The file should now look like:

```css
@import "tailwindcss";

@theme inline {
  /* (the block from Step 1) */
}

body {
  background: var(--color-canvas);
  color: var(--color-text);
  font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
}

@keyframes current-flow {
  to {
    stroke-dashoffset: -100;
  }
}

.current-flow-n,
.current-flow-egc {
  animation: current-flow 1.5s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .current-flow-n,
  .current-flow-egc {
    animation: none;
  }
}
```

The keyframe block at the bottom carries over verbatim from Phase 2.

- [ ] **Step 3: Verify the build still compiles**

```bash
npm run build
```

Expected: clean build. The page will look broken (no font wired yet, components still use `slate-*` classes) — that's expected; the next tasks wire everything up.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "Add design tokens to @theme; drop dark-mode override"
```

---

### Task 2: Swap Geist → Inter in `app/layout.tsx`

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace the font imports and variables**

Open `app/layout.tsx`. Replace the existing `Geist` + `Geist_Mono` setup with Inter:

```tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Neutral & Ground Bonding — Electrical Fundamentals",
  description:
    "A 5-10 minute lesson on why a residential electrical system bonds neutral and ground at exactly one point.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

The `--font-inter` CSS variable is consumed by `--font-sans` from Task 1, so `font-sans` (Tailwind's default) and the body font both resolve to Inter.

- [ ] **Step 2: Verify the build**

```bash
npm run build
```

Expected: clean. The fetch for the Inter font happens at build time; if your dev environment can't reach Google Fonts, the build will still succeed (Next caches fallbacks).

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "Swap Geist + Geist Mono for Inter"
```

---

### Task 3: Build `BrandMark` component

**Files:**
- Create: `components/BrandMark.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/BrandMark.tsx
interface Props {
  size?: number;
  className?: string;
}

export function BrandMark({ size = 22, className }: Props) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center rounded-md bg-brand text-white ${className ?? ""}`}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    </span>
  );
}
```

`aria-hidden="true"` because the mark is decorative — the surrounding text ("Electrical Fundamentals") carries the meaning.

- [ ] **Step 2: Verify it compiles**

```bash
npm run build
```

Expected: clean (component is built into the bundle even though nothing renders it yet; Next tree-shakes if unused, but for now we just need it to typecheck).

- [ ] **Step 3: Commit**

```bash
git add components/BrandMark.tsx
git commit -m "Add BrandMark component (lightning bolt brand mark)"
```

---

### Task 4: Build `Toggle` component

**Files:**
- Create: `components/Toggle.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/Toggle.tsx
"use client";

import { useId } from "react";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  name?: string;
}

export function Toggle({ checked, onChange, label, name }: Props) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 cursor-pointer select-none py-2"
    >
      <span className="relative inline-block w-9 h-[22px] flex-shrink-0">
        <input
          id={id}
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className="absolute inset-0 rounded-full bg-border peer-checked:bg-brand transition-colors"
          aria-hidden="true"
        />
        <span
          className="absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform peer-checked:translate-x-[14px]"
          aria-hidden="true"
        />
      </span>
      <span className="text-base text-text">{label}</span>
    </label>
  );
}
```

The `<input type=checkbox>` is visually hidden via `sr-only` but stays in the focus order — Tab focuses it, Space toggles it, screen readers announce "checkbox, checked / unchecked" with the label text. The pill graphic uses the `peer` modifier to react to checkbox state without JavaScript.

- [ ] **Step 2: Verify it compiles**

```bash
npm run build
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/Toggle.tsx
git commit -m "Add accessible Toggle component (visually-hidden checkbox + pill label)"
```

---

## Phase 1 — Lesson shell + landing

### Task 5: Restyle `LessonShell`

**Files:**
- Modify: `components/LessonShell.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// components/LessonShell.tsx
import { ReactNode } from "react";
import { BrandMark } from "./BrandMark";

interface LessonShellProps {
  children: ReactNode;
  progress?: { current: number; total: number };
}

export function LessonShell({ children, progress }: LessonShellProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-canvas text-text">
      <header className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BrandMark />
            <div className="text-[11px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
              Electrical Fundamentals
            </div>
          </div>
          {progress && (
            <div className="text-[11px] text-text-subtle tabular-nums">
              {progress.current} / {progress.total}
            </div>
          )}
        </div>
        <h1 className="text-sm font-semibold text-text-strong">
          Neutral &amp; Ground Bonding
        </h1>
        {progress && (
          <div
            className="mt-3 h-1 w-full bg-border rounded-full overflow-hidden"
            role="progressbar"
            aria-label="Lesson progress"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.current}
          >
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{
                width: `${(progress.current / progress.total) * 100}%`,
              }}
            />
          </div>
        )}
      </header>
      <main className="flex-1 px-4 pb-8 flex flex-col gap-4">{children}</main>
    </div>
  );
}
```

Notable: the eyebrow now sits beside the brand mark with the step counter on the right of the same row, the page title moves below as `h1` (smaller — it's context, not the focal heading), and the progress bar is 4px tall (up from 1px) and rounded.

- [ ] **Step 2: Verify build + tests pass**

```bash
npm run build && npm run test:run
```

Expected: clean build, 27/27 tests pass.

- [ ] **Step 3: Commit**

```bash
git add components/LessonShell.tsx
git commit -m "Restyle LessonShell with brand mark and design tokens"
```

---

### Task 6: Restyle landing page (`app/page.tsx`)

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// app/page.tsx
import Link from "next/link";
import { LessonShell } from "@/components/LessonShell";

export default function Home() {
  return (
    <LessonShell>
      <div className="flex-1 flex flex-col justify-center items-start gap-6 max-w-md">
        <h2 className="text-2xl font-semibold text-text-strong leading-tight tracking-[-0.01em]">
          One bond, exactly one place.
        </h2>
        <p className="text-base leading-relaxed text-text-muted">
          A 5-10 minute lesson on why a residential electrical system bonds
          neutral and ground at exactly one point — and what physically goes
          wrong if there is more than one.
        </p>
        <Link
          href="/lesson"
          className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)] hover:opacity-95"
        >
          Start lesson
        </Link>
      </div>
    </LessonShell>
  );
}
```

The headline is now a real prose hook ("One bond, exactly one place.") that pre-states the lesson's thesis — the body explains.

- [ ] **Step 2: Verify build + tests pass**

```bash
npm run build && npm run test:run
```

Expected: clean, 27/27.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "Restyle landing page with new design tokens and headline"
```

---

## Phase 2 — Lesson content screens

### Task 7: Restyle `ReadingScreen`

**Files:**
- Modify: `components/ReadingScreen.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// components/ReadingScreen.tsx
import Image from "next/image";
import type { ReadingSection } from "@/lib/curriculum.types";

interface Props {
  section: ReadingSection;
  onAdvance: () => void;
  ctaLabel?: string;
}

export function ReadingScreen({
  section,
  onAdvance,
  ctaLabel = "Continue",
}: Props) {
  return (
    <article className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-text-strong leading-tight tracking-[-0.005em]">
        {section.title}
      </h2>
      {section.imageSrc && (
        <div className="rounded-2xl overflow-hidden border border-border bg-surface shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
          <Image
            src={section.imageSrc}
            alt={section.imageAlt ?? ""}
            width={800}
            height={500}
            className="w-full h-auto"
          />
        </div>
      )}
      <p className="text-[15px] leading-[1.6] text-text whitespace-pre-wrap">
        {section.body}
      </p>
      <button
        type="button"
        onClick={onAdvance}
        className="self-end px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
      >
        {ctaLabel}
      </button>
    </article>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run build && npm run test:run
```

Expected: clean, 27/27.

- [ ] **Step 3: Commit**

```bash
git add components/ReadingScreen.tsx
git commit -m "Restyle ReadingScreen prose + image card"
```

---

### Task 8: Restyle `MCQuestionScreen`

**Files:**
- Modify: `components/MCQuestionScreen.tsx`

- [ ] **Step 1: Replace the option-rendering block**

Replace the file with:

```tsx
// components/MCQuestionScreen.tsx
"use client";

import { useId, useState } from "react";
import type { MCQ, MCQOption } from "@/lib/curriculum.types";

interface Props {
  mcq: MCQ;
  onAnswer: (option: MCQOption) => void;
}

export function MCQuestionScreen({ mcq, onAnswer }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const promptId = useId();

  return (
    <section className="flex flex-col gap-5">
      <h2
        id={promptId}
        className="text-xl font-semibold text-text-strong leading-snug tracking-[-0.005em]"
      >
        {mcq.prompt}
      </h2>
      <div
        role="radiogroup"
        aria-labelledby={promptId}
        className="flex flex-col gap-2.5"
      >
        {mcq.options.map((opt) => {
          const isSelected = selectedId === opt.id;
          return (
            <label
              key={opt.id}
              className={`flex items-center gap-3 cursor-pointer w-full px-4 py-3.5 rounded-2xl border text-[15px] transition-colors ${
                isSelected
                  ? "border-brand bg-brand-soft/40"
                  : "border-border bg-surface hover:bg-canvas"
              }`}
            >
              <input
                type="radio"
                name={mcq.id}
                value={opt.id}
                checked={isSelected}
                onChange={() => setSelectedId(opt.id)}
                className="accent-brand w-4 h-4"
              />
              <span className="text-text">{opt.text}</span>
            </label>
          );
        })}
      </div>
      <button
        type="button"
        disabled={!selectedId}
        onClick={() => {
          const opt = mcq.options.find((o) => o.id === selectedId);
          if (opt) onAnswer(opt);
        }}
        className="self-end px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)] disabled:bg-border disabled:text-text-subtle disabled:shadow-none disabled:cursor-not-allowed"
      >
        Submit
      </button>
    </section>
  );
}
```

Notable: selected option gets a teal border + soft-teal background wash; hover gives a faint cream tint.

- [ ] **Step 2: Verify**

```bash
npm run build && npm run test:run
```

Expected: clean, 27/27.

- [ ] **Step 3: Commit**

```bash
git add components/MCQuestionScreen.tsx
git commit -m "Restyle MCQuestionScreen with brand-soft selected state"
```

---

### Task 9: Restyle `RemediationScreen`

**Files:**
- Modify: `components/RemediationScreen.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// components/RemediationScreen.tsx
"use client";

import { useState } from "react";
import type { MCQOption } from "@/lib/curriculum.types";
import { FollowUpChat } from "./FollowUpChat";

interface Props {
  wrongOption: MCQOption;
  onAdvance: () => void;
}

export function RemediationScreen({ wrongOption, onAdvance }: Props) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <section className="flex flex-col gap-4">
      <div role="status" aria-live="polite" className="flex flex-col gap-3">
        <div className="text-[11px] uppercase tracking-[0.08em] text-danger font-semibold">
          Not quite
        </div>
        <p className="text-[15px] leading-[1.6] text-text whitespace-pre-wrap">
          {wrongOption.remediation}
        </p>
      </div>
      <div className="flex gap-2 justify-end">
        {wrongOption.misconceptionTag && (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="px-4 py-3 rounded-2xl border border-border text-text-strong font-medium hover:bg-canvas"
          >
            Ask a follow-up
          </button>
        )}
        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
        >
          Try again
        </button>
      </div>
      {chatOpen && wrongOption.misconceptionTag && (
        <FollowUpChat
          misconceptionTag={wrongOption.misconceptionTag}
          onClose={() => setChatOpen(false)}
        />
      )}
    </section>
  );
}
```

The PR #5 review fix (scoped `role=status` wraps only the remediation prose, not the chat) is preserved verbatim — only the class strings change.

- [ ] **Step 2: Verify**

```bash
npm run build && npm run test:run
```

Expected: clean, 27/27.

- [ ] **Step 3: Commit**

```bash
git add components/RemediationScreen.tsx
git commit -m "Restyle RemediationScreen eyebrow and buttons"
```

---

## Phase 3 — Simulation redesign (the big one)

### Task 10: Replace the `SimulationScreen` SVG and surrounding chrome

**Files:**
- Modify: `components/SimulationScreen.tsx`

This task is large — touches the whole component — but stays one commit because the SVG redesign and the chrome restyling go together.

- [ ] **Step 1: Replace the file contents**

```tsx
// components/SimulationScreen.tsx
"use client";

import { useState } from "react";
import { curriculum } from "@/lib/curriculum";
import { Toggle } from "./Toggle";

interface Props {
  onAdvance: () => void;
}

export function SimulationScreen({ onAdvance }: Props) {
  const [secondBond, setSecondBond] = useState(false);
  const caption = secondBond
    ? curriculum.simulationCaptions.twoBond
    : curriculum.simulationCaptions.oneBond;

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-text-strong leading-tight tracking-[-0.005em]">
        See what happens with two bonds
      </h2>

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
        <svg
          viewBox="0 0 360 220"
          className="w-full h-auto"
          role="img"
          aria-label={
            secondBond
              ? "Diagram with a second neutral-to-ground bond at the subpanel; current now flows on both the neutral feeder and the EGC feeder."
              : "Diagram with a single neutral-to-ground bond at the main panel; current flows only on the neutral feeder."
          }
        >
          {/* Main panel */}
          <text
            x="80"
            y="18"
            textAnchor="middle"
            fontSize="10"
            fill="#0C0A09"
            fontWeight="700"
            letterSpacing="0.06em"
          >
            MAIN PANEL
          </text>
          <rect
            x="20"
            y="26"
            width="120"
            height="156"
            rx="6"
            fill="#FFFFFF"
            stroke="#1C1917"
            strokeWidth="2"
          />
          <rect x="28" y="34" width="104" height="6" fill="#0F766E" />

          {/* Breaker rows */}
          <rect x="28" y="46" width="44" height="10" rx="2" fill="#E7E5E4" />
          <rect x="78" y="46" width="44" height="10" rx="2" fill="#E7E5E4" />
          <rect x="28" y="60" width="44" height="10" rx="2" fill="#E7E5E4" />
          <rect x="78" y="60" width="44" height="10" rx="2" fill="#E7E5E4" />

          {/* Neutral bus */}
          <rect x="28" y="86" width="104" height="8" rx="2" fill="#A8A29E" />
          {[36, 56, 76, 96, 116].map((cx) => (
            <circle key={`n-${cx}`} cx={cx} cy="90" r="1.2" fill="#FFFFFF" />
          ))}
          <text
            x="80"
            y="106"
            textAnchor="middle"
            fontSize="8"
            fill="#57534E"
          >
            Neutral bus
          </text>

          {/* EGC bus */}
          <rect x="28" y="144" width="104" height="8" rx="2" fill="#0F766E" />
          {[36, 56, 76, 96, 116].map((cx) => (
            <circle key={`e-${cx}`} cx={cx} cy="148" r="1.2" fill="#FFFFFF" />
          ))}
          <text
            x="80"
            y="164"
            textAnchor="middle"
            fontSize="8"
            fill="#0F766E"
          >
            EGC bus
          </text>

          {/* Main bonding jumper */}
          <rect x="132" y="88" width="6" height="64" rx="2" fill="#DC2626" />
          <circle cx="135" cy="90" r="1.5" fill="#FFFFFF" />
          <circle cx="135" cy="150" r="1.5" fill="#FFFFFF" />
          <text
            x="148"
            y="124"
            fontSize="8"
            fill="#DC2626"
            fontWeight="700"
          >
            Main bond
          </text>

          {/* Neutral feeder (always animates) */}
          <line
            x1="142"
            y1="90"
            x2="240"
            y2="90"
            stroke="#A8A29E"
            strokeWidth="3.5"
            strokeDasharray="6 4"
            className="current-flow-n"
          />
          <text
            x="190"
            y="82"
            textAnchor="middle"
            fontSize="8"
            fill="#57534E"
          >
            Neutral feeder
          </text>

          {/* EGC feeder (animates only when secondBond) */}
          <line
            x1="142"
            y1="150"
            x2="240"
            y2="150"
            stroke="#0F766E"
            strokeWidth="3.5"
            strokeDasharray="6 4"
            className={secondBond ? "current-flow-egc" : ""}
          />
          <text
            x="190"
            y="166"
            textAnchor="middle"
            fontSize="8"
            fill="#0F766E"
          >
            EGC feeder
          </text>
          {secondBond && (
            <text
              x="190"
              y="180"
              textAnchor="middle"
              fontSize="9"
              fill="#DC2626"
              fontWeight="700"
            >
              ⚠ Current now flowing on the EGC
            </text>
          )}

          {/* Subpanel */}
          <text
            x="280"
            y="32"
            textAnchor="middle"
            fontSize="10"
            fill="#0C0A09"
            fontWeight="700"
            letterSpacing="0.06em"
          >
            SUBPANEL
          </text>
          <rect
            x="240"
            y="40"
            width="80"
            height="140"
            rx="5"
            fill="#FFFFFF"
            stroke="#1C1917"
            strokeWidth="2"
          />
          <rect x="246" y="46" width="68" height="5" fill="#0F766E" />
          <rect x="246" y="86" width="68" height="6" rx="2" fill="#A8A29E" />
          <rect x="246" y="146" width="68" height="6" rx="2" fill="#0F766E" />

          {/* Optional second bond */}
          {secondBond && (
            <>
              <rect
                x="314"
                y="88"
                width="6"
                height="64"
                rx="2"
                fill="#DC2626"
              />
              <circle cx="317" cy="90" r="1.5" fill="#FFFFFF" />
              <circle cx="317" cy="150" r="1.5" fill="#FFFFFF" />
            </>
          )}

          {/* Load */}
          <text
            x="280"
            y="216"
            textAnchor="middle"
            fontSize="9"
            fill="#0C0A09"
            fontWeight="600"
          >
            Load
          </text>
          <rect
            x="262"
            y="190"
            width="36"
            height="18"
            rx="3"
            fill="#F5F5F4"
            stroke="#1C1917"
            strokeWidth="1.2"
          />
          <circle
            cx="280"
            cy="199"
            r="3"
            fill="none"
            stroke="#1C1917"
            strokeWidth="1"
          />
          <line
            x1="280"
            y1="152"
            x2="280"
            y2="190"
            stroke="#A8A29E"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <div className="rounded-2xl border border-border bg-surface px-4 py-2">
        <Toggle
          checked={secondBond}
          onChange={setSecondBond}
          label="Add a second N-G bond at the subpanel"
        />
      </div>

      <div className="flex gap-3 p-4 bg-surface-muted rounded-2xl">
        <div className="w-[3px] bg-brand rounded-sm flex-shrink-0" />
        <p
          className="text-[14px] leading-[1.55] text-text-muted"
          aria-live="polite"
        >
          {caption}
        </p>
      </div>

      <button
        type="button"
        onClick={onAdvance}
        className="self-end px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
      >
        Continue
      </button>
    </section>
  );
}
```

Important behaviors preserved:
- `role="img"` + dynamic `aria-label` on the SVG (a11y from Phase 2)
- `aria-live="polite"` on the caption (a11y from Phase 2)
- `className="current-flow-n"` on the neutral feeder + conditional `current-flow-egc` on the EGC feeder (animation contract from Phase 2)
- The toggle is the new `Toggle` component which wraps a real `<input type=checkbox>` — keyboard accessible, screen-reader labeled.
- Second bond now renders as a red strap at the right edge of the subpanel (mirrors the main bond's visual language).

- [ ] **Step 2: Verify the simulation test still passes**

The two RTL tests in `tests/SimulationScreen.test.tsx` check:
1. Initial state has the one-bond caption, no EGC warning
2. After clicking the checkbox, caption swaps + EGC warning appears

Both must pass with the new Toggle component (which renders a checkbox via `role=checkbox`).

```bash
npm run test:run -- tests/SimulationScreen.test.tsx
```

Expected: 2/2 pass.

- [ ] **Step 3: Verify full test suite + build**

```bash
npm run test:run && npm run build
```

Expected: 27/27 tests, clean build.

- [ ] **Step 4: Commit**

```bash
git add components/SimulationScreen.tsx
git commit -m "Redesign SimulationScreen with stylized panel SVG and Toggle"
```

---

## Phase 4 — Voice tutor + chats

### Task 11: Restyle `VoiceTutorScreen`

**Files:**
- Modify: `components/VoiceTutorScreen.tsx`

- [ ] **Step 1: Update the styling on the existing structure**

Open `components/VoiceTutorScreen.tsx`. Keep all the state/effects/handlers exactly as they are. Replace only the JSX inside `return (` — find this block and replace it:

Current return block to replace:

```tsx
return (
  <section className="flex flex-col gap-4">
    {/* ... existing JSX ... */}
  </section>
);
```

New return block:

```tsx
return (
  <section className="flex flex-col gap-5">
    <h2 className="text-xl font-semibold text-text-strong leading-tight tracking-[-0.005em]">
      Talk it back
    </h2>
    <p className="text-[14px] text-text-muted leading-relaxed">
      {mode === "voice"
        ? "Last step: have a quick voice conversation with the tutor to make sure the concept stuck. Tap Start, allow microphone access, and explain in your own words."
        : "Type a recap of what you learned in your own words. The tutor will respond."}
    </p>

    {mode === "text" ? (
      <TextRecapChat onDone={onAdvance} />
    ) : (
      <>
        <p
          role="status"
          aria-live="polite"
          className="text-[13px] text-text-subtle"
        >
          {status === "idle" && "Tap Start to begin."}
          {status === "connecting" && "Connecting..."}
          {status === "live" && "Listening..."}
          {status === "stopped" && "Conversation ended."}
          {status === "error" && (errorMsg ?? "Something went wrong.")}
        </p>

        <div
          role="log"
          aria-live="polite"
          aria-atomic="false"
          className="rounded-2xl border border-border bg-surface-muted px-4 py-3 min-h-[140px] flex flex-col gap-2"
        >
          {transcript.map((line, i) => (
            <p key={i} className="text-[14px] leading-relaxed text-text">
              <span className="font-semibold mr-1 text-text-strong">
                {line.role === "user" ? "You:" : "Tutor:"}
              </span>
              {line.text}
            </p>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          {inactive ? (
            <>
              <button
                type="button"
                onClick={() => {
                  stopCall();
                  setMode("text");
                }}
                className="px-4 py-3 rounded-2xl border border-border text-text-strong font-medium hover:bg-canvas"
              >
                Type instead
              </button>
              <button
                type="button"
                onClick={startCall}
                className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
              >
                {status === "stopped" || status === "error"
                  ? "Try again"
                  : "Start"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={stopCall}
                className="px-4 py-3 rounded-2xl border border-border text-text-strong font-medium hover:bg-canvas"
              >
                Stop
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCall();
                  onAdvance();
                }}
                className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
              >
                Done
              </button>
            </>
          )}
        </div>
      </>
    )}
  </section>
);
```

All semantic structure preserved — `role=status` on status pill, `role=log` + `aria-live=polite` on transcript, mode swap to text fallback, all state machine handlers untouched.

- [ ] **Step 2: Verify**

```bash
npm run test:run && npm run build
```

Expected: 27/27 tests, clean build.

- [ ] **Step 3: Commit**

```bash
git add components/VoiceTutorScreen.tsx
git commit -m "Restyle VoiceTutorScreen with callout transcript log"
```

---

### Task 12: Restyle `FollowUpChat`

**Files:**
- Modify: `components/FollowUpChat.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// components/FollowUpChat.tsx
"use client";

import { useEffect, useId, useRef } from "react";
import { useChat } from "@/lib/useChat";

interface Props {
  misconceptionTag: string;
  onClose: () => void;
}

export function FollowUpChat({ misconceptionTag, onClose }: Props) {
  const { messages, input, setInput, busy, send } = useChat({
    buildBody: (msgs) => ({
      context: "follow_up",
      misconceptionTag,
      messages: msgs,
    }),
  });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    inputRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  function requestClose() {
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) requestClose();
      }}
      aria-labelledby={titleId}
      className="w-full max-w-md max-h-[80dvh] bg-surface rounded-3xl p-0 m-auto backdrop:bg-[#1C1917]/40"
    >
      <div className="flex flex-col max-h-[80dvh]">
        <header className="px-5 py-4 border-b border-border flex justify-between items-center">
          <h3 id={titleId} className="font-semibold text-base text-text-strong">
            Ask a follow-up
          </h3>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close follow-up chat"
            className="text-text-subtle text-sm hover:text-text-strong"
          >
            Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <p className="text-[14px] text-text-subtle">
              Ask anything about why this is wrong.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`text-[14px] leading-relaxed ${
                m.role === "user" ? "text-text-strong" : "text-text"
              }`}
            >
              <span className="font-semibold mr-1">
                {m.role === "user" ? "You:" : "Tutor:"}
              </span>
              {m.content}
            </div>
          ))}
          {busy && (
            <p className="text-[14px] text-text-subtle" aria-live="polite">
              Thinking...
            </p>
          )}
        </div>
        <div className="p-4 border-t border-border flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Type your question"
            aria-label="Your question"
            className="flex-1 border border-border rounded-xl px-4 py-3 text-base bg-canvas focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="button"
            onClick={send}
            disabled={busy || !input.trim()}
            className="px-4 py-3 rounded-xl bg-brand text-white font-semibold disabled:bg-border disabled:text-text-subtle disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </dialog>
  );
}
```

All the dialog mechanics (focus trap, focus return, ESC handling, backdrop click) from PR #5 are preserved — only class strings and the backdrop tint changed.

- [ ] **Step 2: Verify**

```bash
npm run test:run && npm run build
```

Expected: 27/27, clean build.

- [ ] **Step 3: Commit**

```bash
git add components/FollowUpChat.tsx
git commit -m "Restyle FollowUpChat dialog with design tokens"
```

---

### Task 13: Restyle `TextRecapChat`

**Files:**
- Modify: `components/TextRecapChat.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// components/TextRecapChat.tsx
"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@/lib/useChat";

interface Props {
  onDone: () => void;
}

export function TextRecapChat({ onDone }: Props) {
  const { messages, input, setInput, busy, send } = useChat({
    buildBody: (msgs) => ({
      context: "voice_fallback",
      messages: msgs,
    }),
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div
        role="log"
        aria-live="polite"
        aria-atomic="false"
        className="rounded-2xl border border-border bg-surface-muted p-4 min-h-[140px] flex flex-col gap-2"
      >
        {messages.length === 0 && (
          <p className="text-[14px] text-text-subtle">
            Recap what you learned in your own words.
          </p>
        )}
        {messages.map((m, i) => (
          <p key={i} className="text-[14px] leading-relaxed text-text">
            <span className="font-semibold mr-1 text-text-strong">
              {m.role === "user" ? "You:" : "Tutor:"}
            </span>
            {m.content}
          </p>
        ))}
        {busy && (
          <p className="text-[14px] text-text-subtle" aria-live="polite">
            Thinking...
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Recap what you learned"
          aria-label="Your recap"
          className="flex-1 border border-border rounded-xl px-4 py-3 text-base bg-surface focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !input.trim()}
          className="px-4 py-3 rounded-xl bg-brand text-white font-semibold disabled:bg-border disabled:text-text-subtle disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
      <button
        type="button"
        onClick={onDone}
        className="self-end px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
      >
        Done
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run test:run && npm run build
```

Expected: 27/27, clean build.

- [ ] **Step 3: Commit**

```bash
git add components/TextRecapChat.tsx
git commit -m "Restyle TextRecapChat with design tokens"
```

---

## Phase 5 — Completion + final verification

### Task 14: Restyle `CompletionScreen`

**Files:**
- Modify: `components/CompletionScreen.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// components/CompletionScreen.tsx
import { BrandMark } from "./BrandMark";

interface Props {
  onRestart: () => void;
}

export function CompletionScreen({ onRestart }: Props) {
  return (
    <section className="flex-1 flex flex-col justify-center items-start gap-5 max-w-md">
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

- [ ] **Step 2: Verify**

```bash
npm run test:run && npm run build
```

Expected: 27/27, clean build.

- [ ] **Step 3: Commit**

```bash
git add components/CompletionScreen.tsx
git commit -m "Restyle CompletionScreen with brand mark"
```

---

### Task 15: Full lint + verify + grep for stray slate classes

**Files:** none

- [ ] **Step 1: Run the full verification suite**

```bash
npm run test:run && npm run build && npm run lint
```

Expected: 27/27 tests, clean build, zero lint errors.

- [ ] **Step 2: Grep for any leftover slate / zinc / dark utility classes in components**

```bash
grep -rn "slate-\|zinc-\|gray-\|min-h-screen" components/ app/ --include="*.tsx" --include="*.css" || echo "no leftovers"
```

Expected: `no leftovers`. If anything turns up, replace those classes with the equivalent design-token utility (`text-text`, `text-text-muted`, `bg-canvas`, `border-border`, etc.) and re-run.

- [ ] **Step 3: Spot-check keyboard navigation in the dev server (manual)**

```bash
npm run dev
```

Open `http://localhost:3000`, then:
- Tab through the landing CTA → Start lesson
- On the MCQ screen: Tab into the radio group, use ↑/↓ to move between options, Space to select, Tab to Submit, Enter to submit
- On the simulation screen: Tab to the toggle, Space to toggle on/off, verify caption swap + EGC arrows animate
- On a remediation screen: Tab to "Ask a follow-up", Enter, verify dialog opens with focus on input, ESC closes and focus returns to "Ask a follow-up"

If any of these fail, fix the failing component and re-run.

- [ ] **Step 4: No commit on this task** — verification only. If anything failed, the fix commit goes here.

---

## Self-Review Notes

This plan covers every spec section:

- Color tokens → Task 1
- Inter swap → Task 2
- BrandMark primitive → Task 3
- Toggle primitive → Task 4
- LessonShell chrome → Task 5
- Landing → Task 6
- ReadingScreen → Task 7
- MCQuestionScreen → Task 8
- RemediationScreen → Task 9
- Simulation SVG + chrome → Task 10
- VoiceTutorScreen → Task 11
- FollowUpChat → Task 12
- TextRecapChat → Task 13
- CompletionScreen → Task 14
- Final verify + a11y spot-check → Task 15

Every task ends with `npm run test:run && npm run build` so a broken intermediate state is caught before commit. The 27-test suite is the regression net — if it ever drops below 27, stop and fix before moving on.
