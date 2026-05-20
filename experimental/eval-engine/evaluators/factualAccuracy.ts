import { z } from "zod";
import type { Curriculum } from "@/lib/curriculum.types";
import { callJudge, type CallJudgeRequest, type CallJudgeOptions } from "@/experimental/eval-engine/judge/openaiJudge";
import { majorityVote } from "@/experimental/eval-engine/judge/majorityVote";
import type { KGContext } from "@/experimental/eval-engine/kg";
import type { Evaluator, EvaluatorOptions, EvaluatorResult, PerItemVerdict } from "./types";
import { enumerateSlots } from "./slots";

export const factualAccuracyResponseSchema = z.object({
  items: z.array(
    z.object({
      slot_kind: z.string(),
      slot_detail: z.string(),
      claim_text: z.string(),
      verdict: z.enum([
        "supported",
        "contradicted-expected",
        "contradicted-unexpected",
        "unsupported",
      ]),
      reasoning: z.string(),
      cited_kg_ids: z.array(z.string()),
      confidence: z.enum(["high", "medium", "low"]),
    }),
  ),
});

type FactualVerdict = z.infer<typeof factualAccuracyResponseSchema>["items"][number]["verdict"];

interface InternalOptions extends EvaluatorOptions {
  // Test seam: allows injecting a mocked judge. Not part of the public Evaluator interface.
  __judge?: (
    req: CallJudgeRequest<z.infer<typeof factualAccuracyResponseSchema>>,
    opts: CallJudgeOptions,
  ) => Promise<{ parsed: z.infer<typeof factualAccuracyResponseSchema>; raw: unknown }>;
}

const RUBRIC = {
  dimension: "Factual Accuracy",
  levels: [
    { level: 1 as const, label: "Failing", description: "Two or more unexpected contradictions of KG facts." },
    { level: 2 as const, label: "Concerns", description: "One unexpected contradiction OR fewer than 50% of claims supported." },
    { level: 3 as const, label: "Mostly accurate", description: "No unexpected contradictions; 50-80% of claims supported." },
    { level: 4 as const, label: "Accurate", description: "No unexpected contradictions; 80%+ supported; wrong-option contradictions match known misconceptions." },
  ] as [
    { level: 1; label: string; description: string },
    { level: 2; label: string; description: string },
    { level: 3; label: string; description: string },
    { level: 4; label: string; description: string },
  ],
};

function buildSystemMessage(ctx: KGContext): string {
  const facts = ctx.taughtFacts
    .map((f) => `- ${f.id}: ${f.statement} (cites: ${f.cites.join(", ") || "none"})`)
    .join("\n");
  const sources = ctx.sourceExcerpts
    .map((s) => `- ${s.id} (${s.citation}): ${s.text}`)
    .join("\n");
  const misconceptions = ctx.addressedMisconceptions
    .map((m) => `- ${m.id} "${m.name}": ${m.statement} (correction: ${m.correction})`)
    .join("\n");
  return [
    "You are evaluating factual claims in an electrical-engineering lesson about residential N-G bonding.",
    "",
    "Each excerpt is tagged with a slot role. Use the slot role to choose the right verdict:",
    "- For 'reading' bodies, 'mcqOption' fields where isCorrect=true, 'mcqOption' remediation fields, 'simulationCaption' captions, 'tutorGroundingFact' entries, and 'tutorOpeningPrompt': claims must be 'supported' by a KG AtomicFact; otherwise use 'unsupported' (no relevant KG fact) or 'contradicted-unexpected' (a KG fact contradicts the claim).",
    "- For 'mcqOption' fields where isCorrect=false: the option is *meant* to bait a misconception. If the claim contradicts a KG fact AND aligns with one of the addressed misconceptions, use 'contradicted-expected'. If it contradicts a KG fact without matching any listed misconception, use 'contradicted-unexpected'. If it does not contradict any KG fact, use 'supported' or 'unsupported' as appropriate.",
    "- 'mcq' prompts are questions, not factual claims; only judge them if they assert a fact.",
    "",
    "Knowledge Graph facts in scope:",
    facts || "(no facts in this learning goal)",
    "",
    "Cited source excerpts:",
    sources || "(none)",
    "",
    "Addressed misconceptions (for use with contradicted-expected on wrong MCQ options):",
    misconceptions || "(none)",
    "",
    "Extract every atomic factual claim from each excerpt. Use claim_text to record the exact claim you judged. Cite KG node ids (facts, sources, or misconceptions) you used in cited_kg_ids. Use a 'low' confidence label for unsupported claims that may be true but lie outside the KG's scope.",
  ].join("\n");
}

