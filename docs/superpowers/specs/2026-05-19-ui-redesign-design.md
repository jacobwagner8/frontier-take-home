# UI Redesign — Educational Direction

**Date:** 2026-05-19
**Predecessor spec:** `2026-05-18-bonding-teaching-tool-design.md`
**Scope:** Polish-pass over the existing app. No new lessons, no new features, no state-machine changes.

## Goal

Replace the bare slate-grayscale UI with a coherent visual identity tuned for a phone-first trade-school audience. Same flow, same content, same accessibility behaviors — better-looking and better-organized.

## Design direction

Brainstorming validated **Direction A: Educational** — warm cream backgrounds, deep teal primary, friendly rounded type, generous spacing. Reference feel: Khan Academy / modern textbook. Picked over Trade & Tools (felt too aggressive) and Technical & Clean (felt too corporate for vocational students).

## Color palette

All values are CSS custom properties exposed via Tailwind 4's `@theme` so components reference semantic names, not raw hex.

| Token | Hex | Usage |
|---|---|---|
| `--color-canvas` | `#FAFAF7` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, dialog, panels |
| `--color-surface-muted` | `#F5F5F0` | Callout backgrounds (caption block) |
| `--color-text` | `#1C1917` | Body text |
| `--color-text-strong` | `#0C0A09` | Headings |
| `--color-text-muted` | `#57534E` | Secondary text |
| `--color-text-subtle` | `#78716C` | Tertiary / eyebrow text |
| `--color-border` | `#E7E5E4` | Subtle borders + progress track |
| `--color-brand` | `#0F766E` | Primary CTA, brand mark, accent rail, EGC conductor |
| `--color-brand-soft` | `#CCFBF1` | Selected MCQ option tint, hover wash |
| `--color-neutral-wire` | `#A8A29E` | Neutral conductor in the simulation |
| `--color-danger` | `#DC2626` | Bond strap in simulation, remediation "Not quite" label, error states |

The teal `--color-brand` doubles as the EGC conductor color in the simulation, so the lesson's color language stays consistent end-to-end: teal means *equipment grounding*.

## Typography

- **Font:** Inter via `next/font/google` (replaces Geist). Loaded with `weight: ["400","500","600","700"]`, subset latin, `variable: --font-sans`.
- **Geist Mono** removed — nothing in the lesson surfaces code or numeric data tables.
- **Heading scale:**
  - `h1` (lesson shell): 14px / 1.3 / 600 — sets context, not a billboard
  - `h2` (step heading): 20px / 1.25 / 600 / `letter-spacing: -0.005em`
  - `h3` (subsections, modal title): 16-18px / 600
- **Body:** 14-15px / 1.55-1.6 line height for prose; 13px for captions / secondary text.
- **Eyebrow text:** 11px / uppercase / `letter-spacing: 0.06em` / weight 600.

## Component primitives

| Primitive | Style |
|---|---|
| **Primary button** | `bg-brand text-white rounded-2xl px-5 py-3 font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]` |
| **Secondary button** | `border border-border text-text-strong rounded-2xl px-5 py-3 font-medium hover:bg-canvas` |
| **Card** | `bg-surface rounded-2xl border border-border shadow-[0_1px_2px_rgba(28,25,23,0.04)]` |
| **Input** | `border border-border rounded-xl px-4 py-3 text-base focus:border-brand focus:ring-2 focus:ring-brand/20` |
| **Toggle** (iOS-style) | 36×22 pill, knob slides; `bg-brand` on, `bg-border` off; replaces the bare checkbox in `SimulationScreen` |
| **Callout** (caption block) | Cream `bg-surface-muted` rounded-2xl with a 3px brand-color left rail |
| **Modal** | Native `<dialog>` (preserved from Phase 4) restyled with rounded-3xl + larger title + `::backdrop` darkened to brand-soft tint |
| **Progress bar** | 4px height (up from 1px), `bg-border` track, `bg-brand` fill, rounded |
| **Brand mark** | Inline lightning-bolt SVG, 22×22 rounded-md, teal fill — sits next to the eyebrow in `LessonShell` |

## Simulation SVG redesign

Replaces the schematic line-drawing in `SimulationScreen`. New visual: **stylized realistic panel cutaway**.

Elements per panel:
- Outer enclosure: rounded rectangle with 2px dark stroke, white fill
- 6px solid brand-colored header band inside the top of each enclosure
- 4 breaker rectangles in the main panel (2×2 grid, soft gray)
- Neutral bus: gray (`--color-neutral-wire`) rounded bar with 5 small white screw marks
- EGC bus: brand-teal rounded bar with screw marks
- Main bonding jumper: red vertical strap between the two buses, with screws at top and bottom, labeled "Main bond"

Feeders:
- Neutral feeder: 3.5px gray line, dashed via existing `stroke-dasharray` for the current-flow animation
- EGC feeder: 3.5px teal line, dashed, animates only when `secondBond` is true

