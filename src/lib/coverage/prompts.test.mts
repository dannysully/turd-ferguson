import assert from "node:assert/strict";
import { test } from "node:test";

import {
  COVERAGE_PROMPT_COUNT,
  PLACEHOLDER,
  coveragePrompts,
  type CampaignInput,
} from "./prompts.ts";

/**
 * The benchmark's promise is that the same five questions can be asked again
 * after the campaign and the two readings compared. Everything below is that
 * promise, written as a check rather than as a comment claiming it.
 */

const input: CampaignInput = {
  brand: "Vibe Retail",
  topic: "same-day settlement",
  segment: "independent retailers",
};

test("the same input gives the same five questions, in the same order", () => {
  const a = coveragePrompts(input);
  const b = coveragePrompts({ ...input });
  assert.deepEqual(a, b);
  assert.equal(a.length, 5);
});

test("a re-run months later compares like with like, so the strings are pinned", () => {
  // Pinned deliberately. If a later change reworded a question, a benchmark
  // re-run would read as a change in the ANSWER when it was a change in the
  // question - which is the one failure this feature cannot survive and the
  // one that would never show up as an error. Changing these is a decision
  // about every stored reading, so it has to break a test first.
  assert.deepEqual(
    coveragePrompts(input).map((p) => p.question),
    [
      "what does Vibe Retail do",
      "does Vibe Retail offer same-day settlement",
      "who offers same-day settlement for independent retailers",
      "Vibe Retail vs alternatives for same-day settlement",
      "what has Vibe Retail announced recently",
    ],
  );
});

test("the five kinds are the five axes, each used once", () => {
  const kinds = coveragePrompts(input).map((p) => p.kind);
  assert.deepEqual(kinds, ["Identity", "Capability", "Category", "Comparison", "News"]);
  assert.equal(new Set(kinds).size, kinds.length);
});

test("exactly one question is marked weak, and it is the recency one", () => {
  const weak = coveragePrompts(input).filter((p) => p.weak);
  assert.equal(weak.length, 1);
  assert.equal(weak[0].kind, "News");
});

test("a missing segment falls back to the placeholder rather than a hole", () => {
  const [, , category] = coveragePrompts({ brand: "Vibe Retail", topic: "same-day settlement" });
  assert.equal(category.question, "who offers same-day settlement for [segment]");
  assert.ok(!category.question.includes("  "));
});

test("an empty field is legible rather than malformed", () => {
  // The route validates before it gets here. This is the belt: "what does  do"
  // with a hole in it would be stored, asked, and compared against for ever.
  const prompts = coveragePrompts({ brand: "   ", topic: "" });
  assert.equal(prompts[0].question, `what does ${PLACEHOLDER.brand} do`);
  assert.equal(prompts[1].question, `does ${PLACEHOLDER.brand} offer ${PLACEHOLDER.topic}`);
  for (const p of prompts) assert.ok(!/\s\s/.test(p.question), p.question);
});

test("a campaign line pasted out of a brief brings its newline and is tidied", () => {
  // The same words with a newline in them are a different string, and the
  // re-run compares against what was stored. So this is not cosmetic.
  const pasted = coveragePrompts({ brand: "Vibe\n  Retail", topic: " same-day\tsettlement " });
  assert.equal(pasted[0].question, "what does Vibe Retail do");
  assert.equal(pasted[1].question, "does Vibe Retail offer same-day settlement");
});

test("the count is read off the template rather than typed beside it", () => {
  assert.equal(COVERAGE_PROMPT_COUNT, coveragePrompts(input).length);
});

test("the placeholders stay square-bracketed, so an example never reads as a measurement", () => {
  const shown = coveragePrompts(PLACEHOLDER);
  for (const p of shown) {
    if (p.question.includes("Client brand") || p.question.includes("thing you announced")) {
      assert.ok(/\[[^\]]+\]/.test(p.question), p.question);
    }
  }
  assert.equal(shown[0].question, "what does [Client brand] do");
});
