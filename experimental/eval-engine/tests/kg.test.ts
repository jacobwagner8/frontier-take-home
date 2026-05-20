import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadKG, loadKGFromDisk, type LoadedKG } from "@/experimental/eval-engine/kg";

describe("KG loader", () => {
  it("loads and validates a minimal in-memory KG", () => {
    const kg = loadKG({
      learningGoals: [
        {
          type: "LearningGoal",
          id: "lg.test",
          question: "Why?",
          summary: "Because.",
          prerequisites: [],
          teaches: ["fact.a"],
          addresses: ["misc.x"],
        },
      ],
      atomicFacts: [
        {
          type: "AtomicFact",
          id: "fact.a",
          statement: "A is true.",
          scope: "test",
          confidence: "high",
          cites: ["src.s1"],
        },
      ],
      misconceptions: [
        {
          type: "Misconception",
          id: "misc.x",
          name: "X",
          statement: "X is wrong.",
          correction: "Actually Y.",
          correctedBy: ["fact.a"],
        },
      ],
      sources: [
        {
          type: "SourceExcerpt",
          id: "src.s1",
          sourceType: "NEC",
          citation: "TEST 1.0",
          text: "verbatim source text",
        },
      ],
    });
    expect(kg.learningGoals.size).toBe(1);
    expect(kg.factsTaughtBy("lg.test").map((f) => f.id)).toEqual(["fact.a"]);
    expect(kg.misconceptionsAddressedBy("lg.test").map((m) => m.id)).toEqual(["misc.x"]);
    expect(kg.excerptsCitedBy("fact.a").map((s) => s.id)).toEqual(["src.s1"]);
  });

  it("rejects an unknown reference (orphan fact id)", () => {
    expect(() =>
      loadKG({
        learningGoals: [
          {
            type: "LearningGoal",
            id: "lg.test",
            question: "Why?",
            summary: "Because.",
            prerequisites: [],
            teaches: ["fact.missing"],
            addresses: [],
          },
        ],
        atomicFacts: [],
        misconceptions: [],
        sources: [],
      }),
    ).toThrow(/fact.missing/);
  });

  it("rejects a node with a bad schema (missing required field)", () => {
    expect(() =>
      loadKG({
        learningGoals: [],
        atomicFacts: [
          // @ts-expect-error intentionally missing `statement`
          {
            type: "AtomicFact",
            id: "fact.bad",
            scope: "test",
            confidence: "high",
            cites: [],
          },
        ],
        misconceptions: [],
        sources: [],
      }),
    ).toThrow(/statement/);
  });

  it("includes the filename in error messages when loading from disk", () => {
    const tmpRoot = mkdtempSync(path.join(tmpdir(), "kg-test-"));
    const lgDir = path.join(tmpRoot, "learning-goals");
    mkdirSync(lgDir);
    // Write a bad JSON file missing required fields
    writeFileSync(
      path.join(lgDir, "bad-goal.json"),
      JSON.stringify({ type: "LearningGoal", id: "lg.bad" /* missing question, summary, etc. */ }),
    );
    expect(() => loadKGFromDisk(tmpRoot)).toThrow(/learning-goals[/\\]bad-goal\.json/);
  });

  it("resolveContext returns the full subgraph for a learning goal", () => {
    const kg = loadKG({
      learningGoals: [
        {
          type: "LearningGoal",
          id: "lg.test",
          question: "Why?",
          summary: "Because.",
          prerequisites: [],
          teaches: ["fact.a"],
          addresses: ["misc.x"],
        },
      ],
      atomicFacts: [
        {
          type: "AtomicFact",
          id: "fact.a",
          statement: "A is true.",
          scope: "test",
          confidence: "high",
          cites: ["src.s1"],
        },
      ],
      misconceptions: [
        {
          type: "Misconception",
          id: "misc.x",
          name: "X",
          statement: "X is wrong.",
          correction: "Actually Y.",
          correctedBy: ["fact.a"],
        },
      ],
      sources: [
        {
          type: "SourceExcerpt",
          id: "src.s1",
          sourceType: "NEC",
          citation: "TEST 1.0",
          text: "verbatim",
        },
      ],
    });
    const ctx = kg.resolveContext("lg.test");
    expect(ctx.learningGoal.id).toBe("lg.test");
    expect(ctx.taughtFacts.map((f) => f.id)).toEqual(["fact.a"]);
    expect(ctx.addressedMisconceptions.map((m) => m.id)).toEqual(["misc.x"]);
    expect(ctx.sourceExcerpts.map((s) => s.id)).toEqual(["src.s1"]);
  });
});
