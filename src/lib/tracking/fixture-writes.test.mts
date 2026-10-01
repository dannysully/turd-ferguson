import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { expandFixture } from "./fixture-mode.ts";
import { fixtureStop, fixtureWrites } from "./fixture-writes.ts";
import { addDays } from "./figures.ts";

/**
 * R168 (Danny, 2 Oct 2026, danny.md lines 177-179): TRACKING_FIXTURE_WRITE=1,
 * the writable fixture. Refused in production as TRACKING_FIXTURE is; the
 * writes follow stop.ts's rules on the fixture's rows.
 */

const fx = expandFixture(JSON.parse(readFileSync(new URL("./fixture.json", import.meta.url), "utf8")));

test("R168: TRACKING_FIXTURE_WRITE=1 is refused in production, with or without TRACKING_FIXTURE", () => {
  assert.throws(() => fixtureWrites({ TRACKING_FIXTURE_WRITE: "1", VERCEL_ENV: "production" }), /refuses/);
  assert.throws(() => fixtureWrites({ TRACKING_FIXTURE_WRITE: "1", TRACKING_FIXTURE: "1", VERCEL_ENV: "production" }), /refuses/);
});

test("R168: writes are on only with both switches exactly 1, outside production", () => {
  assert.equal(fixtureWrites({}), false);
  assert.equal(fixtureWrites({ TRACKING_FIXTURE: "1" }), false, "the fixture alone stays read-only");
  assert.equal(fixtureWrites({ TRACKING_FIXTURE_WRITE: "1" }), false, "no fixture, nothing to write to");
  assert.equal(fixtureWrites({ TRACKING_FIXTURE_WRITE: "true", TRACKING_FIXTURE: "1" }), false);
  assert.equal(fixtureWrites({ TRACKING_FIXTURE_WRITE: "1", TRACKING_FIXTURE: "1" }), true);
  assert.equal(fixtureWrites({ TRACKING_FIXTURE_WRITE: "1", TRACKING_FIXTURE: "1", VERCEL_ENV: "preview" }), true);
});

test("R168: the stop and undo routes ask the writable fixture before refusing", () => {
  for (const route of ["stop", "setup"]) {
    const src = readFileSync(new URL(`../../app/api/app/[client]/${route}/route.ts`, import.meta.url), "utf8");
    assert.match(src, route === "stop" ? /writeFixture\(/ : /confirmFixtureSetup\(\)/, `${route} writes to the fixture`);
  }
});

const first = fx.data.questions.find((q) => q.stopped_on === null && q.cluster_id !== null)!;
const day = addDays(fx.today, 1);

test("R168: a prompt stops from tomorrow, and undo brings it back", () => {
  const s = fixtureStop(fx, { kind: "prompt", id: first.id, today: fx.today, role: "owner", undo: false });
  assert.ok(s.ok);
  assert.equal(s.fixture.data.questions.find((q) => q.id === first.id)!.stopped_on, day);
  assert.equal(s.fixture.data.questions.filter((q) => q.stopped_on !== null).length, 1, "only that prompt");
  assert.ok(fx.data.questions.every((q) => q.stopped_on === null), "the fixture in is untouched");
  const again = fixtureStop(s.fixture, { kind: "prompt", id: first.id, today: fx.today, role: "owner", undo: false });
  assert.deepEqual(again, { ok: false, message: "It is already stopped." });
  const u = fixtureStop(s.fixture, { kind: "prompt", id: first.id, today: fx.today, role: "editor", undo: true });
  assert.ok(u.ok);
  assert.equal(u.fixture.data.questions.find((q) => q.id === first.id)!.stopped_on, null);
});

test("R168: viewers, unknown ids, and an undo after the stop took effect are refused", () => {
  assert.equal(fixtureStop(fx, { kind: "prompt", id: first.id, today: fx.today, role: "viewer", undo: false }).ok, false);
  assert.equal(fixtureStop(fx, { kind: "prompt", id: "nope", today: fx.today, role: "owner", undo: false }).ok, false);
  const s = fixtureStop(fx, { kind: "prompt", id: first.id, today: fx.today, role: "owner", undo: false });
  assert.ok(s.ok);
  const late = fixtureStop(s.fixture, { kind: "prompt", id: first.id, today: day, role: "owner", undo: true });
  assert.deepEqual(late, { ok: false, message: "That stop has taken effect. Add it again as a new one." });
});

test("R168: a cluster stops with its keyword and live prompts; undo brings back only those stopped on its day", () => {
  const c = fx.data.clusters.find((x) => x.stopped_on === null && x.keyword_id)!;
  const own = fixtureStop(fx, { kind: "prompt", id: fx.data.questions.find((q) => q.cluster_id === c.id)!.id, today: addDays(fx.today, -2), role: "owner", undo: false });
  assert.ok(own.ok, "one prompt stopped on its own, earlier");
  const s = fixtureStop(own.fixture, { kind: "cluster", id: c.id, today: fx.today, role: "owner", undo: false });
  assert.ok(s.ok);
  assert.equal(s.fixture.data.clusters.find((x) => x.id === c.id)!.stopped_on, day);
  assert.equal(s.fixture.data.keywords.find((k) => k.id === c.keyword_id)!.stopped_on, day);
  assert.ok(s.fixture.data.questions.filter((q) => q.cluster_id === c.id).every((q) => q.stopped_on !== null));
  const inside = s.fixture.data.questions.find((q) => q.cluster_id === c.id && q.stopped_on === day)!;
  assert.match((fixtureStop(s.fixture, { kind: "prompt", id: inside.id, today: fx.today, role: "owner", undo: true }) as { message: string }).message, /Undo the cluster/);
  const u = fixtureStop(s.fixture, { kind: "cluster", id: c.id, today: fx.today, role: "owner", undo: true });
  assert.ok(u.ok);
  const mine = u.fixture.data.questions.filter((q) => q.cluster_id === c.id);
  assert.equal(mine.filter((q) => q.stopped_on !== null).length, 1, "the prompt stopped on its own stays stopped");
  assert.equal(u.fixture.data.keywords.find((k) => k.id === c.keyword_id)!.stopped_on, null);
});
