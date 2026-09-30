import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { clusterCards, clusterChart, clusterSearch, clusterSummary, filterClusters } from "./cluster-figures.ts";
import { comparisonRange } from "./figures.ts";
import { expandFixture } from "./fixture-mode.ts";

/**
 * T4b part 1 (30 Sep 2026): the overview's cluster figures, checked against
 * what boards-3/dataset.py prints for the same made-up Tallyroo (`python3
 * dataset.py`). The fixture copies the board's current-period readings and
 * Google positions exactly, so this period's rates, prompts named and
 * positions must match the board; the previous period was re-drawn from each
 * prompt's rate by make-fixture.py, so only the presence of a change is held.
 */

const fx = expandFixture(JSON.parse(readFileSync(new URL("./fixture.json", import.meta.url), "utf8")));
const range = { from: "2026-09-02", to: fx.today };
const cards = clusterCards({
  ...fx.data,
  range,
  before: comparisonRange(range, "prev"),
  today: fx.today,
  engines: ["google_aio", "chatgpt", "gemini", "perplexity"],
});
const by = (id: string) => cards.find((c) => c.id === id)!;

// dataset.py, 30 Sep 2026: id -> [rate, prompts named, position, places gained, per-prompt rates]
const BOARD: Record<string, [number, number, number | null, number | null, number[]]> = {
  c1: [42, 5, 4, 3, [34, 56, 41, 47, 29]],
  c2: [32, 5, 7, 4, [23, 43, 29, 41, 24]],
  c3: [33, 5, 11, 1, [39, 44, 22, 40, 18]],
  c4: [16, 4, 12, 3, [18, 24, 0, 20, 19]],
  c5: [37, 5, 3, 0, [34, 45, 44, 38, 24]],
  c6: [24, 5, 8, 3, [36, 18, 29, 21, 17]],
  c7: [34, 5, 5, 2, [39, 29, 27, 39, 35]],
  c8: [8, 3, 14, -1,[10, 12, 0, 17, 0]],
  // #23 on the board; the fixture keeps positions past #20 as unranked.
  c9: [4, 3, null, null, [5, 0, 11, 5, 0]],
};

test("every cluster card's rate, prompts named, position and prompt rates match the board", () => {
  assert.equal(cards.length, 10);
  for (const [id, [pct, named, pos, gained, prompts]] of Object.entries(BOARD)) {
    const c = by(id);
    assert.equal(c.now.pct, pct, `${id} rate`);
    assert.equal(c.promptsNamed.num, named, `${id} prompts named`);
    assert.equal(c.promptsNamed.den, 5);
    assert.equal(c.position, pos, `${id} position`);
    assert.equal(c.positionChange, gained, `${id} places gained`);
    assert.deepEqual(c.prompts.map((p) => p.now.pct), prompts, `${id} prompt rates`);
  }
});

test("status: tracked throughout is live, begun mid-range is added, first check after today is pending", () => {
  assert.deepEqual(cards.map((c) => c.status), ["live", "live", "live", "live", "live", "live", "live", "live", "added", "pending"]);
  for (const c of cards.filter((c) => c.status === "live")) assert.notEqual(c.delta, null, `${c.id} has a like-for-like change`);
  assert.equal(by("c9").delta, null, "a cluster added mid-range has no change");
  assert.equal(by("c9").positionChange, null);
});

test("a pending cluster has no readings: no rate, no heat, no engine marks", () => {
  const c = by("c10");
  assert.equal(c.now.pct, null);
  assert.ok(c.heat.every((h) => h === null));
  assert.ok(c.prompts.every((p) => p.namedBy.length === 0 && p.now.den === 0));
  assert.equal(c.keyword, "payroll and accounting software");
  assert.equal(c.volume, 1600);
  assert.equal(c.intent, "transactional");
});

test("heat: one cell a day, each of a live cluster's 20 answers; outlined (null) before an added cluster's first check", () => {
  const c1 = by("c1");
  assert.equal(c1.heat.length, 28);
  assert.ok(c1.heat.every((h) => h !== null && h.den === 20));
  const c9 = by("c9").heat;
  assert.ok(c9.slice(0, 14).every((h) => h === null), "before 16 Sep");
  assert.ok(c9.slice(14).every((h) => h !== null && h.den === 20));
});

test("engine marks: a prompt that never named the client has none; one prompt's marks are the engines that named it", () => {
  const c4 = by("c4");
  assert.deepEqual(c4.prompts[2]!.namedBy, [], "c4's sector prompt never names Tallyroo");
  for (const p of c4.prompts.filter((p) => p.now.num > 0)) assert.ok(p.namedBy.length > 0);
  assert.deepEqual(c4.prompts.map((p) => p.angle), ["category", "positioning", "sector", "outcome", "comparison"]);
});

