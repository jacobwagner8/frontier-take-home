import { describe, it, expect } from "vitest";
import { curriculum as good, expectedOverallPass as goodPass } from "@/experimental/eval-engine/fixtures/good-bonding-lesson";
import { curriculum as bad, expectedOverallPass as badPass } from "@/experimental/eval-engine/fixtures/bad-factual-bonding-lesson";
import { curriculum as offTopic, expectedOverallPass as offTopicPass } from "@/experimental/eval-engine/fixtures/off-topic-bonding-lesson";
import { curriculum as unsupported, expectedOverallPass as unsupportedPass } from "@/experimental/eval-engine/fixtures/unsupported-claim-lesson";
import { curriculum as bait, expectedOverallPass as baitPass } from "@/experimental/eval-engine/fixtures/bait-option-fixture";

describe("fixture exports", () => {
  it.each([
    ["good", good, goodPass, true],
    ["bad-factual", bad, badPass, false],
    ["off-topic", offTopic, offTopicPass, false],
    ["unsupported-claim", unsupported, unsupportedPass, true],
    ["bait-option", bait, baitPass, true],
  ])("%s exports a Curriculum and expected pass=%s", (_name, c, actualPass, expectedPass) => {
    expect(c.reading1.body.length).toBeGreaterThan(0);
    expect(c.mcq1.options.length).toBeGreaterThan(0);
    expect(actualPass).toBe(expectedPass);
  });
});
