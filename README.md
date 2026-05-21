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

1. **AI-generated curriculum, validated through an in-house eval engine and hand-checked.** Subject-matter accuracy is the highest-risk failure mode for a teaching tool, but writing everything by hand doesn't scale to a 30-lesson course. The reading, MCQ options, remediation paragraphs, and the tutor's grounding facts are all model-generated, then run through the experimental eval engine in `experimental/eval-engine/` (factual-accuracy and learning-goal coverage against an atomic-fact knowledge base) and hand-validated alongside it against NEC 2023 (250.24(A), 250.142, 250.6). The eval engine is built to point at where this goes — automated, personalized lesson generation with structured grounding instead of on-the-fly model prose — but at this stage, with no production exposure and only a small validation corpus, the safe path is still human-in-the-loop on every fact. A curriculum integrity test (`tests/curriculum.test.ts`) enforces the structural invariants the eval engine relies on — exactly one correct option per MCQ, remediation paragraph and misconception tag on every wrong option, etc.
2. **AI is used where it shines: open-ended dialogue.** The voice tutor performs Socratic recap with the curriculum baked into its system prompt server-side, so the student can never see or shape the prompt. The "Ask a follow-up" button that appears beneath a wrong MCQ answer uses the same grounding, and the system prompt extends with the specific misconception the student picked so the chat picks up the thread directly. If voice fails (mic denied, network, model error), "Type instead" swaps to a text-chat fallback in place.
3. **Simulation is one toggle, not a sandbox.** The lesson is about one physical concept (parallel return paths through the EGC). The SVG isolates exactly that: a checkbox adds a second bond at the subpanel, the EGC's current arrows start animating, and a "current now flowing on the EGC" warning appears alongside a caption swap. No load slider, no fault scenarios — those would split attention away from the concept.

## What I'd build next
- Per-student progress + spaced repetition, so retention is measured, not just first-pass completion.
- A telemetry layer recording which wrong MC options students pick most often, so the curriculum team can refine remediation paragraphs against real evidence.

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
