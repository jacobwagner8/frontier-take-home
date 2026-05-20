import type { EvaluationReport } from "@/experimental/eval-engine/orchestrator/runEvaluation";
import type { EvaluatorResult, PerItemVerdict, SlotInstance } from "@/experimental/eval-engine/evaluators/types";

function describeTarget(t: PerItemVerdict<string>["target"]): string {
  if ("criterion" in t) return t.criterion;
  const s = (t as SlotInstance).slot;
  switch (s.kind) {
    case "reading":
      return `reading.${s.field}`;
    case "mcq":
      return `${s.mcqId}.${s.field}`;
    case "mcqOption":
      return `${s.mcqId}.${s.optionId}.${s.field} (isCorrect=${s.isCorrect})`;
    case "tutorGroundingFact":
      return `tutor.groundingFacts[${s.index}]`;
    case "tutorOpeningPrompt":
      return "tutor.openingPrompt";
    case "simulationCaption":
      return `simulationCaption.${s.key}`;
  }
}

function renderItem(p: PerItemVerdict<string>): string {
  const t = describeTarget(p.target);
  const cited = p.citedKGNodeIds.length ? ` (cited: ${p.citedKGNodeIds.join(", ")})` : "";
  const excerpt = "slot" in p.target ? (p.target as SlotInstance).excerpt : "";
  const excerptLine = excerpt ? `\n  - Excerpt: "${excerpt}"` : "";
  return `- **${t}** — verdict: \`${p.verdict}\`${cited}${excerptLine}\n  - ${p.reasoning}`;
}

function renderEvaluator(r: EvaluatorResult<string>): string {
  const contradictions = r.perItem.filter((p) => p.verdict === "contradicted-unexpected");
  const unsupported = r.unsureItems;

  const sections: string[] = [];
  sections.push(`## ${r.dimension} — Rating: ${r.rating} / ${ratingLabel(r.rating)}`);
  sections.push(`> ${r.reasoning}`);

  if (contradictions.length) {
    sections.push("### Contradictions (must fix)");
    sections.push(contradictions.map(renderItem).join("\n"));
  }
  if (unsupported.length) {
    sections.push("### Unsupported claims (decision-support — your call)");
    sections.push(unsupported.map(renderItem).join("\n"));
    sections.push("> Action for each: extend the KG with a cited AtomicFact, or remove the claim from the lesson.");
  }

  const others = r.perItem.filter((p) => p.verdict !== "contradicted-unexpected" && !unsupported.includes(p));
  if (others.length) {
    sections.push("### Other items");
    sections.push(others.map(renderItem).join("\n"));
  }

  return sections.join("\n\n");
}

function ratingLabel(rating: number): string {
  switch (rating) {
    case 1: return "Failing/Off-target";
    case 2: return "Concerns/Gaps";
    case 3: return "Mostly accurate/Adequate";
    case 4: return "Accurate/Full coverage";
    default: return "?";
  }
}

export function renderMarkdownReport(report: EvaluationReport): string {
  const header = [
    "# Evaluation Report",
    "",
    `**Learning Goal:** ${report.learningGoalId}`,
    `**Curriculum:** "${report.curriculumSummary.readingTitle}" (MCQs: ${report.curriculumSummary.mcqIds.join(", ")})`,
    `**Overall: ${report.overallVerdict.pass ? "PASS" : "FAIL"}** (min rating: ${report.overallVerdict.minRating}; ${report.overallVerdict.needsHumanReview} item(s) need human review)`,
    `**Generated:** ${report.generatedAt}`,
    "",
    `> ${report.overallVerdict.summary}`,
  ].join("\n");

  const body = report.evaluatorResults.map(renderEvaluator).join("\n\n---\n\n");

  return `${header}\n\n${body}\n`;
}
