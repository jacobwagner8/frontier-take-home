import { writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "./args";
import { runEvaluation } from "@/experimental/eval-engine/orchestrator/runEvaluation";
import { renderMarkdownReport } from "@/experimental/eval-engine/reports/markdown";

async function main(): Promise<number> {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error parsing arguments: ${(err as Error).message}`);
    console.error("");
    console.error("Usage: npx tsx experimental/eval-engine/cli/eval.ts --fixture <name> --goal <id> [--runs N] [--model M] [--json out.json]");
    return 2;
  }

  let curriculum;
  try {
    const modPath =
      args.source.kind === "fixture"
        ? path.resolve(__dirname, "../fixtures", `${args.source.name}.ts`)
        : path.resolve(process.cwd(), args.source.path);
    const mod = await import(modPath);
    curriculum = mod.curriculum;
    if (!curriculum) {
      const label = args.source.kind === "fixture" ? `Fixture ${args.source.name}` : `Module ${args.source.path}`;
      console.error(`${label} did not export a 'curriculum' object`);
      return 2;
    }
  } catch (err) {
    const label = args.source.kind === "fixture" ? `fixture '${args.source.name}'` : `curriculum '${args.source.path}'`;
    console.error(`Failed to load ${label}: ${(err as Error).message}`);
    return 2;
  }

  let report;
  try {
    report = await runEvaluation(curriculum, args.goal, { model: args.model, runs: args.runs });
  } catch (err) {
    console.error(`Eval engine error: ${(err as Error).message}`);
    return 2;
  }

  console.log(renderMarkdownReport(report));

  if (args.json) {
    writeFileSync(args.json, JSON.stringify(report, null, 2));
  }

  return report.overallVerdict.pass ? 0 : 1;
}

main().then((code) => process.exit(code));
