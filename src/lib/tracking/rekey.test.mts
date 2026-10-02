import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { addDays } from "./figures.ts";
import { expandFixture } from "./fixture-mode.ts";
import { FIXTURE_CHECK_VOLUME, fixtureCheck, fixtureRekey } from "./fixture-writes.ts";
import { KEYWORD_FIXED, refuseRekey } from "./rekey.ts";

// R179 (Danny, 2 Oct 2026, danny.md line 211): a pending cluster's keyword can change until its first reading; after it, never.

const today = "2026-10-02";
const tomorrow = "2026-10-03";
const pending = { started_on: tomorrow, stopped_on: null };

test("refuseRekey: a pending cluster's keyword may change, for owners and editors", () => {
  assert.equal(refuseRekey({ role: "owner", cluster: pending, today, readings: 0, taken: false }), null);
  assert.equal(refuseRekey({ role: "editor", cluster: pending, today, readings: 0, taken: false }), null);
});

test("refuseRekey: after the first reading the keyword is fixed, and the reason says what to do", () => {
  assert.equal(refuseRekey({ role: "owner", cluster: { started_on: today, stopped_on: null }, today, readings: 0, taken: false }), KEYWORD_FIXED);
  assert.equal(refuseRekey({ role: "owner", cluster: pending, today, readings: 1, taken: false }), KEYWORD_FIXED, "a reading fixes it whatever the start day says");
  assert.match(KEYWORD_FIXED, /Stop this cluster and add a new one/);
});

test("refuseRekey: viewers, stopped, missing and already-tracked are refused", () => {
  assert.match(refuseRekey({ role: "viewer", cluster: pending, today, readings: 0, taken: false })!, /Only owners and editors/);
  assert.equal(refuseRekey({ role: "owner", cluster: { started_on: tomorrow, stopped_on: tomorrow }, today, readings: 0, taken: false }), "That cluster is stopped.");
  assert.equal(refuseRekey({ role: "owner", cluster: null, today, readings: 0, taken: false }), "That cluster is not on this client.");
  assert.equal(refuseRekey({ role: "owner", cluster: pending, today, readings: 0, taken: true }), "You already track this keyword.");
});

const base = expandFixture(JSON.parse(readFileSync(new URL("./fixture.json", import.meta.url), "utf8")));
const c0 = base.data.clusters.find((c) => c.stopped_on === null && c.keyword_id)!;
// The same cluster made pending: it and its keyword start tomorrow, and its keyword has no readings yet.
const fx = {
  ...base,
  data: {
    ...base.data,
    clusters: base.data.clusters.map((c) => (c.id === c0.id ? { ...c, started_on: addDays(base.today, 1) } : c)),
    serp: base.data.serp.filter((s) => s.keyword_id !== c0.keyword_id),
  },
};

test("fixtureRekey: a verified check changes the pending cluster's keyword in place and keeps its prompts", () => {
  const c = fixtureCheck(fx, "practice software for vets");
  assert.ok(c.check.ok && c.sig, JSON.stringify(c.check));
  const p = { clusterId: c0.id, keyword: c.check.keyword, volume: FIXTURE_CHECK_VOLUME, intent: "commercial", sig: c.sig!, role: "owner" };
  const r = fixtureRekey(fx, p);
  assert.ok(r.ok, r.ok ? "" : r.message);
  const cl = r.fixture.data.clusters.find((x) => x.id === c0.id)!;
  const kw = r.fixture.data.keywords.find((k) => k.id === cl.keyword_id)!;
  assert.deepEqual([cl.keyword_id, cl.name, kw.keyword, kw.search_volume], [c0.keyword_id, c.check.keyword, c.check.keyword, FIXTURE_CHECK_VOLUME]);
  assert.deepEqual(
    r.fixture.data.questions.filter((q) => q.cluster_id === c0.id),
    fx.data.questions.filter((q) => q.cluster_id === c0.id),
    "the prompts are kept",
  );
  assert.equal(r.fixture.data.keywords.length, fx.data.keywords.length, "nothing added or deleted");
  assert.equal(fixtureRekey(fx, { ...p, role: "viewer" }).ok, false, "viewer");
  assert.equal(fixtureRekey(fx, { ...p, sig: "0".repeat(64) }).ok, false, "a hand-made signature is refused");
  assert.equal(fixtureRekey(fx, { ...p, volume: 5 }).ok, false, "a changed volume does not verify");
});

test("fixtureRekey: a cluster with its first reading keeps its keyword", () => {
  const c = fixtureCheck(base, "practice software for vets");
  const r = fixtureRekey(base, { clusterId: c0.id, keyword: c.check.ok ? c.check.keyword : "", volume: FIXTURE_CHECK_VOLUME, intent: "commercial", sig: c.sig ?? null, role: "owner" });
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.message, KEYWORD_FIXED);
});
