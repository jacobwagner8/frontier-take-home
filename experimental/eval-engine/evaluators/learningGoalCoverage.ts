import { z } from "zod";
import type { Curriculum } from "@/lib/curriculum.types";
import { callJudge, type CallJudgeRequest, type CallJudgeOptions } from "@/experimental/eval-engine/judge/openaiJudge";
import { majorityVote } from "@/experimental/eval-engine/judge/majorityVote";
import type { KGContext } from "@/experimental/eval-engine/kg";
import type { Evaluator, EvaluatorOptions, EvaluatorResult, PerItemVerdict } from "./types";
import { studentFacingSlots } from "./slots";

export const coverageResponseSchema = z.object({
  criteria: z.array(
    z.object({
      criterion_id: z.string(),
      verdict: z.enum(["met", "partial", "missing"]),
      reasoning: z.string(),
      evidence_excerpts: z.array(z.string()),
    }),
  ),
});

type CoverageVerdict = z.infer<typeof coverageResponseSchema>["criteria"][number]["verdict"];

interface InternalOptions extends EvaluatorOptions {
  __judge?: (
    req: CallJudgeRequest<z.infer<typeof coverageResponseSchema>>,
    opts: CallJudgeOptions,
  ) => Promise<{ parsed: z.infer<typeof coverageResponseSchema>; raw: unknown }>;
}

export interface CoverageCriterion {
  id: string;
  description: string;
  kind: "summary" | "teaches" | "addresses";
  targetId?: string;
}

export function buildCoverageCriteria(ctx: KGContext): CoverageCriterion[] {
  const out: CoverageCriterion[] = [
    {
      id: "summary",
      kind: "summary",
      description: `Lesson reading body communicates the learning goal's summary: "${ctx.learningGoal.summary}"`,
    },
  ];
  for (const fact of ctx.taughtFacts) {
    out.push({
      id: `teaches:${fact.id}`,
      kind: "teaches",
      targetId: fact.id,
      description: `Lesson teaches this fact in a student-facing slot (reading body, simulation captions, correct MCQ option, remediation, tutor grounding fact, or tutor opening): ${fact.statement}`,
    });
  }
  for (const m of ctx.addressedMisconceptions) {
    const tag = m.id.startsWith("misc.") ? m.id.slice("misc.".length) : m.id;
    out.push({
      id: `addresses:${m.id}`,
      kind: "addresses",
      targetId: m.id,
      description: `Lesson explicitly surfaces the misconception "${m.name}" (curriculum tag: "${tag}") AND addresses it. 'met' requires BOTH halves (surfaced as a wrong MCQ option matching the tag, AND addressed in the linked remediation). 'partial' if only one half is present.`,
    });
  }
  return out;
}

const RUBRIC = {
  dimension: "Learning Goal Coverage",
  levels: [
    { level: 1 as const, label: "Off-target", description: "The lesson does not communicate the learning goal's summary." },
    { level: 2 as const, label: "Gaps", description: "At least one non-summary teaches criterion is missing." },
    { level: 3 as const, label: "Adequate", description: "All teaches criteria met-or-partial; at least 50% of addresses criteria covered." },
    { level: 4 as const, label: "Full coverage", description: "All teaches met; 80%+ of addresses met-or-partial." },
  ] as [
    { level: 1; label: string; description: string },
    { level: 2; label: string; description: string },
    { level: 3; label: string; description: string },
    { level: 4; label: string; description: string },
  ],
};

function buildSystemMessage(ctx: KGContext, criteria: CoverageCriterion[]): string {
  return [
    "You are evaluating whether a lesson teaches a specific learning goal and addresses its known misconceptions.",
    "",
    `Learning goal id: ${ctx.learningGoal.id}`,
    `Learning goal question: ${ctx.learningGoal.question}`,
    `Learning goal summary: ${ctx.learningGoal.summary}`,
    "",
    "Coverage criteria (judge each independently):",
    criteria.map((c) => `- ${c.id}: ${c.description}`).join("\n"),
    "",
    "Use these verdicts:",
    "- 'met': the criterion is clearly satisfied with direct evidence in the lesson",
    "- 'partial': partially satisfied or implied but not direct",
    "- 'missing': not present in the lesson",
    "",
    "Provide one criteria[] entry per criterion id above (do NOT skip any). Quote evidence excerpts verbatim from the lesson.",
  ].join("\n");
}