// dataset.py, 30 Sep 2026: each prompt's days named per engine (AIO, ChatGPT, Gemini, Perplexity) and days checked - T6's row counts.
const BOARD_DAYS: Record<string, [number[][], number]> = {
  c1: [[[8, 9, 10, 11], [13, 18, 14, 18], [13, 8, 11, 14], [15, 18, 10, 10], [9, 10, 5, 9]], 28],
  c4: [[[3, 10, 2, 5], [5, 6, 7, 9], [0, 0, 0, 0], [4, 6, 5, 7], [6, 9, 2, 4]], 28],
  c8: [[[3, 1, 3, 4], [3, 3, 1, 6], [0, 0, 0, 0], [4, 7, 4, 4], [0, 0, 0, 0]], 28],
  c9: [[[2, 0, 0, 1], [0, 0, 0, 0], [0, 2, 1, 3], [1, 1, 1, 0], [0, 0, 0, 0]], 14],
  c10: [[[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 0],
};

test("T6 day counts: per engine, the days it named the client for a prompt, of the days checked, match the board", () => {
  for (const [id, [days, checked]] of Object.entries(BOARD_DAYS)) {
    const c = by(id);
    assert.deepEqual(c.prompts.map((p) => p.daysNamed.map((d) => d.days)), days, `${id} days named`);
    assert.ok(c.prompts.every((p) => p.daysChecked === checked), `${id} days checked`);
    assert.deepEqual(c.prompts[0]!.daysNamed.map((d) => d.engine), ["google_aio", "chatgpt", "gemini", "perplexity"]);
  }
});

test("no comparison: no change anywhere, and a cluster begun before the range is still live", () => {
  const none = clusterCards({ ...fx.data, range, before: null, today: fx.today, engines: ["google_aio"] });
  assert.ok(none.every((c) => c.delta === null && c.positionChange === null));
  assert.equal(none.find((c) => c.id === "c1")!.status, "live");
});

test("the headline and four figures by cluster match dataset.py's summary (T4b part 2)", () => {
  const s = clusterSummary(cards);
  assert.deepEqual([s.now.num, s.now.den, s.now.pct], [1272, 4760, 27], "1,272 of 4,760 answers, 27%");
  assert.deepEqual([s.lfl.den, s.lfl.pct], [4480, 28], "like-for-like on the 8 clusters tracked all period");
  assert.equal(s.lflBefore?.den, 4480);
  assert.ok(s.lflDelta !== null);
  assert.deepEqual([s.clusters, s.clustersLfl, s.prompts, s.promptsLfl], [9, 8, 45, 40]);
  assert.deepEqual([s.promptsNamed.num, s.promptsNamed.den], [40, 45]);
  assert.equal(s.promptsNamedBefore?.den, 40);
  assert.deepEqual(s.never, [
    { cluster: "bookkeeping software", text: "What bookkeeping software do US restaurants use?" },
    { cluster: "cloud accounting software", text: "What accounting software with built-in payroll do cloud-first startups use?" },
    { cluster: "cloud accounting software", text: "What's the cheapest accounting software that's still good?" },
    { cluster: "accounting software for nonprofits", text: "What accounting software do nonprofits recommend?" },
    { cluster: "accounting software for nonprofits", text: "Which is better for a nonprofit, Ledgerline or Brightbook?" },
  ]);
  assert.deepEqual([s.page1.num, s.page1.den, s.page1Before], [5, 9, 3], "5 of 9 on page 1, was 3");
  // The board averages 9.7 with c9 at #23; the fixture keeps #23 unranked, so the eight ranked average 8.
  assert.equal(s.page1.avg, 8);
  assert.deepEqual(s.offPage1, ["invoicing software", "bookkeeping software", "cloud accounting software"]);
});

test("the cluster chart counts what the card and heat row count (T4b part 5a)", () => {
  const input = { ...fx.data, range, before: comparisonRange(range, "prev"), today: fx.today, engines: ["google_aio", "chatgpt", "gemini", "perplexity"] };
  const first = clusterChart(input, "c1")!;
  const card1 = cards.find((c) => c.id === "c1")!;
  assert.equal(first.days.length, 28);
  assert.deepEqual(first.named, card1.heat, "top panel and heat row agree day for day");
  assert.equal(first.named.reduce((s, r) => s + (r?.num ?? 0), 0), card1.now.num);
  assert.equal([...first.google].reverse().find((p) => p !== null), card1.position, "last Google reading is the card's position");
  assert.equal(first.namedBefore?.length, 28, "a live cluster has a previous period");
  const added = clusterChart(input, "c9")!;
  assert.equal(added.namedBefore, null, "a cluster added mid-range has no previous period");
  assert.equal(added.named[0], null, "before its first check a day is a gap, not a zero");
  const pending = clusterChart(input, "c10")!;
  assert.ok(pending.named.every((r) => r === null), "a pending cluster has no readings");
  assert.equal(clusterChart(input, "nope"), null);
});

test("summary with no comparison has no like-for-like change or 'was' figures", () => {
  const s = clusterSummary(clusterCards({ ...fx.data, range, before: null, today: fx.today, engines: ["google_aio"] }));
  assert.equal(s.lflBefore, null);
  assert.equal(s.lflDelta, null);
  assert.equal(s.promptsNamedBefore, null);
  assert.equal(s.page1Before, null);
});

test("T6 filters: all 10, naming you 9 and with prompts that never name you 3, as the board counts; search matches keyword or prompt", () => {
  assert.equal(filterClusters(cards, "all", "").length, 10);
  assert.equal(filterClusters(cards, "named", "").length, 9, "every checked cluster names Tallyroo somewhere");
  assert.deepEqual(filterClusters(cards, "never", "").map((c) => c.id), ["c4", "c8", "c9"]);
  assert.deepEqual(filterClusters(cards, "all", "  PAYROLL ").map((c) => c.id), ["c8", "c10"], "c10's keyword and a c8 prompt about payroll");
  assert.ok(filterClusters(cards, "all", "ledgerline").length > 1, "a prompt naming a rival matches, not only the keyword");
  assert.ok(!filterClusters(cards, "named", "payroll").some((c) => c.id === "c10"), "a pending cluster is in all only");
  assert.ok(!filterClusters(cards, "never", "").some((c) => c.status === "pending"));
});

test("T6 search: ?q= is cut to APP_LIMITS.search (120) before it is used", () => {
  assert.equal(clusterSearch(null), "");
  assert.equal(clusterSearch("x".repeat(500)).length, 120);
});