Labels (per brainstorming feedback — option A's labels merged onto option B's visual):
- "MAIN PANEL", "SUBPANEL" above each enclosure, uppercase 10px / 700 / letter-spacing 0.06em
- "Neutral bus", "EGC bus" under each bus inside the main panel
- "Neutral feeder", "EGC feeder" above/below each feeder
- "Load" above the load rectangle

Load: rounded rectangle with a small concentric-circle appliance icon, connected to the subpanel by a thin gray line.

Second bond (toggle-on state): red strap rendered between the subpanel's N and EGC buses, mirroring the main bond's treatment.

The `viewBox` becomes `0 0 360 220` (down from the current `0 0 800 500` — tighter aspect that fills phone widths without excess vertical space). Animation classes (`current-flow-n`, `current-flow-egc`) and the `prefers-reduced-motion` guard carry over from Phase 2.

## Per-screen application

These are *style application notes*, not redesigns — the structural layout and JSX shape stay the same.

| Screen | Notable changes |
|---|---|
| Landing (`app/page.tsx`) | Brand mark + eyebrow header, Inter-set headline, primary CTA in new button style |
| Reading (`ReadingScreen`) | Body prose at 15px / 1.6, `whitespace-pre-wrap` preserved; image (if any) wrapped in card primitive |
| MCQ (`MCQuestionScreen`) | Native radio inputs preserved; selected `<label>` gets `border-brand bg-brand-soft/40` tint instead of plain slate. Submit is the new primary button. |
| Remediation (`RemediationScreen`) | "Not quite" eyebrow stays red. Body prose styled. Try-again is primary button; Ask-follow-up is secondary. The scoped `role=status` wrapper from PR #5 review is preserved. |
| Simulation (`SimulationScreen`) | Full redesign per "Simulation SVG redesign" section above. SVG in card; iOS toggle replaces checkbox; cream callout for caption. |
| Voice tutor (`VoiceTutorScreen`) | Status pill above the transcript log, transcript log in cream callout treatment, Start CTA as primary button. Mode-switch to text fallback retained. |
| FollowUp / TextRecap chat | `useChat` hook unchanged. Modal restyled with rounded-3xl + brand-tinted backdrop. Text-chat input gets new input primitive. |
| Completion (`CompletionScreen`) | Centered card with brand mark, recap prose, restart secondary button. No confetti. |

## What is NOT changing

- All curriculum content (`lib/curriculum.ts`)
- State machine (`lib/lessonMachine.ts`)
- `useChat` hook, `realtimeClient`, route handlers (API surface unchanged)
- Accessibility behaviors: `role=status`, `aria-live`, `role=dialog` + focus return from native `<dialog>`, `prefers-reduced-motion` animation suppression, native `<input type=radio>` for MCQs
- Tests — the existing 27 tests should pass unchanged. New tests are not in scope.

## Implementation notes

- **Tailwind 4 `@theme inline`** is the existing pattern in `app/globals.css`; extend it with the new tokens rather than introducing a separate config.
- **Inter swap:** edit `app/layout.tsx` to replace `Geist` + `Geist_Mono` imports with `Inter`. Remove the mono `--font-geist-mono` variable since nothing uses it.
- **Brand mark** lives in a tiny `components/BrandMark.tsx` so it's reusable in `LessonShell` and `CompletionScreen`.
- **Toggle component:** new `components/Toggle.tsx` — a styled `<label>` wrapping a visually-hidden `<input type=checkbox>`. The pill graphic is the label background; native checkbox gives keyboard + form semantics + assistive-tech labeling for free.
- **Modal backdrop tint:** Tailwind's `backdrop:` variant on the existing `<dialog>` element — switch from `backdrop:bg-black/40` to a warmer dark-stone tint (`backdrop:bg-[#1C1917]/40` or the equivalent semantic token) that doesn't read jet-black against the cream canvas.

## Success criteria

1. All 27 tests still pass; build clean; lint clean.
2. Every screen visibly uses the new color/type system — no slate-700 / slate-900 strings left in component files.
3. The simulation SVG renders the new stylized panel with all labels from the brainstormed mockup.
4. iOS-style toggle replaces the bare checkbox in `SimulationScreen`. The full label row (pill + text) is tappable so the effective target is ≥44px tall.
5. Accessibility behaviors regression-tested by manual screen-reader pass on RemediationScreen and the FollowUp dialog.
6. README screenshot (or live URL) reflects the new look.

## Out of scope

- Multi-lesson navigation, hero illustrations, completion celebrations beyond a recap card.
- Brand identity work beyond the lightning-bolt mark.
- Light / dark mode toggle (the cream canvas works on both — but we're not building a dark variant).
- Animation library beyond the existing CSS keyframes.
- New tests; existing ones must keep passing.
