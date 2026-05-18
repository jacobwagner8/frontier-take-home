# N-G Bonding Teaching Tool — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a mobile-first web app that teaches one self-contained electrical concept (why N-G bonding happens at exactly one point, what fails with multiple bonds) in a 5-10 minute lesson, with a voice AI tutor recap powered by the OpenAI Realtime API.

**Architecture:** Next.js 15 App Router app with a `useReducer` lesson state machine, hand-authored curriculum content as a typed static module, a single-toggle SVG simulation, and a WebRTC voice tutor that uses an ephemeral OpenAI Realtime session token minted server-side. No DB, no auth, no persistence — resets on refresh.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Vitest + React Testing Library (logic tests only), OpenAI Realtime API (WebRTC), OpenAI Chat Completions API, Vercel.

**Testing strategy:** TDD for the state machine, curriculum schema validation, and tutor prompt construction (the things where bugs are silent and costly). Manual browser testing on real iPhone + Android for UI, simulation, and voice tutor (faster, appropriate for a take-home where UX correctness is best verified visually).

---

## File Structure Overview

```
frontier-take-home/
├── app/
│   ├── layout.tsx                      # root, viewport meta, fonts
│   ├── page.tsx                        # landing / Start Lesson CTA
│   ├── lesson/
│   │   └── page.tsx                    # lesson surface, drives state machine
│   └── api/
│       ├── realtime-session/route.ts   # POST → ephemeral Realtime token
│       └── chat/route.ts               # POST → grounded text completion
├── components/
│   ├── LessonShell.tsx                 # mobile container + progress
│   ├── ReadingScreen.tsx
│   ├── MCQuestionScreen.tsx
│   ├── RemediationScreen.tsx
│   ├── SimulationScreen.tsx
│   ├── VoiceTutorScreen.tsx
│   ├── FollowUpChat.tsx
│   └── CompletionScreen.tsx
├── lib/
│   ├── curriculum.ts                   # all lesson content, typed
│   ├── curriculum.types.ts             # types for the curriculum module
│   ├── lessonMachine.ts                # reducer + types + helpers
│   ├── tutorPrompt.ts                  # system prompt builder
│   └── realtimeClient.ts               # WebRTC connection helpers
├── public/images/                      # panel diagrams (SVG)
├── tests/
│   ├── lessonMachine.test.ts
│   ├── curriculum.test.ts
│   └── tutorPrompt.test.ts
├── .env.local.example                  # OPENAI_API_KEY placeholder
└── README.md
```

---

## Phase 0 — Foundation (Monday afternoon/evening)

### Task 0.1: Scaffold Next.js + TypeScript project

**Files:**
- Create: entire `frontier-take-home/` working tree via `create-next-app`

- [ ] **Step 1: Run create-next-app inside the existing dir**

The directory already exists with the design doc. Use `create-next-app` against the current dir (`.`) and tell it not to wipe.

```bash
cd ~/Desktop/frontier-take-home
npx create-next-app@latest . \
  --typescript --tailwind --app --eslint \
  --src-dir false --import-alias "@/*" \
  --turbopack \
  --no-git \
  --use-npm
```

When it asks "directory is not empty, continue?" answer **Yes** — it will preserve `docs/` and `.git/`.

- [ ] **Step 2: Sanity check the dev server runs**

```bash
npm run dev
```

Visit `http://localhost:3000` — expect the Next.js starter page. Stop the server (Ctrl-C).

- [ ] **Step 3: Commit the scaffold**

```bash
cd ~/Desktop/frontier-take-home
git add .
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Scaffold Next.js + TS + Tailwind project"
```

---

### Task 0.2: Install testing dependencies

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Modify: `package.json` (test script + deps)

- [ ] **Step 1: Install Vitest + RTL**

```bash
cd ~/Desktop/frontier-take-home
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 3: Create `tests/setup.ts`**

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add `test` script to `package.json`**

Edit `package.json`, add to `"scripts"`:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Smoke test**

```bash
echo 'import { test, expect } from "vitest"; test("smoke", () => { expect(1+1).toBe(2); });' > tests/smoke.test.ts
npm run test:run
rm tests/smoke.test.ts
```

Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add .
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add Vitest + React Testing Library setup"
```

---

### Task 0.3: Set up env vars and `.gitignore` for secrets

**Files:**
- Create: `.env.local.example`
- Verify: `.gitignore` excludes `.env.local`

- [ ] **Step 1: Create `.env.local.example`**

```
# Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...
```

- [ ] **Step 2: Create your real `.env.local`**

```bash
cp .env.local.example .env.local
# Edit .env.local and paste your real key
```

- [ ] **Step 3: Verify `.env.local` is gitignored**

```bash
grep -E "^\.env" .gitignore
```

Expected: shows `.env*` or `.env.local` listed. If not, append `.env*.local` to `.gitignore`.

- [ ] **Step 4: Commit**

```bash
git add .env.local.example .gitignore
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add env var template and verify secret gitignore"
```

---

### Task 0.4: Push to GitHub and wire Vercel preview deploy

**Files:** none (CLI / dashboard)

- [ ] **Step 1: Create a public GitHub repo**

```bash
gh repo create frontier-take-home --public --source=. --remote=origin --push
```

Or use the GitHub UI and `git remote add origin <url> && git push -u origin main`.

- [ ] **Step 2: Import the repo into Vercel**

Visit `https://vercel.com/new`, select the repo, accept the auto-detected Next.js settings, add `OPENAI_API_KEY` as an environment variable (Production + Preview + Development), and click Deploy.

- [ ] **Step 3: Verify preview deploys on push**

Make a trivial edit (whitespace), commit, push. Confirm Vercel triggers a build and the URL serves the starter page.

- [ ] **Step 4: Capture the deploy URL**

Note the Vercel URL (e.g. `frontier-take-home.vercel.app`) — you'll put it in the README.

---

### Task 0.5: Build the mobile-first `LessonShell` skeleton

**Files:**
- Modify: `app/layout.tsx` (viewport, fonts)
- Create: `components/LessonShell.tsx`
- Modify: `app/page.tsx` (use shell, add Start CTA)

- [ ] **Step 1: Set the mobile viewport in `app/layout.tsx`**

In the `<Metadata>` export or via `viewport` export, ensure:

```typescript
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};
```

- [ ] **Step 2: Create `components/LessonShell.tsx`**

```tsx
import { ReactNode } from "react";

interface LessonShellProps {
  children: ReactNode;
  progress?: { current: number; total: number };
}

export function LessonShell({ children, progress }: LessonShellProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-white text-slate-900">
      <header className="px-4 pt-4 pb-2">
        <div className="text-xs uppercase tracking-wide text-slate-500">
          Electrical Fundamentals
        </div>
        <h1 className="text-base font-semibold">Neutral & Ground Bonding</h1>
        {progress && (
          <div className="mt-2 h-1 w-full bg-slate-200 rounded overflow-hidden">
            <div
              className="h-full bg-slate-900 transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        )}
      </header>
      <main className="flex-1 px-4 pb-6 flex flex-col gap-4">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Wire `app/page.tsx`**

```tsx
import Link from "next/link";
import { LessonShell } from "@/components/LessonShell";

export default function Home() {
  return (
    <LessonShell>
      <div className="flex-1 flex flex-col justify-center items-start gap-4">
        <p className="text-lg">
          A 5-10 minute lesson on why a residential electrical system bonds
          neutral and ground at exactly one point.
        </p>
        <Link
          href="/lesson"
          className="px-5 py-3 rounded-lg bg-slate-900 text-white font-medium"
        >
          Start lesson
        </Link>
      </div>
    </LessonShell>
  );
}
```

- [ ] **Step 4: Manually test in mobile viewport**

Run `npm run dev`, open Chrome DevTools, toggle device toolbar to iPhone 14 Pro, visit `/`. Expect a phone-shaped landing page with the Start button.

- [ ] **Step 5: Commit**

```bash
git add .
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add mobile-first LessonShell and landing page"
```

---

### Task 0.6: Define curriculum types

**Files:**
- Create: `lib/curriculum.types.ts`
- Create: `tests/curriculum.test.ts` (will fail; populated more next task)

- [ ] **Step 1: Create types**

```typescript
// lib/curriculum.types.ts
export interface ReadingSection {
  id: string;
  title: string;
  body: string; // plain text or basic markdown
  imageSrc?: string;
  imageAlt?: string;
}

export interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
  /** Remediation shown if this option is selected and it is wrong. */
  remediation?: string;
  /** Tag categorizing the misconception, used in tutor prompt + chat context. */
  misconceptionTag?: string;
}

