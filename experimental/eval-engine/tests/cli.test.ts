import { describe, it, expect } from "vitest";
import { parseArgs } from "@/experimental/eval-engine/cli/args";

describe("parseArgs", () => {
  it("parses fixture + goal", () => {
    const a = parseArgs(["--fixture", "good-bonding-lesson", "--goal", "lg.x"]);
    expect(a).toEqual({
      source: { kind: "fixture", name: "good-bonding-lesson" },
      goal: "lg.x",
      runs: 1,
      model: "gpt-4o",
      json: undefined,
    });
  });
  it("parses --curriculum (path) + goal", () => {
    const a = parseArgs(["--curriculum", "./path/to/lesson.ts", "--goal", "lg.x"]);
    expect(a.source).toEqual({ kind: "curriculum", path: "./path/to/lesson.ts" });
    expect(a.goal).toBe("lg.x");
  });
  it("accepts --runs and --model and --json", () => {
    const a = parseArgs(["--fixture", "f", "--goal", "g", "--runs", "3", "--model", "gpt-4o-mini", "--json", "out.json"]);
    expect(a).toEqual({
      source: { kind: "fixture", name: "f" },
      goal: "g",
      runs: 3,
      model: "gpt-4o-mini",
      json: "out.json",
    });
  });
  it("rejects missing required args", () => {
    expect(() => parseArgs(["--fixture", "f"])).toThrow(/--goal/);
    expect(() => parseArgs(["--goal", "g"])).toThrow(/--fixture|--curriculum/);
  });
  it("rejects --fixture and --curriculum together", () => {
    expect(() =>
      parseArgs(["--fixture", "f", "--curriculum", "p", "--goal", "g"]),
    ).toThrow(/both --fixture and --curriculum/);
  });
  it("rejects unknown flags", () => {
    expect(() => parseArgs(["--fixture", "f", "--goal", "g", "--bogus"])).toThrow(/--bogus/);
  });
});
