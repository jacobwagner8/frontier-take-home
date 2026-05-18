# Frontier Take-Home — N-G Bonding Teaching Tool

**Date:** 2026-05-18
**Deadline:** 2026-05-20 (Wednesday afternoon)
**Submission target:** jason@thefrontierinstitute.org

## Goal

Build a phone-first web app that teaches one self-contained concept in a 5-10 minute session:

> Why a residential electrical system can have neutral and ground bonded at exactly one point, and what physically goes wrong if there is more than one.

The student has prior electrical fundamentals but has never seen this specific concept. The app must run with one command locally or as a simple Vercel deployment. No real auth, DB, or heavy backend.

## Evaluation Criteria

Per the brief, four things are graded:

1. **Technical execution** — code runs, core functionality handles failure modes
2. **Scope discipline** — one teaching method done well beats three half-built
3. **Product judgment** — the tool teaches to the audience (entry-level electricians, mobile-first)
4. **Subject matter accuracy** — curriculum is correct and AI features do not hallucinate

## Curriculum (Subject Matter)

### The concept, accurately stated

In a US residential service, the utility's split-phase secondary uses a *grounded neutral* — one of the conductors is intentionally tied to earth. NEC 250.24 requires this neutral-to-ground bond to occur at **exactly one point: the service disconnect** (typically the main panel). The main bonding jumper / bonding screw ties the neutral bus, the EGC bus, the panel enclosure, and the grounding electrode system together at that single point.

Downstream of that point, the **neutral (N) carries normal return current** and the **equipment grounding conductor (EGC) carries fault current only, briefly.** They are kept electrically separate everywhere downstream — in subpanels, the N bus is isolated from the panel enclosure (no bonding screw).

### What goes wrong with a second N-G bond

The N and the EGC form a parallel pair between the second bond and the main bond. By Kirchhoff/Ohm, normal load return current splits between the two conductors proportional to their admittance. Consequences:

1. **Objectionable current on EGCs** — the EGC, metal raceways, bonded enclosures, water pipes, and the grounding electrode conductor carry load current continuously. They were never sized or insulated for that.
2. **Touch voltage on "grounded" surfaces** — current flowing on bonded metal parts produces voltage drops. A person touching two bonded surfaces at different potentials can complete the circuit.
3. **GFCI behavior degrades** — GFCIs detect imbalance between hot and neutral. Parallel EGC return paths confuse this detection, causing nuisance trips or, worse, masked faults.
4. **Fault clearing is unpredictable** — during a ground fault, the desired path is hot → EGC → main bond → neutral → source, fast and high-current to trip the breaker. With multiple bonds, fault current divides across multiple paths; some paths may have too much impedance to trip the breaker promptly.

### Sources to fact-check against

- NEC 2023 Articles 250.24(A)(5), 250.30, 250.142, 250.6
- Mike Holt's published material on grounding vs. bonding
- IAEI articles on subpanel bonding

## Teaching Modality

A linear, mastery-learning lesson flow:

1. **Reading screen** — short textbook-style paragraph + diagram introducing the rule and the concept.
2. **Multiple-choice comprehension question.**
   - Correct → advance.
   - Incorrect → scripted remediation paragraph addressing the specific misconception that wrong answer represents → retry with another (or same) question.
3. **Interactive simulation** — a single SVG diagram with one toggle ("Add second bond at subpanel"). Current-flow arrows redistribute when toggled. Caption text updates.
4. **Second multiple-choice comprehension question** — on the simulation's lesson, with the same remediation pattern.
5. **Voice AI tutor** — OpenAI Realtime API. Asks the student to recap what they learned, asks 1-2 Socratic follow-up questions, gives feedback. Grounded by curriculum content in the system prompt.
6. **Completion screen** — done.

### Why this modality

- **Subject-matter accuracy is locked in** because reading, MC options, and remediation are entirely hand-authored. Zero LLM-generated technical claims.
- **AI is core where it shines** (voice recap = open-ended dialogue) and absent where scripting wins (technical content delivery).
- **Mastery-learning pattern** (read → retrieve → remediate → simulate → recap) is pedagogically sound for retention.
- **Mobile-friendly** — chat, MCQs, and a single-toggle simulation all work cleanly on a phone.

### Remediation strategy

