import assert from "node:assert/strict";
import { test } from "node:test";

import { blockText, inline, parseAnswer } from "./answer-markdown.ts";

/**
 * The answers sidebar printed engine markdown as source (rotaready.com scan,
 * 24 September 2026). These cases are the shapes that scan's 17 answers used:
 * pipe tables with and without outer pipes, bold, bullets, numbered lists,
 * [n] markers. No headings or links appeared, but both are cheap to cover.
 */

test("a pipe table without outer pipes becomes a table", () => {
  const b = parseAnswer(
    "Shortlist:\n\nSoftware | Suited to | Watch-outs\n--- | --- | ---\nRotaready | Restaurants, pubs | Quote-based\nDeputy | Small venues | Higher plans\n\nAfter.",
  );
  assert.deepEqual(b.map((x) => x.kind), ["p", "table", "p"]);
  const t = b[1];
  assert.ok(t.kind === "table");
  assert.equal(t.head.length, 3);
  assert.equal(t.rows.length, 2);
  assert.equal(t.rows[0][0][0].text, "Rotaready");
});

test("a table with outer pipes and bold cells", () => {
  const b = parseAnswer("| Provider | Strength |\n|---|---|\n| **Factorial** | HR platform[3][5] |");
  const t = b[0];
  assert.ok(t.kind === "table");
  assert.deepEqual(t.rows[0][0], [{ text: "Factorial", bold: true }]);
  assert.deepEqual(t.rows[0][1], [{ text: "HR platform" }, { text: "3", cite: true }, { text: "5", cite: true }]);
});

test("no asterisk or separator row reaches the screen", () => {
  const src = "Here are **10 notable providers**[1][2].\n\n- **Deputy** - shifts\n- Planday\n\n1. First\n2. Second\n\n| a | b |\n|---|---|\n| c | d |";
  const shown = blockText(parseAnswer(src));
  assert.equal(shown.includes("**"), false);
  assert.equal(/-{3}/.test(shown), false);
  assert.equal(shown.includes("|"), false);
});

test("lists", () => {
  const b = parseAnswer("- one\n- two\n* three\n\n1. a\n2) b");
  assert.deepEqual(b.map((x) => x.kind), ["ul", "ol"]);
  assert.ok(b[0].kind === "ul" && b[0].items.length === 3);
});

test("no word is dropped", () => {
  const src = "Rotaready and Fourth are more hospitality-specialised, while Deputy is broader.";
  assert.equal(blockText(parseAnswer(src)), src);
});

test("markup in an answer stays text", () => {
  // The renderer builds React elements from strings, so this only has to
  // survive as characters - it must not be dropped or reinterpreted here.
  const b = parseAnswer("<script>alert(1)</script> and **bold**");
  assert.equal(blockText(b), "<script>alert(1)</script> and bold");
  assert.deepEqual(inline("a *single* star"), [{ text: "a *single* star" }]);
});

test("a lone pipe in prose is not a table", () => {
  const b = parseAnswer("Pricing | is quote-based\nfor larger groups.");
  assert.deepEqual(b.map((x) => x.kind), ["p"]);
});
