import { curriculum } from "./curriculum";
import { kgAtomicFacts } from "./kgFacts";
import type { MCQ, MCQOption } from "./curriculum.types";

const COMPREHENSION_MCQS: readonly MCQ[] = [
  curriculum.mcq1,
  curriculum.mcq1b,
  curriculum.mcq2,
];

export interface FollowUpMatch {
  mcq: MCQ;
  wrongOption: MCQOption;
}

export function findMcqByMisconceptionTag(
  tag: string,
): FollowUpMatch | null {
  for (const mcq of COMPREHENSION_MCQS) {
    const wrong = mcq.options.find(
      (o) => !o.isCorrect && o.misconceptionTag === tag,
    );
    if (wrong) return { mcq, wrongOption: wrong };
  }
  return null;
}

const HARD_RULES = `# Hard rules — read first, follow exactly
- DO NOT identify or describe any multiple-choice option as the correct answer. That includes naming it by letter (A/B/C/D), paraphrasing the option's text, hedging ("it's basically the one that says…"), or giving warm/cold feedback ("you're close", "warmer/colder"). The student must arrive at the correct option themselves on the retry.
- DO NOT rule out enough options for the student to deduce the answer by elimination. You may confirm that their already-picked wrong option is wrong (they've seen the remediation for it), but do not adjudicate the other options.
- If the student explicitly asks "which one is right?" or "just tell me the answer", decline and ask a guiding question that helps them reason about the underlying mechanism.
- DO answer the student's actual question. Explain the physics, the NEC rules, the mechanism, give analogies, correct misunderstandings.
- Use ONLY the facts in the "Knowledge base" section below as ground truth. Do not invent NEC code references, numeric values, or product specifics. If a fact is not in the knowledge base, do not state it.
- If the student asks about a topic outside this lesson (three-phase systems, motors, transformers, specific products, code editions other than what is cited below, etc.), briefly say it is outside this lesson and steer back to the bonding concept.
- Keep replies short — 2-4 sentences, conversational, like a senior electrician mentoring an apprentice.`;

function mcqSection(match: FollowUpMatch): string {
  const { mcq, wrongOption } = match;
  const optionLines = mcq.options
    .map((o, i) => `${String.fromCharCode(65 + i)}. ${o.text}`)
    .join("\n");
  return `# The question the student is about to retry
${mcq.prompt}

# Options shown to the student
${optionLines}

# Which option the student picked (this one is wrong)
"${wrongOption.text}"

# The remediation the student just read on screen
${wrongOption.remediation ?? "(no remediation supplied for this option)"}`;
}

export function buildFollowUpSystemPrompt(tag?: string): string {
  const match = tag ? findMcqByMisconceptionTag(tag) : null;
  const facts = kgAtomicFacts
    .map((f, i) => `${i + 1}. ${f.statement}`)
    .join("\n");

  const intro = match
    ? `You are a Socratic tutor helping a student who just picked the WRONG answer on a multiple-choice question in a lesson on US residential electrical neutral-to-ground bonding. After this chat the student will retry the same question, so your job is to help them THINK through the underlying concepts — never to hand them the answer.`
    : `You are a Socratic tutor helping a student who is asking a follow-up question during a lesson on US residential electrical neutral-to-ground bonding. The student is between attempts on a comprehension question, so your job is to help them THINK through the underlying concepts — never to hand them the answer.`;

  const sections = [intro, HARD_RULES];
  if (match) sections.push(mcqSection(match));
  sections.push(
    `# Reading the student saw earlier in the lesson\n${curriculum.reading1.body}`,
  );
  sections.push(
    `# Knowledge base — atomic facts grounded in NEC 2023 and standard residential practice\n${facts}`,
  );
  return sections.join("\n\n");
}