- Each wrong MC option has a **pre-authored remediation paragraph** addressing that specific misconception. Instant, hallucination-free.
- On every remediation screen, an optional **"Ask a follow-up"** button opens a small grounded text chat using `/api/chat`, scoped to that specific misconception. This serves the long-tail student who needs more help, without exposing the default path to AI accuracy risk.
- The text-chat route doubles as the voice tutor's text fallback.

## Architecture

### Stack

- **Next.js (App Router) + TypeScript** on Vercel
- **Tailwind CSS** for mobile-first styling
- **OpenAI Realtime API** for the voice tutor (WebRTC, ephemeral token)
- **OpenAI Chat Completions** for the "Ask a follow-up" feature and text fallback
- **No DB, no auth, no persistence across sessions**

### File layout

```
app/
  layout.tsx                       # root, mobile viewport meta, font
  page.tsx                         # landing / "Start lesson" CTA
  lesson/page.tsx                  # single-page lesson surface, drives state machine
  api/
    realtime-session/route.ts      # POST → ephemeral OpenAI Realtime session token
    chat/route.ts                  # POST → grounded text completion (follow-ups + voice fallback)
components/
  LessonShell.tsx                  # mobile container, progress indicator
  ReadingScreen.tsx                # markdown body + image, "Continue"
  MCQuestionScreen.tsx             # radio options, instant feedback
  RemediationScreen.tsx            # variant reading + "Ask follow-up" + retry CTA
  SimulationScreen.tsx             # SVG diagram, bond toggle, animated current arrows
  VoiceTutorScreen.tsx             # WebRTC mic/speaker UI, transcript display
  FollowUpChat.tsx                 # small modal chat for "Ask a follow-up"
  CompletionScreen.tsx             # summary + restart
lib/
  curriculum.ts                    # all lesson content, typed, hand-authored
  lessonMachine.ts                 # useReducer state machine
  tutorPrompt.ts                   # system-prompt builder for voice tutor + chat
  realtimeClient.ts                # WebRTC connection helpers
public/images/                     # panel diagrams (SVG)
```

### Lesson state machine

A single `useReducer` in `lesson/page.tsx`. States flow linearly with one branch on wrong MC answers:

```
intro
  → reading1
  → mcq1
  → (incorrect ? remediation1 → mcq1_retry → ...)
  → simulation
  → mcq2
  → (incorrect ? remediation2 → mcq2_retry → ...)
  → voiceTutor
  → done
```

Actions: `ADVANCE`, `ANSWER_MCQ(optionId)`, `RESET_MCQ`, `RESTART_LESSON`.

Each screen is a pure presentational component receiving state + callbacks as props.

### Data flow

- Curriculum is a **typed static module** (`lib/curriculum.ts`). No fetch, no DB. Bundles with the app.
- Voice tutor: client POSTs to `/api/realtime-session`; the route handler creates an ephemeral OpenAI Realtime session with the system prompt embedded server-side, returns the ephemeral token. Client uses the token to establish a WebRTC peer connection.
- `OPENAI_API_KEY` lives only in Vercel env vars. Never on the client.
- Follow-up chat: client POSTs to `/api/chat` with `{misconceptionId, userMessage}`. Route builds a grounded prompt using the curriculum + the specific misconception context.
- No persistence. Lesson resets on refresh.

### Failure modes

| Failure | Handling |
|---|---|
| Voice tutor fails to connect (network, browser perms, API outage) | Fall back to text chat using `/api/chat` with the same grounded prompt. Surfaced as a "Type your recap instead" button. |
| Mic permission denied | Friendly explanation + text-chat fallback. |
| User taps back during voice session | Graceful WebRTC peer disconnect on unmount. |
| Network drop mid-session | Reading / MCQ / simulation are entirely client-side and continue working. Only voice + follow-up chat require network. |
| OpenAI API rate limit / 5xx | Surface a clear error; offer the text fallback for voice, hide the "Ask a follow-up" affordance gracefully for chat. |

## Out of Scope

Explicit non-goals to enforce scope discipline:

- No authentication or accounts
- No database or cross-session persistence
- No multi-lesson navigation
- No analytics or telemetry
- No native mobile app
- No fault-injection scenario in the simulation
- No load-variable slider in the simulation
- No AI generation of the lesson body, MC options, or remediation text

## Timeline

Today: Monday afternoon (2026-05-18). Deadline: Wednesday afternoon (2026-05-20). Budget: ~14-18 focused hours across ~48 wall-clock hours.

### Phase 0 — Monday afternoon/evening (~3-4 hrs)

