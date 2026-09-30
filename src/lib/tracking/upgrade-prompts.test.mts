import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { TIER_PLAIN } from "../tier-text.ts";
import {
  type Facts,
  MENTIONED_PLACEMENTS,
  firstPromptDay,
  hiddenCtas,
  hiddenSince,
  pickPrompt,
  promptCopy,
  triggered,
} from "./upgrade-prompts.ts";

/** Every trigger over its threshold, on a tracked client well past its first 14 days. */
const all = (over: Partial<Facts> = {}): Facts => ({
  tier: "tracked",
  mode: "nomada",
  state: "ok",
  startedOn: "2026-08-01",
  today: "2026-09-30",
  hidden: new Set(),
  neverNamed: { prompts: 5, of: 45, answers: 448, hosts: ["thesmallbizstack.com", "softwarecritic.com", "ledgerline.com"] },
  offPageOne: { keywords: 3, of: 9, best: 11, worst: 14 },
  trade: { brand: "Ledgerline", share: 28, theirs: 41, ours: 3, subject: "Tallyroo" },
  atLimit: true,
  outsideCluster: true,
  ...over,
});

test("one prompt per screen, the highest tier gap winning", () => {
  assert.equal(pickPrompt(all()), "everywhere");
  assert.equal(pickPrompt(all({ trade: undefined })), "cited");
  assert.equal(pickPrompt(all({ trade: undefined, offPageOne: undefined })), "mentioned");
  assert.equal(pickPrompt(all({ trade: undefined, offPageOne: undefined, neverNamed: undefined })), "pack");
  // A tie at no gap: the pack over a second cluster.
  assert.equal(pickPrompt(all({ tier: "cited", trade: undefined })), "pack");
  assert.equal(pickPrompt(all({ tier: "cited", trade: undefined, atLimit: false })), "cluster");
});

test("the brief's thresholds", () => {
  assert.deepEqual(triggered(all({ neverNamed: { prompts: 2, of: 45, answers: 448, hosts: [] }, offPageOne: { keywords: 1, of: 9, best: 11, worst: 11 }, trade: undefined, atLimit: false, outsideCluster: false })), []);
  assert.deepEqual(triggered(all({ offPageOne: undefined, trade: undefined, atLimit: false, outsideCluster: false })), ["mentioned"]);
  // 5x and at least 10: 9 against 0 is not enough, 14 against 3 is not 5x, 15 against 3 is.
  const t = (theirs: number, ours: number) => triggered(all({ neverNamed: undefined, offPageOne: undefined, atLimit: false, trade: { brand: "B", share: 1, theirs, ours, subject: "S" } }));
  assert.deepEqual(t(9, 0), []);
  assert.deepEqual(t(14, 3), []);
  assert.deepEqual(t(15, 3), ["everywhere"]);
  // A second cluster is for mentioned and cited only.
  assert.ok(!triggered(all()).includes("cluster"));
  assert.ok(triggered(all({ tier: "mentioned" })).includes("cluster"));
  assert.ok(!triggered(all({ tier: "everywhere" })).includes("cluster"));
});

test("never in the first 14 days", () => {
  assert.equal(firstPromptDay("2026-09-16"), "2026-09-30");
  assert.equal(pickPrompt(all({ startedOn: "2026-09-17" })), null);
  assert.equal(pickPrompt(all({ startedOn: "2026-09-16" })), "everywhere");
});

test("never on an empty, error or partial state", () => {
  for (const state of ["empty", "error", "partial"] as const) assert.equal(pickPrompt(all({ state })), null);
});

test("never for a tier already held", () => {
  assert.ok(!triggered(all({ tier: "mentioned" })).includes("mentioned"));
  assert.ok(!triggered(all({ tier: "cited" })).some((c) => c === "mentioned" || c === "cited"));
  assert.deepEqual(triggered(all({ tier: "everywhere", atLimit: false })), []);
  assert.equal(pickPrompt(all({ tier: "everywhere", atLimit: false })), null);
});

test("off shows none; agency writes no tier name and no tier-page button", () => {
  assert.equal(pickPrompt(all({ mode: "off" })), null);
  const f = all({ mode: "agency" });
  assert.equal(pickPrompt(f), "everywhere");
  for (const cta of ["mentioned", "cited", "everywhere"] as const) {
    const c = promptCopy(cta, f)!;
    assert.equal(c.tier, null);
    assert.equal(c.button, false);
    const words = [c.title, c.lead, c.tail, c.why, c.ask].join(" ");
    for (const name of Object.values(TIER_PLAIN)) assert.ok(!words.includes(name), `${cta} names ${name} in agency mode`);
    assert.ok(!/nomada/i.test(words), `${cta} names nomada in agency mode`);
  }
});

test("hidden stays hidden for 30 days for that member", () => {
  assert.equal(hiddenSince("2026-09-30"), "2026-08-31T00:00:00Z");
  const rows = [
    { cta: "everywhere", action: "hidden", created_at: "2026-08-31T09:00:00Z" },
    { cta: "cited", action: "hidden", created_at: "2026-08-30T23:59:59Z" },
    { cta: "mentioned", action: "shown", created_at: "2026-09-29T09:00:00Z" },
    { cta: "nonsense", action: "hidden", created_at: "2026-09-29T09:00:00Z" },
  ];
  const hidden = hiddenCtas(rows, "2026-09-30");
  assert.deepEqual([...hidden], ["everywhere"]);
  assert.equal(pickPrompt(all({ hidden })), "cited");
});

test("the board's words on its three prompts", () => {
  const f = all();
  const m = promptCopy("mentioned", f)!;
  assert.equal(m.title, "5 prompts never name you");
  assert.equal(`${m.lead}${TIER_PLAIN[m.tier!]}${m.tail}`, `Engines answer them from pages like thesmallbizstack.com and softwarecritic.com. Getting placed on the pages they cite is what alwaysmentioned does, ${MENTIONED_PLACEMENTS} per cluster.`);
  assert.equal(m.why, "Shown because 5 of your 45 prompts named you in none of their 448 answers this period.");
  assert.equal(m.ask, "Ask about these 5");
  const c = promptCopy("cited", f)!;
  assert.equal(c.title, "3 keywords sit just off page 1");
  assert.equal(`${c.lead}${TIER_PLAIN[c.tier!]}${c.tail}`, "Positions 11 to 14. Link insertions on pages that already rank for them, plus on-site work on your own pages, is what alwayscited adds to placements.");
  assert.equal(c.why, "Shown because 3 of your 9 cluster keywords rank #11 to #20 today.");
  const e = promptCopy("everywhere", f)!;
  assert.equal(e.title, "Ledgerline has 28% of brand mentions");
  assert.equal(`${e.lead}${TIER_PLAIN[e.tier!]}${e.tail}`, "Engines cite news and trade coverage of Ledgerline 41 times this period, and of Tallyroo 3 times. Earned media across every engine is alwayseverywhere.");
  assert.equal(e.ask, "Book a call");
  assert.equal(e.dark, true);
  assert.equal(promptCopy("pack", f), null);
});

test("the placements phrase is pricing.ts's own alwaysmentioned line", () => {
  // Deliberate difference from the board ("3 guest posts a month per
  // cluster"): the count and noun come from the tier's include line.
  const pricing = readFileSync("src/config/pricing.ts", "utf8");
  assert.ok(pricing.includes(`"${MENTIONED_PLACEMENTS} on one topic"`));
});