export interface MCQ {
  id: string;
  prompt: string;
  options: MCQOption[];
}

export interface Curriculum {
  reading1: ReadingSection;
  mcq1: MCQ;
  simulationCaptions: {
    oneBond: string;
    twoBond: string;
  };
  mcq2: MCQ;
  voiceTutor: {
    /** Verbatim summary the tutor must use as ground truth. */
    groundingFacts: string[];
    /** Suggested opening prompt the tutor uses. */
    openingPrompt: string;
  };
}
```

- [ ] **Step 2: Write the curriculum schema test (failing)**

```typescript
// tests/curriculum.test.ts
import { describe, it, expect } from "vitest";
import { curriculum } from "@/lib/curriculum";

describe("curriculum integrity", () => {
  it("every MCQ has exactly one correct option", () => {
    for (const mcq of [curriculum.mcq1, curriculum.mcq2]) {
      const correct = mcq.options.filter((o) => o.isCorrect);
      expect(correct, `${mcq.id}`).toHaveLength(1);
    }
  });

  it("every wrong option has remediation text", () => {
    for (const mcq of [curriculum.mcq1, curriculum.mcq2]) {
      for (const opt of mcq.options) {
        if (!opt.isCorrect) {
          expect(opt.remediation, `${mcq.id}/${opt.id}`).toBeTruthy();
          expect(opt.misconceptionTag, `${mcq.id}/${opt.id}`).toBeTruthy();
        }
      }
    }
  });

  it("every MCQ has at least 3 options", () => {
    for (const mcq of [curriculum.mcq1, curriculum.mcq2]) {
      expect(mcq.options.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("grounding facts list is non-empty", () => {
    expect(curriculum.voiceTutor.groundingFacts.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Verify the test fails (no curriculum yet)**

```bash
npm run test:run -- tests/curriculum.test.ts
```

Expected: failure with "Cannot find module '@/lib/curriculum'".

- [ ] **Step 4: Commit**

```bash
git add lib/curriculum.types.ts tests/curriculum.test.ts
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add curriculum types and integrity tests (failing)"
```

---

### Task 0.7: Author the curriculum content

This is the longest single task and the highest-leverage one. Budget 60-90 minutes including fact-checking. Subject-matter accuracy is graded.

**Files:**
- Create: `lib/curriculum.ts`

- [ ] **Step 1: Re-read the spec's "Curriculum (Subject Matter)" section**

Read `docs/superpowers/specs/2026-05-18-bonding-teaching-tool-design.md`, sections "The concept, accurately stated" and "What goes wrong with a second N-G bond". These are your source of truth.

- [ ] **Step 2: Cross-reference at least two outside sources**

Open browser tabs:
- Mike Holt — "Bonding vs. Grounding" article series
- NEC 2023 Article 250.24(A)(5) and 250.142 (if available; otherwise the NEC handbook excerpts on these articles)

Read through. Note any places where your spec text needs sharpening. Update the spec inline if you discover an inaccuracy.

- [ ] **Step 3: Draft `lib/curriculum.ts`**

Create the file. Fill in each section. Aim for ~150-250 words per reading section. MCQ options should include the *common student misconceptions* — not random distractors. Examples of good misconceptions to target:

- "More grounding is safer" (the multiple-bond intuition)
- "Neutral and ground are the same wire" (ignoring downstream separation)
- "Grounding screw in a subpanel is required for safety" (confusion between bonding and grounding)
- "Current always returns through earth" (it does not — it returns through the source via the neutral)

Each wrong option's `remediation` should:
1. Name the misconception explicitly
2. State the correct mental model in 2-3 sentences
3. Reference the physical consequence (objectionable current, touch voltage, GFCI, fault clearing)

Use the following skeleton — fill in the brackets:

```typescript
// lib/curriculum.ts
import type { Curriculum } from "./curriculum.types";

export const curriculum: Curriculum = {
  reading1: {
    id: "r1",
    title: "One bond, exactly one place",
    body: `[~200 words explaining: the service entrance has a single N-G bond
    at the main panel; downstream the N and EGC are kept separate; this is
    NEC 250.24's "system bonding" requirement. Define EGC, neutral, main
    bonding jumper. Show a hint of why separation matters — to be explored
    in the next sections.]`,
    imageSrc: "/images/single-bond.svg",
    imageAlt: "Diagram of a service panel with the main bonding jumper at one point",
  },
  mcq1: {
    id: "mcq1",
    prompt: "Where in a residential system is neutral bonded to ground?",
    options: [
      {
        id: "mcq1_a",
        text: "At every panel and subpanel",
        isCorrect: false,
        misconceptionTag: "more_bonding_is_safer",
        remediation: `[Address the "more grounding is safer" misconception.
        Explain: extra bonds create parallel return paths for normal load
        current, which causes objectionable current on EGCs. NEC 250.142
        explicitly prohibits bonding the neutral to ground on the load side
        of the service disconnect.]`,
      },
      {
        id: "mcq1_b",
        text: "At the service disconnect only",
        isCorrect: true,
      },
      {
        id: "mcq1_c",
        text: "Wherever the ground rod connects",
        isCorrect: false,
        misconceptionTag: "ground_rod_is_the_bond",
        remediation: `[Address the confusion between bonding and grounding.
        The ground rod (grounding electrode) connects to the system at the
        same point as the bond, but the *bond* is the N-to-EGC connection
        at the main panel — not the rod itself. Earth is a poor conductor
        and is not the return path for normal current.]`,
      },
      {
        id: "mcq1_d",
        text: "Nowhere — neutral and ground are always separate",
        isCorrect: false,
        misconceptionTag: "always_separate",
        remediation: `[Address the over-correction. Neutral and ground ARE
        bonded — but at exactly one point. That single bond is what makes
        ground-fault current able to return to the source and trip the
        breaker. No bond, no clearing path.]`,
      },
    ],
  },
  simulationCaptions: {
    oneBond: `[~50 words: With one bond at the service, normal load current
    returns to the source via the neutral. The EGC carries no current and
    is at the same potential as the load's metal case. Touching the case
    is safe.]`,
    twoBond: `[~50 words: With a second bond at the subpanel, the neutral
    and EGC are tied together at two points. Load current divides between
    them on the way back. The EGC now carries current — that's
    "objectionable current". Voltage drops on the EGC mean the case is
    no longer at zero volts relative to other grounded surfaces.]`,
  },
  mcq2: {
    id: "mcq2",
    prompt:
      "A homeowner adds a bonding screw at their subpanel because they think it makes things safer. What actually happens during normal operation?",
    options: [
      {
        id: "mcq2_a",
        text: "Nothing — the second bond is redundant",
        isCorrect: false,
        misconceptionTag: "redundancy_is_harmless",
        remediation: `[Address the "redundancy can't hurt" intuition.
        Explain: redundant paths in *parallel* divide current. The EGC and
        every bonded metal raceway now carry continuous load current. They
        were never sized or insulated for this. Touch voltage appears on
        metal cases.]`,
      },
      {
        id: "mcq2_b",
        text: "Normal return current splits between neutral and the equipment grounding path",
        isCorrect: true,
      },
      {
        id: "mcq2_c",
        text: "All current flows through the ground rod into the earth",
        isCorrect: false,
        misconceptionTag: "earth_is_return_path",
        remediation: `[Address the "earth is the return" misconception.
        Earth has ~25 ohms of resistance at a typical rod — too high to
        carry significant current. Current returns to the source via the
        utility neutral. With a second bond, current splits between the
        neutral wire and the EGC, *not* the earth.]`,
      },
      {
        id: "mcq2_d",
        text: "The breaker trips immediately",
        isCorrect: false,
        misconceptionTag: "double_bond_trips_breaker",
        remediation: `[Address the misconception that any abnormality trips
        a breaker. A second N-G bond is invisible to overcurrent protection
        — load current is below the trip threshold and is just splitting
        across paths. The danger is silent until a fault or touch event
        exposes it.]`,
      },
    ],
  },
  voiceTutor: {
    groundingFacts: [
      "The N-G bond exists at exactly one point: the service disconnect (main panel).",
      "Downstream of the bond, neutral carries return current and EGC carries fault current only.",
      "A second N-G bond creates parallel return paths via the EGC and bonded metal.",
      "Objectionable current on EGCs causes touch voltage on 'grounded' surfaces.",
      "Multiple bonds degrade GFCI detection and make fault clearing unpredictable.",
      "The relevant NEC articles are 250.24 (system bonding) and 250.142 (use of neutral for grounding equipment).",
    ],
    openingPrompt:
      "Nice work finishing the lesson. In your own words, what's the rule about where neutral and ground get bonded, and what goes wrong if it's bonded in more than one place?",
  },
};
```

- [ ] **Step 4: Replace each `[bracketed]` placeholder with real content**

Write the actual paragraphs. Verify each technical claim against your sources. Avoid claims you can't cite.

- [ ] **Step 5: Run the curriculum tests**

```bash
npm run test:run -- tests/curriculum.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/curriculum.ts
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add hand-authored curriculum content"
```

---

## Phase 1 — Lesson state machine and core screens (Tuesday morning)

### Task 1.1: Define lesson state machine (TDD)

**Files:**
- Create: `lib/lessonMachine.ts`
- Create: `tests/lessonMachine.test.ts`

- [ ] **Step 1: Write the state machine tests (failing)**

```typescript
// tests/lessonMachine.test.ts
import { describe, it, expect } from "vitest";
import {
  initialLessonState,
  lessonReducer,
  LessonState,
} from "@/lib/lessonMachine";
import { curriculum } from "@/lib/curriculum";

describe("lessonReducer", () => {
  it("starts at intro", () => {
    expect(initialLessonState.step).toBe("intro");
  });

  it("intro → reading1 on ADVANCE", () => {
    const next = lessonReducer(initialLessonState, { type: "ADVANCE" });
    expect(next.step).toBe("reading1");
  });

  it("reading1 → mcq1 on ADVANCE", () => {
    const state: LessonState = { ...initialLessonState, step: "reading1" };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.step).toBe("mcq1");
  });

  it("mcq1 → simulation when answered correctly", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq1" };
    const correctId = curriculum.mcq1.options.find((o) => o.isCorrect)!.id;
    const next = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq1",
      optionId: correctId,
    });
    expect(next.step).toBe("simulation");
  });

  it("mcq1 → remediation1 when answered incorrectly, tracks wrong option", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq1" };
    const wrong = curriculum.mcq1.options.find((o) => !o.isCorrect)!;
    const next = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq1",
      optionId: wrong.id,
    });
    expect(next.step).toBe("remediation1");
    expect(next.lastWrongOptionId).toBe(wrong.id);
  });

  it("remediation1 → mcq1 on ADVANCE (retry)", () => {
    const state: LessonState = {
      ...initialLessonState,
      step: "remediation1",
      lastWrongOptionId: "mcq1_a",
    };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.step).toBe("mcq1");
    expect(next.lastWrongOptionId).toBeUndefined();
  });

  it("simulation → mcq2 on ADVANCE", () => {
    const state: LessonState = { ...initialLessonState, step: "simulation" };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.step).toBe("mcq2");
  });

  it("mcq2 correct → voiceTutor", () => {
    const state: LessonState = { ...initialLessonState, step: "mcq2" };
    const correctId = curriculum.mcq2.options.find((o) => o.isCorrect)!.id;
    const next = lessonReducer(state, {
      type: "ANSWER_MCQ",
      mcqId: "mcq2",
      optionId: correctId,
    });
    expect(next.step).toBe("voiceTutor");
  });

  it("voiceTutor → done on ADVANCE", () => {
    const state: LessonState = { ...initialLessonState, step: "voiceTutor" };
    const next = lessonReducer(state, { type: "ADVANCE" });
    expect(next.step).toBe("done");
  });

  it("RESTART_LESSON returns to intro", () => {
    const state: LessonState = { ...initialLessonState, step: "done" };
    const next = lessonReducer(state, { type: "RESTART_LESSON" });
    expect(next.step).toBe("intro");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- tests/lessonMachine.test.ts
```

Expected: failures with "Cannot find module '@/lib/lessonMachine'".

- [ ] **Step 3: Implement `lib/lessonMachine.ts`**

```typescript
// lib/lessonMachine.ts
import { curriculum } from "./curriculum";

export type LessonStep =
  | "intro"
  | "reading1"
  | "mcq1"
  | "remediation1"
  | "simulation"
  | "mcq2"
  | "remediation2"
  | "voiceTutor"
  | "done";

export interface LessonState {
  step: LessonStep;
  lastWrongOptionId?: string;
}

export type LessonAction =
  | { type: "ADVANCE" }
  | { type: "ANSWER_MCQ"; mcqId: "mcq1" | "mcq2"; optionId: string }
  | { type: "RESTART_LESSON" };

export const initialLessonState: LessonState = { step: "intro" };

const linearOrder: LessonStep[] = [
  "intro",
  "reading1",
  "mcq1",
  "simulation",
  "mcq2",
  "voiceTutor",
  "done",
];

function nextLinear(step: LessonStep): LessonStep {
  const i = linearOrder.indexOf(step);
  return i >= 0 && i < linearOrder.length - 1 ? linearOrder[i + 1] : step;
}

export function lessonReducer(
  state: LessonState,
  action: LessonAction,
): LessonState {
  switch (action.type) {
    case "RESTART_LESSON":
      return initialLessonState;

    case "ADVANCE": {
      // remediation screens advance back to their MCQ
      if (state.step === "remediation1") {
        return { step: "mcq1", lastWrongOptionId: undefined };
      }
      if (state.step === "remediation2") {
        return { step: "mcq2", lastWrongOptionId: undefined };
      }
      return { ...state, step: nextLinear(state.step) };
    }

    case "ANSWER_MCQ": {
      const mcq =
        action.mcqId === "mcq1" ? curriculum.mcq1 : curriculum.mcq2;
      const option = mcq.options.find((o) => o.id === action.optionId);
      if (!option) return state;
      if (option.isCorrect) {
        return {
          step: nextLinear(state.step),
          lastWrongOptionId: undefined,
        };
      }
      return {
        step: action.mcqId === "mcq1" ? "remediation1" : "remediation2",
        lastWrongOptionId: option.id,
      };
    }
  }
}

/** Convenience: where does a given step sit in the linear progress bar? */
export function progressFor(step: LessonStep): {
  current: number;
  total: number;
} {
  const visible: LessonStep[] = [
    "reading1",
    "mcq1",
    "simulation",
    "mcq2",
    "voiceTutor",
  ];
  const remediationOf: Partial<Record<LessonStep, LessonStep>> = {
    remediation1: "mcq1",
    remediation2: "mcq2",
  };
  const effective = remediationOf[step] ?? step;
  const idx = visible.indexOf(effective);
  return { current: idx < 0 ? 0 : idx + 1, total: visible.length };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- tests/lessonMachine.test.ts
```

Expected: all 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/lessonMachine.ts tests/lessonMachine.test.ts
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add lesson state machine with reducer + tests"
```

---

### Task 1.2: Build `ReadingScreen`

**Files:**
- Create: `components/ReadingScreen.tsx`

- [ ] **Step 1: Create the component**

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
    <article className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{section.title}</h2>
      {section.imageSrc && (
        <div className="rounded-lg overflow-hidden border border-slate-200">
          <Image
            src={section.imageSrc}
            alt={section.imageAlt ?? ""}
            width={800}
            height={500}
            className="w-full h-auto"
          />
        </div>
      )}
      <p className="leading-relaxed whitespace-pre-wrap">{section.body}</p>
      <button
        type="button"
        onClick={onAdvance}
        className="self-end px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium"
      >
        {ctaLabel}
      </button>
    </article>
  );
}
```

- [ ] **Step 2: Add a placeholder SVG for `single-bond.svg`**

Create `public/images/single-bond.svg` with a temporary diagram. A quick recipe: a black rectangle labeled "MAIN PANEL", a thinner one labeled "SUBPANEL", lines for N (white) and EGC (green), a single junction point labeled "BOND" at the main panel. Hand-draw in your editor of choice or use this minimal placeholder:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" fill="none">
  <rect x="40" y="60" width="220" height="380" rx="8" stroke="#0f172a" stroke-width="3"/>
  <text x="150" y="100" text-anchor="middle" font-size="20" fill="#0f172a" font-weight="600">MAIN PANEL</text>
  <rect x="520" y="120" width="200" height="280" rx="8" stroke="#0f172a" stroke-width="3"/>
  <text x="620" y="160" text-anchor="middle" font-size="18" fill="#0f172a" font-weight="600">SUBPANEL</text>
  <line x1="260" y1="200" x2="520" y2="200" stroke="#475569" stroke-width="3"/>
  <text x="390" y="190" text-anchor="middle" font-size="14" fill="#475569">Neutral (N)</text>
  <line x1="260" y1="280" x2="520" y2="280" stroke="#16a34a" stroke-width="3"/>
  <text x="390" y="305" text-anchor="middle" font-size="14" fill="#16a34a">Ground (EGC)</text>
  <circle cx="150" cy="320" r="8" fill="#dc2626"/>
  <text x="150" y="360" text-anchor="middle" font-size="14" fill="#dc2626" font-weight="600">N-G BOND (single)</text>
</svg>
```

You'll replace this with a more polished version during simulation work.

- [ ] **Step 3: Smoke render in `app/lesson/page.tsx` (temp)**

This is throwaway — only to confirm the component renders. Will be replaced when wiring the state machine.

- [ ] **Step 4: Commit**

```bash
git add components/ReadingScreen.tsx public/images/single-bond.svg
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add ReadingScreen and placeholder bond diagram"
```

---

### Task 1.3: Build `MCQuestionScreen`

**Files:**
- Create: `components/MCQuestionScreen.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/MCQuestionScreen.tsx
"use client";

import { useState } from "react";
import type { MCQ, MCQOption } from "@/lib/curriculum.types";

interface Props {
  mcq: MCQ;
  onAnswer: (option: MCQOption) => void;
}

export function MCQuestionScreen({ mcq, onAnswer }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{mcq.prompt}</h2>
      <ul className="flex flex-col gap-2">
        {mcq.options.map((opt) => {
          const isSelected = selectedId === opt.id;
          return (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => setSelectedId(opt.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-base transition ${
                  isSelected
                    ? "border-slate-900 bg-slate-100"
                    : "border-slate-200"
                }`}
                aria-pressed={isSelected}
              >
                {opt.text}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={!selectedId}
        onClick={() => {
          const opt = mcq.options.find((o) => o.id === selectedId);
          if (opt) onAnswer(opt);
        }}
        className="self-end px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium disabled:bg-slate-300"
      >
        Submit
      </button>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/MCQuestionScreen.tsx
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add MCQuestionScreen component"
```

---

### Task 1.4: Build `RemediationScreen` (without follow-up chat yet)

**Files:**
- Create: `components/RemediationScreen.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/RemediationScreen.tsx
"use client";

import type { MCQOption } from "@/lib/curriculum.types";

interface Props {
  wrongOption: MCQOption;
  onAdvance: () => void;
  onAskFollowUp?: () => void; // wired in Phase 4
}

export function RemediationScreen({
  wrongOption,
  onAdvance,
  onAskFollowUp,
}: Props) {
  return (
    <section className="flex flex-col gap-4">
      <div className="text-xs uppercase tracking-wide text-rose-600 font-semibold">
        Not quite
      </div>
      <p className="text-base leading-relaxed">{wrongOption.remediation}</p>
      <div className="flex gap-2 justify-end">
        {onAskFollowUp && (
          <button
            type="button"
            onClick={onAskFollowUp}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 font-medium"
          >
            Ask a follow-up
          </button>
        )}
        <button
          type="button"
          onClick={onAdvance}
          className="px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium"
        >
          Try again
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/RemediationScreen.tsx
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add RemediationScreen (follow-up chat stub)"
```

---

### Task 1.5: Wire `app/lesson/page.tsx` with state machine + screens (excluding sim + voice)

**Files:**
- Create: `app/lesson/page.tsx`

- [ ] **Step 1: Create the lesson page**

```tsx
// app/lesson/page.tsx
"use client";

import { useReducer } from "react";
import { LessonShell } from "@/components/LessonShell";
import { ReadingScreen } from "@/components/ReadingScreen";
import { MCQuestionScreen } from "@/components/MCQuestionScreen";
import { RemediationScreen } from "@/components/RemediationScreen";
import {
  initialLessonState,
  lessonReducer,
  progressFor,
} from "@/lib/lessonMachine";
import { curriculum } from "@/lib/curriculum";

export default function LessonPage() {
  const [state, dispatch] = useReducer(lessonReducer, initialLessonState);
  const progress = progressFor(state.step);

  return (
    <LessonShell progress={progress}>
      {state.step === "intro" && (
        <div className="flex-1 flex flex-col justify-center items-start gap-4">
          <p className="text-lg">
            Let's get started. This will take about 5-10 minutes.
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: "ADVANCE" })}
            className="px-5 py-3 rounded-lg bg-slate-900 text-white font-medium"
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
          onAnswer={(opt) =>
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq1", optionId: opt.id })
          }
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
        />
      )}

      {state.step === "simulation" && (
        <div className="flex flex-col gap-4">
          <p>Simulation coming in Phase 2.</p>
          <button
            type="button"
            onClick={() => dispatch({ type: "ADVANCE" })}
            className="self-end px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium"
          >
            Skip (temp)
          </button>
        </div>
      )}

      {state.step === "mcq2" && (
        <MCQuestionScreen
          mcq={curriculum.mcq2}
          onAnswer={(opt) =>
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq2", optionId: opt.id })
          }
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
        />
      )}

      {state.step === "voiceTutor" && (
        <div className="flex flex-col gap-4">
          <p>Voice tutor coming in Phase 3.</p>
          <button
            type="button"
            onClick={() => dispatch({ type: "ADVANCE" })}
            className="self-end px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium"
          >
            Skip (temp)
          </button>
        </div>
      )}

      {state.step === "done" && (
        <div className="flex-1 flex flex-col justify-center items-start gap-4">
          <h2 className="text-xl font-semibold">Lesson complete</h2>
          <button
            type="button"
            onClick={() => dispatch({ type: "RESTART_LESSON" })}
            className="px-4 py-2.5 rounded-lg border border-slate-300 font-medium"
          >
            Restart
          </button>
        </div>
      )}
    </LessonShell>
  );
}
```

- [ ] **Step 2: Manually test the full flow on desktop**

```bash
npm run dev
```

Visit `http://localhost:3000`, click Start, walk through: intro → reading → MCQ (try wrong then right) → simulation skip → MCQ → voice skip → done → restart.

- [ ] **Step 3: Manually test in mobile viewport**

Chrome DevTools → iPhone 14 Pro. Walk the same flow. Confirm tap targets are reasonable, text is readable, no horizontal scroll.

- [ ] **Step 4: Push and verify Vercel preview**

```bash
git add app/lesson/page.tsx
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Wire lesson page with state machine and core screens"
git push
```

Open the Vercel preview URL on your phone. Walk the flow on real hardware.

---

## Phase 2 — Interactive simulation (Tuesday afternoon)

### Task 2.1: Design the simulation SVG (final)

**Files:**
- Create: `public/images/sim-base.svg` (or inline the SVG in the component)

- [ ] **Step 1: Decide: inline SVG component vs. static file**

Recommended: **inline as a React component** because you'll be toggling stroke colors and animating dashes via state. Static SVGs can't react to props.

- [ ] **Step 2: Sketch the simulation layout on paper or in Figma**

Elements needed:
- Service ("Main") panel rectangle, with N bus and EGC bus inside
- Main bonding jumper (a short line connecting N bus to EGC bus, always shown)
- Subpanel rectangle
- N feeder wire main→subpanel (top)
- EGC feeder wire main→subpanel (bottom)
- A load (e.g., outlet + appliance) attached to the subpanel
- A "bonding screw" indicator at the subpanel (off by default, on when toggled)
- Current arrows along the N feeder (always)
- Current arrows along the EGC feeder (only when second bond active)

Decide: how arrows convey "current flowing" — recommend `stroke-dasharray` + animated `stroke-dashoffset` for a flowing-dot effect.

- [ ] **Step 3: Commit the sketch (optional)**

Save a screenshot to `docs/superpowers/notes/` if useful. Otherwise skip.

---

### Task 2.2: Build the `SimulationScreen` component

**Files:**
- Create: `components/SimulationScreen.tsx`

- [ ] **Step 1: Build the static SVG + toggle (no animation yet)**

```tsx
// components/SimulationScreen.tsx
"use client";

import { useState } from "react";
import { curriculum } from "@/lib/curriculum";

interface Props {
  onAdvance: () => void;
}

export function SimulationScreen({ onAdvance }: Props) {
  const [secondBond, setSecondBond] = useState(false);
  const caption = secondBond
    ? curriculum.simulationCaptions.twoBond
    : curriculum.simulationCaptions.oneBond;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">
        See what happens with two bonds
      </h2>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
        <svg viewBox="0 0 800 500" className="w-full h-auto">
          {/* Main panel */}
          <rect
            x="40"
            y="60"
            width="240"
            height="380"
            rx="8"
            stroke="#0f172a"
            strokeWidth="3"
            fill="white"
          />
          <text
            x="160"
            y="90"
            textAnchor="middle"
            fontSize="18"
            fontWeight="600"
          >
            MAIN PANEL
          </text>

          {/* N bus + EGC bus inside main */}
          <line x1="80" y1="150" x2="240" y2="150" stroke="#475569" strokeWidth="4" />
          <text x="160" y="140" textAnchor="middle" fontSize="12" fill="#475569">
            Neutral bus
          </text>
          <line x1="80" y1="280" x2="240" y2="280" stroke="#16a34a" strokeWidth="4" />
          <text x="160" y="300" textAnchor="middle" fontSize="12" fill="#16a34a">
            EGC bus
          </text>
          {/* Always-on main bonding jumper */}
          <line x1="240" y1="150" x2="240" y2="280" stroke="#dc2626" strokeWidth="3" />
          <circle cx="240" cy="150" r="5" fill="#dc2626" />
          <circle cx="240" cy="280" r="5" fill="#dc2626" />
          <text x="270" y="220" fontSize="11" fill="#dc2626" fontWeight="600">
            Main bond
          </text>

          {/* Feeder wires to subpanel */}
          <line
            x1="280"
            y1="150"
            x2="520"
            y2="150"
            stroke="#475569"
            strokeWidth="4"
            strokeDasharray="6 4"
            className={`current-flow-n`}
          />
          <text x="400" y="140" textAnchor="middle" fontSize="12" fill="#475569">
            Neutral feeder
          </text>
          <line
            x1="280"
            y1="280"
            x2="520"
            y2="280"
            stroke="#16a34a"
            strokeWidth="4"
            strokeDasharray="6 4"
            className={secondBond ? "current-flow-egc" : ""}
          />
          <text x="400" y="305" textAnchor="middle" fontSize="12" fill="#16a34a">
            EGC feeder
          </text>

          {/* Subpanel */}
          <rect
            x="520"
            y="100"
            width="200"
            height="300"
            rx="8"
            stroke="#0f172a"
            strokeWidth="3"
            fill="white"
          />
          <text
            x="620"
            y="130"
            textAnchor="middle"
            fontSize="16"
            fontWeight="600"
          >
            SUBPANEL
          </text>
          <line x1="540" y1="180" x2="700" y2="180" stroke="#475569" strokeWidth="3" />
          <line x1="540" y1="280" x2="700" y2="280" stroke="#16a34a" strokeWidth="3" />

          {/* Optional second bond (rendered when toggled) */}
          {secondBond && (
            <>
              <line
                x1="700"
                y1="180"
                x2="700"
                y2="280"
                stroke="#dc2626"
                strokeWidth="3"
              />
              <circle cx="700" cy="180" r="5" fill="#dc2626" />
              <circle cx="700" cy="280" r="5" fill="#dc2626" />
              <text
                x="730"
                y="235"
                fontSize="11"
                fill="#dc2626"
                fontWeight="600"
              >
                Second
              </text>
              <text x="730" y="250" fontSize="11" fill="#dc2626" fontWeight="600">
                bond
              </text>
            </>
          )}

          {/* Load */}
          <rect
            x="580"
            y="350"
            width="80"
            height="40"
            stroke="#0f172a"
            strokeWidth="2"
            fill="#f1f5f9"
          />
          <text x="620" y="375" textAnchor="middle" fontSize="11">
            Load
          </text>
          <line x1="620" y1="280" x2="620" y2="350" stroke="#475569" strokeWidth="2" />
        </svg>
      </div>

      <label className="flex items-center gap-3 select-none">
        <input
          type="checkbox"
          checked={secondBond}
          onChange={(e) => setSecondBond(e.target.checked)}
          className="h-5 w-5"
        />
        <span className="text-sm">Add a second N-G bond at the subpanel</span>
      </label>

      <p className="text-sm leading-relaxed text-slate-700">{caption}</p>

      <button
        type="button"
        onClick={onAdvance}
        className="self-end px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium"
      >
        Continue
      </button>
    </section>
  );
}
```

- [ ] **Step 2: Wire `SimulationScreen` into `app/lesson/page.tsx`**

Replace the `state.step === "simulation"` placeholder block with:

```tsx
{state.step === "simulation" && (
  <SimulationScreen onAdvance={() => dispatch({ type: "ADVANCE" })} />
)}
```

Add the import at the top.

- [ ] **Step 3: Manual test in desktop + mobile viewports**

```bash
npm run dev
```

Walk to the simulation step. Toggle the checkbox; the second-bond elements should appear and the caption text should change. Confirm the SVG scales well on a phone screen (no overflow, readable text labels).

- [ ] **Step 4: Commit**

```bash
git add components/SimulationScreen.tsx app/lesson/page.tsx
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add interactive simulation with bond toggle"
```

---

### Task 2.3: Animate current-flow arrows

**Files:**
- Modify: `app/globals.css` (add keyframes)
- Modify: `components/SimulationScreen.tsx` (apply animation classes)

- [ ] **Step 1: Add a CSS keyframe to `app/globals.css`**

Append to the file:

```css
@keyframes current-flow {
  to {
    stroke-dashoffset: -100;
  }
}

.current-flow-n {
  animation: current-flow 1.5s linear infinite;
}

.current-flow-egc {
  animation: current-flow 1.5s linear infinite;
}
```

- [ ] **Step 2: Verify the dashed lines animate**

`npm run dev`. The N feeder dashes should march from left to right continuously. When the second bond is toggled on, the EGC feeder dashes also march. (Tip: if motion is too fast or slow, adjust the `1.5s`.)

- [ ] **Step 3: Add a "current on EGC" magnitude indicator (small)**

In the SVG, near the EGC feeder, add an optional text annotation that only shows when `secondBond` is true:

```tsx
{secondBond && (
  <text
    x="400"
    y="325"
    textAnchor="middle"
    fontSize="12"
    fill="#dc2626"
    fontWeight="600"
  >
    ⚠ Current now flowing on the EGC
  </text>
)}
```

- [ ] **Step 4: Real-device check**

Open the Vercel preview URL on your iPhone. Tap through to the simulation. Toggle the bond. Verify the animation is smooth and the warning text appears clearly.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css components/SimulationScreen.tsx
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Animate current-flow arrows + add EGC current warning"
git push
```

---

## Phase 3 — Voice tutor (Tuesday evening) — HIGHEST RISK

### Task 3.1: Build the tutor prompt module (TDD)

**Files:**
- Create: `lib/tutorPrompt.ts`
- Create: `tests/tutorPrompt.test.ts`

- [ ] **Step 1: Write failing tests for prompt construction**

```typescript
// tests/tutorPrompt.test.ts
import { describe, it, expect } from "vitest";
import { buildTutorSystemPrompt } from "@/lib/tutorPrompt";
import { curriculum } from "@/lib/curriculum";

describe("buildTutorSystemPrompt", () => {
  it("includes every grounding fact verbatim", () => {
    const prompt = buildTutorSystemPrompt();
    for (const fact of curriculum.voiceTutor.groundingFacts) {
      expect(prompt).toContain(fact);
    }
  });

  it("includes the opening prompt instruction", () => {
    const prompt = buildTutorSystemPrompt();
    expect(prompt).toContain(curriculum.voiceTutor.openingPrompt);
  });

  it("forbids inventing NEC code references", () => {
    const prompt = buildTutorSystemPrompt();
    expect(prompt.toLowerCase()).toContain("do not invent");
  });

  it("instructs to redirect off-topic questions", () => {
    const prompt = buildTutorSystemPrompt();
    expect(prompt.toLowerCase()).toMatch(/redirect|off-topic|outside this lesson/);
  });

  it("caps tutor responses for brevity", () => {
    const prompt = buildTutorSystemPrompt();
    // Should mention brevity / 1-2 sentence guidance
    expect(prompt.toLowerCase()).toMatch(/concise|brief|short|one or two|1-2/);
  });
});
```

- [ ] **Step 2: Confirm tests fail**

```bash
npm run test:run -- tests/tutorPrompt.test.ts
```

Expected: failure with "Cannot find module '@/lib/tutorPrompt'".

- [ ] **Step 3: Implement `lib/tutorPrompt.ts`**

```typescript
// lib/tutorPrompt.ts
import { curriculum } from "./curriculum";

export function buildTutorSystemPrompt(): string {
  const facts = curriculum.voiceTutor.groundingFacts
    .map((f, i) => `${i + 1}. ${f}`)
    .join("\n");

  return `You are a Socratic tutor reviewing what a student just learned about residential electrical neutral-to-ground bonding. The student has finished a 5-10 minute lesson.

# Your job
Ask the student to recap what they learned, then ask 1-2 short follow-up questions to check their understanding. Keep your turns CONCISE — one or two sentences at a time. This is a voice conversation, not a lecture.

# Ground truth (use only these facts)
${facts}

# Hard rules
- Do not invent NEC code references beyond the ones in the grounding facts above. If you cannot cite a fact from the list, do not state it.
- If the student asks about a topic outside this lesson (three-phase, motors, transformers, specific products, etc.), briefly say it is outside this lesson and redirect them to the bonding concept.
- Speak naturally and conversationally, like a senior electrician mentoring an apprentice. Avoid jargon the student did not encounter in the lesson.
- If the student says something incorrect, ask a guiding question rather than lecturing.
- After 2-3 student turns, congratulate them and wrap up the conversation.

# How to start
Open with this question: "${curriculum.voiceTutor.openingPrompt}"

Then listen and respond to what the student says.`;
}
```

- [ ] **Step 4: Confirm tests pass**

```bash
npm run test:run -- tests/tutorPrompt.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/tutorPrompt.ts tests/tutorPrompt.test.ts
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add grounded tutor system prompt builder + tests"
```

---

### Task 3.2: Build `/api/realtime-session/route.ts`

**Files:**
- Create: `app/api/realtime-session/route.ts`

- [ ] **Step 1: Install the OpenAI SDK (server-only usage)**

```bash
npm install openai
```

- [ ] **Step 2: Implement the route**

```typescript
// app/api/realtime-session/route.ts
import { NextResponse } from "next/server";
import { buildTutorSystemPrompt } from "@/lib/tutorPrompt";

export const runtime = "nodejs";

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const instructions = buildTutorSystemPrompt();

  const resp = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview",
      voice: "verse",
      instructions,
      modalities: ["audio", "text"],
      turn_detection: { type: "server_vad" },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json(
      { error: "Failed to mint Realtime session", detail: text },
      { status: 502 },
    );
  }

  const data = await resp.json();
  return NextResponse.json(data);
}
```

> Note: model id and voice choices may need to be updated to whatever OpenAI currently offers for Realtime. Check `https://platform.openai.com/docs/models#gpt-4o-realtime` at build time.

- [ ] **Step 3: Smoke test the route**

```bash
npm run dev
# in another terminal:
curl -X POST http://localhost:3000/api/realtime-session | jq .
```

Expected: a JSON response with a `client_secret.value` and `expires_at`. If you see an error, check the OpenAI dashboard for Realtime API access on your account.

- [ ] **Step 4: Commit**

```bash
git add app/api/realtime-session/route.ts package.json package-lock.json
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add /api/realtime-session route that mints ephemeral tokens"
```

---

### Task 3.3: Build `realtimeClient.ts` (WebRTC connection helpers)

**Files:**
- Create: `lib/realtimeClient.ts`

- [ ] **Step 1: Implement WebRTC connection helpers**

```typescript
// lib/realtimeClient.ts
export interface RealtimeSession {
  pc: RTCPeerConnection;
  remoteAudio: HTMLAudioElement;
  dataChannel: RTCDataChannel;
  stop: () => void;
}

interface StartArgs {
  ephemeralKey: string;
  model?: string;
  onTranscript?: (text: string, role: "user" | "assistant") => void;
  onError?: (err: Error) => void;
}

export async function startRealtimeSession({
  ephemeralKey,
  model = "gpt-4o-realtime-preview",
  onTranscript,
  onError,
}: StartArgs): Promise<RealtimeSession> {
  const pc = new RTCPeerConnection();

  // Remote audio out
  const remoteAudio = document.createElement("audio");
  remoteAudio.autoplay = true;
  pc.ontrack = (e) => {
    remoteAudio.srcObject = e.streams[0];
  };

  // Local mic in
  const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
  for (const track of mic.getTracks()) pc.addTrack(track, mic);

  // Data channel for events / transcripts
  const dataChannel = pc.createDataChannel("oai-events");
  dataChannel.addEventListener("message", (e) => {
    try {
      const msg = JSON.parse(e.data);
      // Handle transcript deltas
      if (msg.type === "response.audio_transcript.delta") {
        onTranscript?.(msg.delta ?? "", "assistant");
      } else if (
        msg.type === "conversation.item.input_audio_transcription.completed"
      ) {
        onTranscript?.(msg.transcript ?? "", "user");
      } else if (msg.type === "error") {
        onError?.(new Error(msg.error?.message ?? "Realtime error"));
      }
    } catch {
      // ignore non-JSON
    }
  });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const sdpResp = await fetch(
    `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ephemeralKey}`,
        "Content-Type": "application/sdp",
      },
      body: offer.sdp,
    },
  );

  if (!sdpResp.ok) {
    const text = await sdpResp.text();
    throw new Error(`Realtime SDP exchange failed: ${sdpResp.status} ${text}`);
  }

  const answer: RTCSessionDescriptionInit = {
    type: "answer",
    sdp: await sdpResp.text(),
  };
  await pc.setRemoteDescription(answer);

  const stop = () => {
    dataChannel.close();
    pc.close();
    for (const t of mic.getTracks()) t.stop();
    remoteAudio.srcObject = null;
  };

  return { pc, remoteAudio, dataChannel, stop };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/realtimeClient.ts
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add WebRTC helpers for OpenAI Realtime sessions"
```

---

### Task 3.4: Build `VoiceTutorScreen`

**Files:**
- Create: `components/VoiceTutorScreen.tsx`
- Modify: `app/lesson/page.tsx` (wire it in)

- [ ] **Step 1: Implement the screen**

```tsx
// components/VoiceTutorScreen.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  startRealtimeSession,
  type RealtimeSession,
} from "@/lib/realtimeClient";

interface Props {
  onAdvance: () => void;
  onFallbackToText: () => void;
}

type Status = "idle" | "connecting" | "live" | "error" | "stopped";

interface TranscriptLine {
  role: "user" | "assistant";
  text: string;
}

export function VoiceTutorScreen({ onAdvance, onFallbackToText }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const sessionRef = useRef<RealtimeSession | null>(null);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  async function startCall() {
    setStatus("connecting");
    setErrorMsg(null);
    try {
      const tokenResp = await fetch("/api/realtime-session", { method: "POST" });
      if (!tokenResp.ok) throw new Error("Could not mint session token");
      const session = await tokenResp.json();
      const ephemeralKey = session.client_secret?.value;
      if (!ephemeralKey) throw new Error("Missing ephemeral key");

      const rt = await startRealtimeSession({
        ephemeralKey,
        onTranscript: (text, role) => {
          setTranscript((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === role && role === "assistant") {
              return [
                ...prev.slice(0, -1),
                { role, text: last.text + text },
              ];
            }
            return [...prev, { role, text }];
          });
        },
        onError: (err) => {
          setErrorMsg(err.message);
          setStatus("error");
        },
      });
      sessionRef.current = rt;
      setStatus("live");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  function stopCall() {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setStatus("stopped");
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Talk it back</h2>
      <p className="text-sm text-slate-700">
        Last step: have a quick voice conversation with the tutor to make sure
        the concept stuck. Tap Start, allow microphone access, and explain in
        your own words.
      </p>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 min-h-[140px]">
        {transcript.length === 0 && (
          <p className="text-sm text-slate-500">
            {status === "idle" && "Tap Start to begin."}
            {status === "connecting" && "Connecting..."}
            {status === "live" && "Listening..."}
            {status === "stopped" && "Conversation ended."}
            {status === "error" && (errorMsg ?? "Something went wrong.")}
          </p>
        )}
        {transcript.map((line, i) => (
          <p key={i} className="text-sm leading-relaxed">
            <span className="font-semibold mr-1">
              {line.role === "user" ? "You:" : "Tutor:"}
            </span>
            {line.text}
          </p>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        {status === "idle" || status === "stopped" || status === "error" ? (
          <>
            <button
              type="button"
              onClick={onFallbackToText}
              className="px-4 py-2.5 rounded-lg border border-slate-300 font-medium"
            >
              Type instead
            </button>
            <button
              type="button"
              onClick={startCall}
              className="px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium"
            >
              Start
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={stopCall}
              className="px-4 py-2.5 rounded-lg border border-slate-300 font-medium"
            >
              Stop
            </button>
            <button
              type="button"
              onClick={() => {
                stopCall();
                onAdvance();
              }}
              className="px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium"
            >
              Done
            </button>
          </>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire it into `app/lesson/page.tsx`**

Replace the voice tutor placeholder block with:

```tsx
{state.step === "voiceTutor" && (
  <VoiceTutorScreen
    onAdvance={() => dispatch({ type: "ADVANCE" })}
    onFallbackToText={() => {
      // Phase 4 will replace this with the text fallback UI.
      dispatch({ type: "ADVANCE" });
    }}
  />
)}
```

Add the import.

- [ ] **Step 3: Test on desktop (Chrome)**

```bash
npm run dev
```

Walk to the voice tutor. Click Start, grant mic permission, speak. You should hear a response and see partial transcripts. If errors appear, check the browser console.

- [ ] **Step 4: Real-device test on iPhone Safari**

Push to git → wait for Vercel preview → open the URL on your iPhone. Walk through the lesson. At the voice tutor, allow mic access in the iOS permission dialog. Verify:
- The session connects
- The tutor speaks audibly
- Your speech is picked up
- The conversation flows for 1-2 turns

If iOS audio doesn't work, common fixes: ensure the page was opened via a tap (user gesture), the `<audio>` element is not muted, audio session unlocks correctly.

- [ ] **Step 5: Real-device test on Android Chrome**

Same flow on Android. Should "just work" if iOS does, but verify.

- [ ] **Step 6: Commit**

```bash
git add components/VoiceTutorScreen.tsx app/lesson/page.tsx
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add VoiceTutorScreen with OpenAI Realtime WebRTC integration"
git push
```

---

## Phase 4 — Polish + follow-up chat + fallbacks (Wednesday morning)

### Task 4.1: Build `/api/chat/route.ts` for text fallback + follow-up

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Implement the route**

```typescript
// app/api/chat/route.ts
import { NextResponse } from "next/server";
import { buildTutorSystemPrompt } from "@/lib/tutorPrompt";
import { curriculum } from "@/lib/curriculum";

export const runtime = "nodejs";

interface ChatBody {
  context: "voice_fallback" | "follow_up";
  misconceptionTag?: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "no key" }, { status: 500 });
  }

  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  let systemPrompt = buildTutorSystemPrompt();
  if (body.context === "follow_up" && body.misconceptionTag) {
    const tag = body.misconceptionTag;
    const target =
      [...curriculum.mcq1.options, ...curriculum.mcq2.options].find(
        (o) => !o.isCorrect && o.misconceptionTag === tag,
      );
    if (target) {
      systemPrompt += `\n\n# Current student context
The student answered a comprehension question incorrectly, picking: "${target.text}".
The remediation they just read: "${target.remediation}"
Their follow-up question is below. Answer it briefly (1-3 sentences), using only the grounding facts above.`;
    }
  }

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        ...body.messages,
      ],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json(
      { error: "openai failed", detail: text },
      { status: 502 },
    );
  }

  const data = await resp.json();
  const reply = data.choices?.[0]?.message?.content ?? "";
  return NextResponse.json({ reply });
}
```

- [ ] **Step 2: Smoke test the route**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"context":"follow_up","misconceptionTag":"more_bonding_is_safer","messages":[{"role":"user","content":"Why is more grounding not safer?"}]}' | jq .
```

Expected: a JSON `{ reply: "..." }` with a short, grounded response.

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/route.ts
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add /api/chat route for follow-ups and voice fallback"
```

---

### Task 4.2: Build `FollowUpChat` component

**Files:**
- Create: `components/FollowUpChat.tsx`

- [ ] **Step 1: Implement the chat modal**

```tsx
// components/FollowUpChat.tsx
"use client";

import { useState } from "react";

interface Props {
  misconceptionTag: string;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function FollowUpChat({ misconceptionTag, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!input.trim() || busy) return;
    const next = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: "follow_up",
          misconceptionTag,
          messages: next,
        }),
      });
      if (!resp.ok) throw new Error("chat failed");
      const data = await resp.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "(no reply)" },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, the follow-up service is unavailable right now. Try again in a moment.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-2">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[80dvh]">
        <header className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-semibold text-sm">Ask a follow-up</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 text-sm"
          >
            Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {messages.length === 0 && (
            <p className="text-sm text-slate-500">
              Ask anything about why this is wrong.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`text-sm leading-relaxed ${
                m.role === "user" ? "text-slate-900" : "text-slate-700"
              }`}
            >
              <span className="font-semibold mr-1">
                {m.role === "user" ? "You:" : "Tutor:"}
              </span>
              {m.content}
            </div>
          ))}
          {busy && <p className="text-sm text-slate-400">Thinking...</p>}
        </div>
        <div className="p-3 border-t border-slate-200 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type your question"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-base"
          />
          <button
            type="button"
            onClick={send}
            disabled={busy || !input.trim()}
            className="px-3 py-2 rounded-lg bg-slate-900 text-white font-medium disabled:bg-slate-300"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire `FollowUpChat` into `RemediationScreen`**

Replace `components/RemediationScreen.tsx`:

```tsx
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
      <div className="text-xs uppercase tracking-wide text-rose-600 font-semibold">
        Not quite
      </div>
      <p className="text-base leading-relaxed">{wrongOption.remediation}</p>
      <div className="flex gap-2 justify-end">
        {wrongOption.misconceptionTag && (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 font-medium"
          >
            Ask a follow-up
          </button>
        )}
        <button
          type="button"
          onClick={onAdvance}
          className="px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium"
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

- [ ] **Step 3: Manual test**

`npm run dev`. Walk to MCQ 1, pick a wrong answer. On the remediation screen, tap "Ask a follow-up", type a question, send. Verify a sensible grounded answer comes back.

- [ ] **Step 4: Commit**

```bash
git add components/FollowUpChat.tsx components/RemediationScreen.tsx
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add FollowUpChat modal and wire it into remediation"
```

---

### Task 4.3: Voice tutor text fallback

**Files:**
- Modify: `components/VoiceTutorScreen.tsx`
- Or: extract a small `TextRecapChat` component if you prefer

- [ ] **Step 1: Add an inline text-chat fallback state**

In `VoiceTutorScreen.tsx`, replace the `onFallbackToText` prop usage with an internal state that swaps the UI from voice to a text chat. Simplest: render a `FollowUpChat`-like component inline when the user clicks "Type instead".

For speed, you can reuse `FollowUpChat` with a small tweak: add a `context: "voice_fallback"` to the chat body so the system prompt drops the misconception block. Pass a synthetic `misconceptionTag={null}` and skip the follow-up branch in the API route when no tag is given. The route already handles this (it only appends misconception context if both `context === "follow_up"` and `misconceptionTag` are present).

Either rebuild a `TextRecapChat` mirroring `FollowUpChat` minus the misconception scoping, OR generalize `FollowUpChat` with an optional prop. Recommendation: copy → simplify, to avoid coupling components.

```tsx
// components/TextRecapChat.tsx — copy FollowUpChat and change:
// - Remove misconceptionTag prop
// - In send(): body.context = "voice_fallback"; no misconceptionTag
// - Header: "Type your recap"
// - Placeholder: "Recap what you learned"
```

- [ ] **Step 2: In `VoiceTutorScreen`, when "Type instead" is clicked, render `<TextRecapChat>` instead of the voice UI**

Add an internal `mode: "voice" | "text"` state. Switching modes does not call `onAdvance`.

- [ ] **Step 3: Manual test**

Open the voice tutor screen. Tap "Type instead". Verify the chat opens. Send a recap message. Confirm reply. Tap "Done" → advances to completion.

- [ ] **Step 4: Commit**

```bash
git add components/TextRecapChat.tsx components/VoiceTutorScreen.tsx
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add text fallback chat for voice tutor failures"
```

---

### Task 4.4: Build `CompletionScreen`

**Files:**
- Create: `components/CompletionScreen.tsx`
- Modify: `app/lesson/page.tsx`

- [ ] **Step 1: Replace the inline `done` block with a component**

```tsx
// components/CompletionScreen.tsx
interface Props {
  onRestart: () => void;
}

export function CompletionScreen({ onRestart }: Props) {
  return (
    <section className="flex-1 flex flex-col justify-center items-start gap-4">
      <h2 className="text-xl font-semibold">Lesson complete</h2>
      <p className="leading-relaxed">
        Quick recap to take with you: in a residential system, neutral and
        ground are bonded at exactly one point — the service disconnect.
        Multiple bonds create parallel return paths on the equipment grounding
        conductor, putting current and voltage where they should not be.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="px-4 py-2.5 rounded-lg border border-slate-300 font-medium"
      >
        Restart lesson
      </button>
    </section>
  );
}
```

- [ ] **Step 2: Wire in `app/lesson/page.tsx`**

Replace the `done` inline block with:

```tsx
{state.step === "done" && (
  <CompletionScreen
    onRestart={() => dispatch({ type: "RESTART_LESSON" })}
  />
)}
```

Add the import.

- [ ] **Step 3: Commit**

```bash
git add components/CompletionScreen.tsx app/lesson/page.tsx
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add CompletionScreen with recap text"
```

---

### Task 4.5: Real-device QA pass

**Files:** none — testing only

- [ ] **Step 1: iPhone Safari full run**

On a real iPhone, open the Vercel deploy URL. Walk the entire lesson:
- Start
- Reading
- MCQ 1 (try wrong first → remediation → try Ask a follow-up → close → try again with correct answer)
- Simulation (toggle bond, verify caption changes and EGC arrows animate)
- MCQ 2 (same pattern)
- Voice tutor (try voice → if it works, complete a recap; if it fails, try Type instead)
- Done

Note any bugs or UX issues.

- [ ] **Step 2: Android Chrome full run**

Same flow on an Android device. Especially verify mic permission UX.

- [ ] **Step 3: Desktop Chrome full run**

Same flow on desktop. Confirm nothing is mobile-only.

- [ ] **Step 4: Fix the bugs**

For each issue, decide: fix now (most), defer to "what I'd build next" (low-priority polish). Commit each fix individually with a clear message.

---

### Task 4.6: Final curriculum fact-check

**Files:**
- Modify: `lib/curriculum.ts` (if corrections needed)

- [ ] **Step 1: Re-read every paragraph in `curriculum.ts` against Mike Holt + NEC**

Specifically check:
- The single-bond rule and its scope (service disconnect, not subpanels)
- The phrase "objectionable current" appears (it's the NEC's term, NEC 250.6)
- Code references (250.24 and 250.142) are correct
- Numbers (e.g., "~25 ohms" for a ground rod) are accurate or removed if uncertain

- [ ] **Step 2: Run the curriculum tests once more**

```bash
npm run test:run -- tests/curriculum.test.ts
```

Expected: all pass.

- [ ] **Step 3: Commit any corrections**

---

## Phase 5 — Ship (Wednesday early afternoon)

### Task 5.1: Write the README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

```markdown
# Frontier Take-Home — N-G Bonding Teaching Tool

A 5-10 minute mobile-first lesson explaining why residential electrical
systems bond neutral and ground at exactly one point, and what physically
goes wrong with more than one bond. Includes a hand-authored reading and
quiz flow, an interactive panel simulation, and an OpenAI Realtime voice
tutor for a Socratic recap.

**Live demo:** <YOUR-VERCEL-URL>

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- OpenAI Realtime API (WebRTC voice tutor)
- OpenAI Chat Completions (text follow-up + voice fallback)
- Vitest + React Testing Library for logic tests

## Run locally
1. `cp .env.local.example .env.local`
2. Set `OPENAI_API_KEY` in `.env.local`
3. `npm install`
4. `npm run dev`
5. Open http://localhost:3000

## Tests
`npm run test:run` (logic tests: lesson state machine, curriculum integrity, tutor prompt).

## Design decisions
1. **Scripted curriculum, not AI-generated.** Subject-matter accuracy is the highest-risk failure mode. The reading, MC options, and remediation paragraphs are hand-authored and fact-checked against Mike Holt and NEC 250.24 / 250.142.
2. **AI is used where it shines: open-ended dialogue.** The voice tutor at the end performs Socratic recap, grounded by the curriculum baked into its system prompt. The optional "Ask a follow-up" affordance on remediation screens uses the same grounding to handle students who need more.
3. **Simulation is one toggle, not a sandbox.** The lesson is about a single physical concept; the simulation isolates exactly that concept. A second bond at the subpanel can be added or removed, and the EGC's current arrows redistribute.
4. **No DB, no auth, no persistence.** Per the brief; resets on refresh.

## What I'd build next
- Persistent student progress + spaced repetition across multiple lessons
- A telemetry layer that records which wrong MC options students pick most often, so the curriculum team can refine remediation
- Multi-lesson curriculum spine (this is lesson 1; a full intro electrical course is ~30 of these)
- Voice tutor transcript saved to localStorage so a student can review what they said
- Better grounding (RAG over NEC text + Mike Holt corpus) for the follow-up chat to cite specific code articles safely

## Files of note
- `lib/curriculum.ts` — all lesson content
- `lib/lessonMachine.ts` — state machine
- `lib/tutorPrompt.ts` — grounded system prompt
- `app/api/realtime-session/route.ts` — ephemeral OpenAI Realtime token minting
- `components/SimulationScreen.tsx` — interactive bond toggle
- `components/VoiceTutorScreen.tsx` — WebRTC voice tutor client
```

- [ ] **Step 2: Replace `<YOUR-VERCEL-URL>` with the real URL**

- [ ] **Step 3: Commit**

```bash
git add README.md
git -c user.name="Jacob Wagner" -c user.email="jacob.t.wagner@gmail.com" \
  commit -m "Add README with run instructions, design decisions, next steps"
git push
```

---

### Task 5.2: Record the Loom

**Files:** none — recording task

- [ ] **Step 1: Outline (3-5 minutes total)**

- 0:00-1:00 — **Demo the flow** on your phone screen (record screen + face cam if comfortable). Walk through intro → reading → MCQ (deliberately pick a wrong answer once, show remediation + follow-up) → simulation → MCQ → voice tutor (have a quick recap conversation).
- 1:00-3:30 — **2-3 design decisions:**
  - Scripted curriculum vs. AI-generated (accuracy)
  - OpenAI Realtime API for voice tutor (latency, single-vendor, mobile)
  - Single-toggle simulation (scope discipline)
- 3:30-4:30 — **Overall reasoning** — how the teaching modality maps to the four evaluation criteria.
- 4:30-5:00 — **What I'd build next** — quickly: multi-lesson, telemetry on misconceptions, RAG-grounded code citations.

- [ ] **Step 2: Rehearse once (no recording)**

Time yourself. Adjust if over 5 minutes.

- [ ] **Step 3: Record**

Use Loom. Aim for one take. If you stumble, the brief says "we are not asking for polish" — keep going.

- [ ] **Step 4: Get the share link**

Make sure the link is public.

---

### Task 5.3: Final deploy and submit

**Files:** none

- [ ] **Step 1: Make sure `main` is pushed and Vercel is green**

```bash
git status
git log --oneline | head -5
```

Open the Vercel dashboard, confirm the latest commit is deployed and the URL works.

- [ ] **Step 2: Tap the URL on your phone one last time**

Walk through the lesson on real hardware. If anything is broken, fix it now.

- [ ] **Step 3: Compose the submission email**

To: `jason@thefrontierinstitute.org`

Subject: `Frontier Engineering Take-Home — Jacob Wagner`

Body:

```
Hi Jason,

Take-home submission:

- Repo: <GITHUB-URL>
- Live demo: <VERCEL-URL>
- Loom (~5 min): <LOOM-URL>

The lesson is a 5-10 minute mobile-first walkthrough of why residential
N-G bonding happens at exactly one point, with hand-authored reading +
remediation, a single-toggle simulation, and an OpenAI Realtime voice
tutor for the Socratic recap. Design decisions and "what I'd build next"
are in the README and the Loom.

Payment handle: <Venmo / Zelle / Wise / PayPal — pick one>

Happy to answer any questions.

Thanks,
Jacob
```

- [ ] **Step 4: Send**

- [ ] **Step 5: Done**

---

## Cut list (if Wednesday morning runs short)

Drop in this order:
1. The `FollowUpChat` "Ask a follow-up" affordance on remediation screens — out of scope's optional anyway.
2. The current-flow animation on the simulation (static SVG is still effective).
3. The text fallback for the voice tutor — only if voice is bulletproof.

Do **not** cut:
- Curriculum accuracy / fact-checking
- Mobile responsiveness
- Voice tutor end-to-end (or its text fallback if voice fails)
- README + Loom

---

## Self-Review Notes

- Every spec section maps to at least one task: curriculum → 0.6, 0.7, 4.6; architecture → 0.5, 1.5, 3.2-3.4, 4.1, 4.2; modality flow → 1.1-1.5, 2.x, 3.x, 4.4; remediation strategy → 1.4, 4.2; failure modes → 4.3 (voice fallback), 4.1 (chat error handling).
- Type names used in later tasks (`MCQOption`, `LessonState`, `RealtimeSession`) match definitions in earlier tasks.
- No "TBD" or "TODO" placeholders in plan steps; curriculum body has explicit `[bracketed]` skeletons that the author fills in during Task 0.7.
- Commands include expected outputs where useful.
- Out-of-scope items (auth, DB, multi-lesson, native app, fault scenario, load slider) match the spec and are not introduced by any task.
