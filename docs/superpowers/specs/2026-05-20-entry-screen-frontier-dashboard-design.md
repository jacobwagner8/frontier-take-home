# Entry Screen — Frontier Dashboard Framing

**Date:** 2026-05-20
**Status:** Approved
**Audience:** Take-home reviewer.

## Goal

Replace the current "Let's get started" entry screen at `/` with a layout that suggests this single lesson sits inside a larger Frontier learning platform — without building a real platform. The reviewer should see at a glance that this is "today's lesson" for a logged-in student on a multi-lesson course track. Frontier branding appears on the entry page only; the lesson flow itself is untouched.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Where the dashboard framing lives | `app/page.tsx` only | The lesson is the product; the entry is the mock platform shell. Keeps `LessonShell` and the lesson flow unchanged. |
| Frontier wordmark placement | Entry page only | The lesson header already has a brand mark + course eyebrow. Adding "Frontier" inside the lesson would compete with the lesson title for attention. |
| Student name | Hardcoded "Jake Wagner" | No auth, no DB. The reviewer is the audience and seeing their name personalizes the demo. |
| Course progress | Hardcoded `3 / 30 lessons`, day 4 | Implies a real course without faking interactivity. |
| Upcoming lessons shown | One line: "Lesson 5 — GFCI vs AFCI" | Enough to hint at a curriculum; more would imply a working dashboard. |
| Data source | Inline constants at top of `page.tsx` | No abstraction. It's mock platform context for one screen, not a feature. |

## Layout

Single-column mobile-first page. Vertical order:

1. **Top bar (full width)**
   - Left: small Frontier logo (reuse `BrandMark`) + "Frontier" wordmark (Inter, semibold).
   - Right: profile chip — small brand-colored circle with initials `JW`, followed by "Jake Wagner" in muted text.
2. **Eyebrow:** "RESIDENTIAL ELECTRICIAN TRACK" in the existing uppercase-tracked subtle style.
3. **Greeting:** "Good morning, Jake." (`text-2xl font-semibold text-text-strong`, matching the current entry headline scale).
4. **Course progress row:** "Day 4 · 3 / 30 lessons" with a thin horizontal progress bar at `3/30 = 10%` using the same `bg-brand` + `bg-border` styling as `LessonShell`'s progress bar.
5. **Today's lesson card** (`rounded-2xl border border-border bg-surface-muted p-5`):
   - Tiny meta line: "LESSON 4 · 5–10 MIN" (uppercase, tracked).
   - Title: "Neutral & Ground Bonding".
   - Tagline: existing "One bond, exactly one place."
   - Existing brand `Start lesson →` button linking to `/lesson` — same className as today's button so it doesn't drift.
6. **Up next** (muted footer line under the card): "Up next: Lesson 5 — GFCI vs AFCI".

The current entry copy ("A 5–10 minute lesson on why…") is dropped. The new framing carries enough context without it.

## Branding

- `BrandMark` is reused as-is. No SVG changes.
- "Frontier" wordmark is plain text next to the mark, same `text-text-strong` weight as a section title.
- Greeting uses first name only ("Jake") for warmth; full name appears in the top-right profile chip.

## Files

**Modified**
- `app/page.tsx` — full rewrite to render the dashboard framing described above. Hardcoded constants live at the top of the file (`STUDENT_NAME`, `STUDENT_FIRST_NAME`, `STUDENT_INITIALS`, `COURSE_NAME`, `LESSONS_COMPLETED`, `LESSONS_TOTAL`, `DAY_NUMBER`, `TODAY_LESSON_NUMBER`, `TODAY_LESSON_TITLE`, `TODAY_LESSON_TAGLINE`, `TODAY_LESSON_DURATION`, `NEXT_LESSON_LABEL`).
- `app/layout.tsx` — update `metadata.title` to `"Frontier — Residential Electrician Track"`. Description left as-is (still accurate for the lesson).

**Unchanged**
- `components/LessonShell.tsx`, `components/BrandMark.tsx`, all in-lesson screens, the lesson state machine, and every other component.

## Testing

This change is a static layout swap with no logic. Coverage:

- `npm run test:run` — existing 80 tests must still pass (no production code is touched outside `app/page.tsx` and `app/layout.tsx`).
- `npm run build` — typecheck must pass.
- Manual smoke: load `/`, click `Start lesson`, confirm lesson flow still routes and renders.

No new automated tests. The entry is a one-screen visual mock and has no behavior beyond the existing `next/link` navigation.

## Out of scope

- A real course catalog, lesson list, or any data layer.
- Lesson completion state, persistence, or a working progress bar (the `3 / 30` is purely visual).
- Auth, profile editing, or any interactivity in the top-right chip.
- Changes to the in-lesson header, lesson screens, or `BrandMark` shape.
- A separate `<PlatformShell>` component — the framing only exists on one page, so inlining beats abstraction.

## Risks

- **Metadata title length:** "Frontier — Residential Electrician Track" is 40 chars; safe across desktop tabs. If it ever needs to coexist with the lesson title, that's a future concern.

All referenced Tailwind tokens (`text-text-strong`, `text-text-muted`, `text-text-subtle`, `bg-surface-muted`, `bg-canvas`, `bg-border`, `border-border`, `bg-brand`) are confirmed present in `app/globals.css`.