**Goal: deployable shell + complete curriculum text.**

- Scaffold Next.js + TS + Tailwind. Public GitHub repo.
- Wire Vercel preview deploy from `main` immediately.
- `OPENAI_API_KEY` in Vercel env vars; verify a `/api` route can read it.
- Build `LessonShell` skeleton (mobile viewport, basic layout, progress bar stub).
- Write full curriculum text in `lib/curriculum.ts`: reading sections, MC questions and options, scripted remediation per wrong answer. Fact-check against Mike Holt / NEC.

### Phase 1 — Tuesday morning (~3-4 hrs)

**Goal: reading + MC + remediation flow works end-to-end with scripted content.**

- `lessonMachine.ts` (useReducer + actions).
- `ReadingScreen`, `MCQuestionScreen`, `RemediationScreen` as pure components.
- Wire full read → MC → remediation → retry → next flow.
- Mobile pass on Chrome DevTools device emulator.

### Phase 2 — Tuesday afternoon (~3-4 hrs)

**Goal: simulation works.**

- `SimulationScreen`: SVG of service panel + subpanel + load + EGC + neutral + main bonding jumper.
- One toggle: "Add second bond at subpanel."
- Animated current arrows (CSS `stroke-dashoffset` or Framer Motion on path overlays).
- Caption text updates with toggle state.
- Test on a real phone via the Vercel preview URL.

### Phase 3 — Tuesday evening (~2-3 hrs) — HIGHEST RISK

**Goal: voice tutor works on a real phone.**

- `/api/realtime-session/route.ts`: ephemeral OpenAI Realtime token, system prompt with curriculum + topic guardrails baked in server-side.
- `VoiceTutorScreen` with WebRTC client (use OpenAI's Realtime quickstart as base).
- System prompt: verbatim curriculum content, allowed-topic list, hard "do not invent code references" instruction, off-topic redirect instruction.
- Test on real iOS Safari and real Android Chrome.
- If Realtime gives trouble, have text-chat fallback wired before phase ends.

### Phase 4 — Wednesday morning (~2-3 hrs)

**Goal: polish, follow-up feature, real-device QA.**

- "Ask a follow-up" button on remediation screens → `FollowUpChat` via `/api/chat`.
- Real-device QA: iPhone Safari, Android Chrome, desktop Chrome. Full lesson on each.
- Error states for OpenAI outages, mic denial, network drop.
- Final curriculum fact-check pass.
- Mobile polish: overflow, tap targets, focus states.

### Phase 5 — Wednesday early afternoon (~1-2 hrs)

**Goal: ship.**

- README: what it is, how to run locally, env vars, deploy URL.
- Loom (3-5 min): demo flow → 2-3 design decisions (scripted curriculum for accuracy, Realtime API for voice tutor, single-toggle simulation for scope discipline) → what to build next.
- Final Vercel deploy from `main`. Sanity check on phone.
- Submit to jason@thefrontierinstitute.org with repo link, deploy URL, Loom link.

### Buffer logic

- Voice tutor (highest risk) on Tuesday evening; all of Wednesday morning is fallback.
- If Wednesday morning runs short, the "Ask a follow-up" feature is the first cut. Everything else is core.
- Curriculum gets two fact-check passes (Monday authoring + Wednesday morning final review).

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| iOS Safari WebRTC audio quirks discovered late | Test on real iPhone during Phase 3, not Wednesday afternoon. |
| Curriculum inaccuracy | Hand-authored content from NEC + Mike Holt; two fact-check passes; zero LLM generation of technical claims. |
| Voice tutor hallucinates code references | System prompt explicitly forbids inventing code references; voice tutor's job is recap, not new instruction. |
| Simulation scope creep | Locked to one toggle. Sliders, load variation, and fault scenarios are out of scope. |
| Realtime API cost overrun | $250 from Frontier covers API costs; session length capped by lesson design (~2-3 min of voice). |
| Loom recording done at the last minute | Loom is in Phase 5 with explicit time budget; rehearse once before take. |

## Success Criteria

- Vercel URL loads on mobile and desktop and runs the full lesson without errors.
- A student with no prior exposure to this concept can complete the lesson in 5-10 minutes and explain the rule in their own words.
- The voice tutor sustains a 1-2 minute Socratic recap conversation without inventing code references or wandering off-topic.
- Repo, deploy URL, and Loom submitted by Wednesday afternoon.