function buildUserMessage(slots: ReturnType<typeof enumerateSlots>): string {
  const blocks = slots.map((s) => {
    const detail = JSON.stringify(s.slot);
    return `--- slot_kind=${s.slot.kind} slot_detail=${detail} ---\n${s.excerpt}`;
  });
  return [
    "Evaluate each excerpt below. Return one items[] entry per claim you extract (multiple per excerpt is fine; zero is fine if the excerpt makes no factual assertion).",
    "",
    blocks.join("\n\n"),
  ].join("\n");
}

function aggregate(
  judged: z.infer<typeof factualAccuracyResponseSchema>,
  slots: ReturnType<typeof enumerateSlots>,
  model: string,
  runs: number,
): EvaluatorResult<FactualVerdict> {
  const slotByDetail = new Map(slots.map((s) => [JSON.stringify(s.slot), s]));
  const perItem: PerItemVerdict<FactualVerdict>[] = judged.items.map((it) => {
    const matched = slotByDetail.get(it.slot_detail);
    return {
      target: matched ?? { criterion: `${it.slot_kind}:${it.slot_detail}` },
      verdict: it.verdict,
      reasoning: it.reasoning,
      citedKGNodeIds: it.cited_kg_ids,
      confidence: it.confidence,
    };
  });

  const total = perItem.length;
  const supported = perItem.filter((p) => p.verdict === "supported").length;
  const unexpected = perItem.filter((p) => p.verdict === "contradicted-unexpected").length;
  const unsupported = perItem.filter((p) => p.verdict === "unsupported");

  // Exclude contradicted-expected items from ratio: they are intentional (wrong MCQ options
  // baiting known misconceptions) and should not penalise the supported ratio.
  const gradedItems = perItem.filter((p) => p.verdict !== "contradicted-expected");
  const gradedTotal = gradedItems.length;

  let rating: 1 | 2 | 3 | 4;
  if (unexpected >= 2) rating = 1;
  else if (unexpected === 1) rating = 2;
  else {
    const supportedRatio = gradedTotal === 0 ? 1 : supported / gradedTotal;
    if (supportedRatio < 0.5) rating = 2;
    else if (supportedRatio < 0.8) rating = 3;
    else rating = 4;
  }

  const expectedContradictions = total - gradedTotal;
  const reasoning = [
    `${total} claim(s) extracted.`,
    `${supported} supported.`,
    `${unexpected} unexpected contradiction(s).`,
    expectedContradictions > 0 ? `${expectedContradictions} expected contradiction(s) (intentional wrong MCQ options).` : "",
    `${unsupported.length} unsupported (need human review or KG extension).`,
  ].filter(Boolean).join(" ");

  return {
    evaluatorId: "factual-accuracy",
    dimension: RUBRIC.dimension,
    rating,
    reasoning,
    perItem,
    unsureItems: unsupported,
    runMetadata: { model, runs, timestampISO: new Date().toISOString() },
  };
}

export const factualAccuracyEvaluator: Evaluator<FactualVerdict> = {
  id: "factual-accuracy",
  dimension: RUBRIC.dimension,
  rubric: RUBRIC,
  async evaluate(curriculum: Curriculum, ctx: KGContext, opts?: EvaluatorOptions) {
    const internal = (opts ?? {}) as InternalOptions;
    const model = internal.model ?? "gpt-4o";
    const runs = internal.runs ?? 1;
    const slots = enumerateSlots(curriculum);
    const req: CallJudgeRequest<z.infer<typeof factualAccuracyResponseSchema>> = {
      systemMessage: buildSystemMessage(ctx),
      userMessage: buildUserMessage(slots),
      responseSchema: factualAccuracyResponseSchema,
      schemaName: "FactualAccuracyResponse",
    };
    const judge = internal.__judge ?? callJudge;
    const doCall = () => judge(req, { model }).then((r) => r.parsed);
    const parsed =
      runs > 1
        ? await majorityVote<z.infer<typeof factualAccuracyResponseSchema>>(doCall, {
            n: runs,
            keyOf: (r) => JSON.stringify(r),
          })
        : await doCall();
    return aggregate(parsed, slots, model, runs);
  },
};