function buildUserMessage(curriculum: Curriculum): string {
  const slots = studentFacingSlots(curriculum);
  const blocks = slots.map((s) => `--- ${JSON.stringify(s.slot)} ---\n${s.excerpt}`).join("\n\n");
  return ["Student-facing lesson content (wrong MCQ option text is intentionally excluded — those bait misconceptions, they do not teach):", "", blocks].join("\n");
}

function aggregate(
  judged: z.infer<typeof coverageResponseSchema>,
  criteria: CoverageCriterion[],
  model: string,
  runs: number,
): EvaluatorResult<CoverageVerdict> {
  const byId = new Map(judged.criteria.map((c) => [c.criterion_id, c]));
  const perItem: PerItemVerdict<CoverageVerdict>[] = criteria.map((c) => {
    const j = byId.get(c.id);
    return {
      target: { criterion: c.id },
      verdict: (j?.verdict ?? "missing") as CoverageVerdict,
      reasoning: j?.reasoning ?? "(judge did not return this criterion)",
      citedKGNodeIds: c.targetId ? [c.targetId] : [],
      confidence: "high",
    };
  });

  const summary = perItem.find((p) => (p.target as { criterion: string }).criterion === "summary");
  if (summary?.verdict === "missing") {
    return {
      evaluatorId: "learning-goal-coverage",
      dimension: RUBRIC.dimension,
      rating: 1,
      reasoning: "Summary criterion missing — lesson does not teach the learning goal.",
      perItem,
      unsureItems: [],
      runMetadata: { model, runs, timestampISO: new Date().toISOString() },
    };
  }

  const teachesItems = perItem.filter((p) => {
    const id = (p.target as { criterion: string }).criterion;
    return id.startsWith("teaches:");
  });
  const addressesItems = perItem.filter((p) => {
    const id = (p.target as { criterion: string }).criterion;
    return id.startsWith("addresses:");
  });

  const anyTeachesMissing = teachesItems.some((p) => p.verdict === "missing");
  if (anyTeachesMissing) {
    return {
      evaluatorId: "learning-goal-coverage",
      dimension: RUBRIC.dimension,
      rating: 2,
      reasoning: "One or more taught facts are missing from the lesson.",
      perItem,
      unsureItems: [],
      runMetadata: { model, runs, timestampISO: new Date().toISOString() },
    };
  }

  const allTeachesMet = teachesItems.every((p) => p.verdict === "met");
  const addressesCovered = addressesItems.filter((p) => p.verdict !== "missing").length;
  const addressesRatio = addressesItems.length === 0 ? 1 : addressesCovered / addressesItems.length;

  let rating: 1 | 2 | 3 | 4;
  if (allTeachesMet && addressesRatio >= 0.8) rating = 4;
  else if (addressesRatio >= 0.5) rating = 3;
  else rating = 2;

  return {
    evaluatorId: "learning-goal-coverage",
    dimension: RUBRIC.dimension,
    rating,
    reasoning: `Teaches: ${teachesItems.filter((p) => p.verdict === "met").length}/${teachesItems.length} met. Addresses: ${addressesCovered}/${addressesItems.length} covered.`,
    perItem,
    unsureItems: [],
    runMetadata: { model, runs, timestampISO: new Date().toISOString() },
  };
}

export const learningGoalCoverageEvaluator: Evaluator<CoverageVerdict> = {
  id: "learning-goal-coverage",
  dimension: RUBRIC.dimension,
  rubric: RUBRIC,
  async evaluate(curriculum: Curriculum, ctx: KGContext, opts?: EvaluatorOptions) {
    const internal = (opts ?? {}) as InternalOptions;
    const model = internal.model ?? "gpt-4o";
    const runs = internal.runs ?? 1;
    const criteria = buildCoverageCriteria(ctx);
    const req: CallJudgeRequest<z.infer<typeof coverageResponseSchema>> = {
      systemMessage: buildSystemMessage(ctx, criteria),
      userMessage: buildUserMessage(curriculum),
      responseSchema: coverageResponseSchema,
      schemaName: "CoverageResponse",
    };
    const judge = internal.__judge ?? callJudge;
    const doCall = () => judge(req, { model }).then((r) => r.parsed);
    const parsed =
      runs > 1
        ? await majorityVote<z.infer<typeof coverageResponseSchema>>(doCall, {
            n: runs,
            keyOf: (r) =>
              [...r.criteria]
                .sort((a, b) => a.criterion_id.localeCompare(b.criterion_id))
                .map((i) => `${i.criterion_id}:${i.verdict}`)
                .join("|"),
          })
        : await doCall();
    return aggregate(parsed, criteria, model, runs);
  },
};
