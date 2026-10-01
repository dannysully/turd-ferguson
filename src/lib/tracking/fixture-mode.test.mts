import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { expandFixture, fixtureLive, fixtureMode, fixtureState } from "./fixture-mode.ts";
import { overview } from "./figures.ts";
import { ANGLES } from "./limits.ts";

/**
 * R93 / BRIEF-2 T9 (29 Sep 2026): the fixture switch, and the fixture itself.
 * The fixture is made up - Tallyroo from boards-3/dataset.py - and is never
 * served in production.
 */

test("TRACKING_FIXTURE=1 is refused when VERCEL_ENV=production", () => {
  assert.throws(() => fixtureMode({ TRACKING_FIXTURE: "1", VERCEL_ENV: "production" }), /refuses/);
});

test("the fixture switch is off unless TRACKING_FIXTURE is exactly 1, and on outside production", () => {
  assert.equal(fixtureMode({}), false);
  assert.equal(fixtureMode({ VERCEL_ENV: "production" }), false);
  assert.equal(fixtureMode({ TRACKING_FIXTURE: "true" }), false);
  assert.equal(fixtureMode({ TRACKING_FIXTURE: "1" }), true);
  assert.equal(fixtureMode({ TRACKING_FIXTURE: "1", VERCEL_ENV: "preview" }), true);
});

test("the /app layout asks the switch on every request", () => {
  const layout = readFileSync(new URL("../../app/app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /^\s*fixtureMode\(\);/m);
});

const fx = expandFixture(JSON.parse(readFileSync(new URL("./fixture.json", import.meta.url), "utf8")));

test("the fixture expands to the rows the overview reads, and the overview computes on it", () => {
  assert.equal(fx.client.brand, "Tallyroo");
  assert.equal(fx.data.questions.length, 50, "10 clusters of 5 prompts");
  assert.equal(fx.data.keywords.length, 10);
  assert.ok(fx.data.answers.length > 5000, "both periods of daily answers");
  assert.ok(fx.data.answers.every((a) => a.answered && typeof a.named === "boolean"));
  assert.ok(fx.data.answers.some((a) => a.citations.length), "cited pages carried");
  const o = overview({
    range: { from: "2026-09-02", to: fx.today },
    compare: "prev",
    startedOn: fx.client.started_on,
    engines: ["google_aio", "chatgpt", "gemini", "perplexity"],
    questions: fx.data.questions,
    answers: fx.data.answers,
    serp: fx.data.serp,
    keywordCount: fx.data.keywords.length,
  });
  assert.ok(o.named.den > 0 && o.named.num > 0 && o.named.num < o.named.den);
});

test("the fixture is cluster-shaped: 10 clusters, each one keyword and one prompt per angle (R117 T9 step, 30 Sep 2026)", () => {
  const { clusters, questions, keywords } = fx.data;
  assert.equal(clusters.length, fx.client.cluster_limit);
  assert.deepEqual(new Set(clusters.map((c) => c.keyword_id)).size, clusters.length, "one live cluster per keyword");
  for (const c of clusters) {
    const kw = keywords.find((k) => k.id === c.keyword_id);
    assert.ok(kw, `${c.id} joins to a keyword row`);
    assert.equal(c.name, kw.keyword, "a cluster is named for its keyword");
    assert.ok(kw.search_volume && kw.search_volume > 0);
    assert.ok(kw.intent === "commercial" || kw.intent === "transactional");
    const prompts = questions.filter((q) => q.cluster_id === c.id);
    assert.deepEqual(prompts.map((q) => q.angle), [...ANGLES], `${c.id} has one prompt per angle, in order`);
    assert.ok(prompts.every((q) => q.added_on === c.started_on));
  }
  assert.ok(questions.every((q) => q.cluster_id !== null), "no ungrouped prompt in the fixture");
  const pending = clusters.filter((c) => c.started_on > fx.today);
  assert.equal(pending.length, 1, "one pending cluster, first asked tomorrow");
  const pendingIds = new Set(questions.filter((q) => q.cluster_id === pending[0].id).map((q) => q.id));
  assert.ok(!fx.data.answers.some((a) => pendingIds.has(a.question_id)), "a pending cluster has no readings");
});

test("the fixture names only the made-up brands and domains", () => {
  const brands = new Set(fx.data.answers.flatMap((a) => a.brands));
  // R143 (1 Oct 2026): Tallyroo is the client, so as the runner writes rows it
  // is never among the other brands; expandFixture drops it from them.
  assert.deepEqual([...brands].sort(), ["Brightbook", "Countwise", "Ledgerline", "Sumly"]);
  assert.equal(fx.client.domain, "tallyroo.com");
  assert.match(fx.member.email, /@example\.com$/);
});

test("R138: TRACKING_FIXTURE_STATE=ungrouped serves the client with no clusters and no prompt in one; unset changes nothing", () => {
  assert.equal(fixtureState(fx, {}), fx);
  assert.equal(fixtureState(fx, { TRACKING_FIXTURE_STATE: "other" }), fx);
  const u = fixtureState(fx, { TRACKING_FIXTURE_STATE: "ungrouped" });
  assert.equal(u.data.clusters.length, 0);
  assert.equal(u.data.questions.length, fx.data.questions.length);
  assert.ok(u.data.questions.every((q) => q.cluster_id === null));
  assert.equal(u.placements.length, 0);
  assert.ok(fx.data.questions.some((q) => q.cluster_id), "the default fixture is untouched");
});

test("R146: TRACKING_FIXTURE_ROLE signs the fixture in as each member; removed is refused, a typo throws", () => {
  assert.equal(fixtureState(fx, {}).member.role, "owner");
  assert.ok(fixtureLive(fx, fx.member.email), "the default session is a live member");
  for (const role of ["editor", "viewer"] as const) {
    const f = fixtureState(fx, { TRACKING_FIXTURE_ROLE: role });
    assert.equal(f.member.role, role);
    assert.notEqual(f.member.email, fx.member.email);
    assert.ok(fixtureLive(f, f.member.email), `${role} sees the client`);
  }
  const gone = fixtureState(fx, { TRACKING_FIXTURE_ROLE: "removed" });
  assert.ok(fx.members.some((m) => m.email === gone.member.email && m.removed_at), "removed signs in as the removed member");
  assert.equal(fixtureLive(gone, gone.member.email), false, "a removed member is not live, so every client page 404s");
  assert.equal(fixtureLive(fx, "stranger@example.com"), false);
  assert.throws(() => fixtureState(fx, { TRACKING_FIXTURE_ROLE: "admin" }), /no such member/);
  const both = fixtureState(fx, { TRACKING_FIXTURE_ROLE: "viewer", TRACKING_FIXTURE_STATE: "ungrouped" });
  assert.equal(both.member.role, "viewer");
  assert.equal(both.data.clusters.length, 0);
});
