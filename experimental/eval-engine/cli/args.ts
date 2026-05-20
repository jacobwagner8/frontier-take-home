export type CurriculumSource =
  | { kind: "fixture"; name: string }
  | { kind: "curriculum"; path: string };

export interface ParsedArgs {
  source: CurriculumSource;
  goal: string;
  runs: number;
  model: string;
  json?: string;
}

const KNOWN = new Set(["--fixture", "--curriculum", "--goal", "--runs", "--model", "--json"]);

export function parseArgs(argv: string[]): ParsedArgs {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (!flag.startsWith("--")) throw new Error(`Unexpected positional argument: ${flag}`);
    if (!KNOWN.has(flag)) throw new Error(`Unknown flag: ${flag}. Known flags: ${[...KNOWN].join(", ")}`);
    const value = argv[++i];
    if (value === undefined) throw new Error(`Flag ${flag} requires a value`);
    map.set(flag, value);
  }
  const fixture = map.get("--fixture");
  const curriculum = map.get("--curriculum");
  const goal = map.get("--goal");
  if (fixture && curriculum) {
    throw new Error("Cannot pass both --fixture and --curriculum; choose one");
  }
  if (!fixture && !curriculum) {
    throw new Error("Missing required flag: pass either --fixture <name> or --curriculum <path>");
  }
  if (!goal) throw new Error("Missing required flag: --goal");
  const source: CurriculumSource = fixture
    ? { kind: "fixture", name: fixture }
    : { kind: "curriculum", path: curriculum! };
  return {
    source,
    goal,
    runs: map.has("--runs") ? Number(map.get("--runs")) : 1,
    model: map.get("--model") ?? "gpt-4o",
    json: map.get("--json"),
  };
}
