# Frontier Take-Home — N-G Bonding Teaching Tool

A 5-10 minute, mobile-first lesson on why a US residential electrical system bonds neutral and ground at exactly one point — and what physically goes wrong if there's more than one. Hand-authored reading + comprehension questions with per-misconception remediation, a single-toggle SVG simulation of current flow, and an OpenAI Realtime voice tutor for a Socratic recap.

**Live demo:** https://frontier-take-home.vercel.app

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- OpenAI Realtime API (GA, `gpt-realtime`, WebRTC) for the voice tutor
- OpenAI Chat Completions (`gpt-4o-mini`) for the "Ask a follow-up" affordance and the voice-tutor text fallback
- Vitest + React Testing Library for logic tests

## Run locally
```bash
cp .env.local.example .env.local       # then paste your OPENAI_API_KEY into .env.local
npm install
npm run dev                            # http://localhost:3000
```

The lesson works fully without an API key — only the voice tutor and the "Ask a follow-up" / "Type instead" chats need the key.

## Tests
```bash
npm run test:run    # 113 tests: state machine, curriculum integrity, tutor prompt, MCQ phase machine, simulation toggle, analytics, chat surfaces, eval engine
npm run build       # production build + typecheck
npm run lint
```

## Design decisions

1. **Hand-authored curriculum, not AI-generated.** Subject-matter accuracy is the highest-risk failure mode for a teaching tool. The reading, MCQ options, remediation paragraphs, and the grounding facts the voice tutor uses are all written by hand against NEC 2023 (250.24(A), 250.142, 250.6). A curriculum integrity test (`tests/curriculum.test.ts`) enforces structural invariants — every MCQ has exactly one correct option, every wrong option has a remediation paragraph and a misconception tag, etc.
2. **AI is used where it shines: open-ended dialogue.** The voice tutor performs Socratic recap with the curriculum baked into its system prompt server-side, so the student can never see or shape the prompt. The "Ask a follow-up" button that appears beneath a wrong MCQ answer uses the same grounding, and the system prompt extends with the specific misconception the student picked so the chat picks up the thread directly. If voice fails (mic denied, network, model error), "Type instead" swaps to a text-chat fallback in place.
3. **Simulation is one toggle, not a sandbox.** The lesson is about one physical concept (parallel return paths through the EGC). The SVG isolates exactly that: a checkbox adds a second bond at the subpanel, the EGC's current arrows start animating, and a "current now flowing on the EGC" warning appears alongside a caption swap. No load slider, no fault scenarios — those would split attention away from the concept.
4. **No DB, no auth, no persistence.** Per the brief; the lesson resets on refresh. State lives in a `useReducer` lesson machine (`lib/lessonMachine.ts`) with explicit `reading1 → mcq1 → mcq1b → simulation → mcq2 → voiceTutor → done` transitions and unit tests covering every transition. Wrong-answer remediation and the per-MCQ rationale render inline within `MCQuestionScreen` (phase-derived `picking | wrong | correct`) rather than as separate states, so the learner reads the explanation without losing the question's context.

## What I'd build next
- Multi-lesson curriculum spine — this is lesson 1 of a roughly 30-lesson introductory electrician course. The shell + state machine pattern generalize.
- Per-student progress + spaced repetition, so retention is measured, not just first-pass completion.
- A telemetry layer recording which wrong MC options students pick most often, so the curriculum team can refine remediation paragraphs against real evidence.
- RAG over NEC + Mike Holt corpus for the follow-up chat, so the tutor can cite specific code articles safely instead of being limited to the six grounding facts.
- Native bottom-sheet behavior for the follow-up modal on phones — the switch to native `<dialog>` for real focus-trap semantics traded the previous mobile bottom-sheet layout for a centered card on all viewports.
- Real-device QA matrix (iOS Safari + Android Chrome + desktop) automated via Playwright + BrowserStack, instead of the current manual pass.

## Files of note

| Path | What |
|---|---|
| `lib/curriculum.ts` | All lesson content (reading, MCQs, remediations, sim captions, tutor grounding facts) |
| `lib/lessonMachine.ts` | Lesson state machine — discriminated-union reducer, `progressFor` helper |
| `lib/tutorPrompt.ts` | System prompt builder grounded by `curriculum.voiceTutor` |
| `lib/useChat.ts` | Shared hook backing `FollowUpChat` + `TextRecapChat` |
| `lib/realtimeClient.ts` | WebRTC peer / SDP exchange / transcript event handling |
| `app/api/realtime-session/route.ts` | Mints ephemeral OpenAI Realtime tokens (GA `/v1/realtime/client_secrets`) |
| `app/api/chat/route.ts` | Grounded chat completions for follow-up + voice fallback |
| `components/MCQuestionScreen.tsx` | Multiple-choice screen with inline wrong-answer remediation, per-MCQ rationale, and the follow-up chat trigger |
| `components/SimulationScreen.tsx` | Interactive panel + animated current arrows |
| `components/VoiceTutorScreen.tsx` | Voice/text mode switch, status + transcript live regions |
| `components/FollowUpChat.tsx` | Native `<dialog>` modal scoped to a specific misconception |
| `docs/superpowers/specs/2026-05-18-bonding-teaching-tool-design.md` | Design doc (curriculum, modality, scope) |
| `docs/superpowers/plans/2026-05-18-bonding-teaching-tool.md` | Phased implementation plan executed in this repo |
