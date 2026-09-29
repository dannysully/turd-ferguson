import assert from "node:assert/strict";
import { test } from "node:test";

import {
  dayAfter,
  liveOn,
  slugFor,
  underLimit,
  readTrackingSettings,
  refuseRun,
  runOutcome,
  shouldTrack,
  signRun,
  trackingDay,
  upsellSetting,
  verifyRun,
} from "./decide.ts";

test("upgrade prompts: nomada or off need nothing; agency needs the agency's email (R94)", () => {
  assert.deepEqual(upsellSetting("nomada", "ignored@example.com"), { mode: "nomada", contact: null });
  assert.deepEqual(upsellSetting("off", ""), { mode: "off", contact: null });
  assert.deepEqual(upsellSetting("agency", " Hello@Example.com "), { mode: "agency", contact: "hello@example.com" });
  assert.ok("error" in upsellSetting("agency", ""), "agency without a contact is refused");
  assert.ok("error" in upsellSetting("agency", "not an email"));
  assert.ok("error" in upsellSetting("tracked", ""), "a tier is not a mode");
});

/**
 * T1's decisions, run (docs/tracked-dashboard-2026-09-29/BRIEF.md, 29 Sep 2026).
 */

test("a client with no active question is never tracked (danny.md 86)", () => {
  // The twelve rows client_domains already holds on 29 Sep: active by the
  // migration's default, no questions. None of them may be dispatched.
  assert.equal(shouldTrack({ id: "a", status: "active", started_on: null, activeQuestions: 0 }, "2026-09-30"), false);
  assert.equal(shouldTrack({ id: "a", status: "active", started_on: null, activeQuestions: 1 }, "2026-09-30"), true);
});

test("a paused, ended or not-yet-started client is not tracked", () => {
  assert.equal(shouldTrack({ id: "a", status: "paused", started_on: null, activeQuestions: 5 }, "2026-09-30"), false);
  assert.equal(shouldTrack({ id: "a", status: "ended", started_on: null, activeQuestions: 5 }, "2026-09-30"), false);
  assert.equal(shouldTrack({ id: "a", status: "active", started_on: "2026-10-01", activeQuestions: 5 }, "2026-09-30"), false);
  assert.equal(shouldTrack({ id: "a", status: "active", started_on: "2026-09-30", activeQuestions: 5 }, "2026-09-30"), true);
});

test("a stopped question is live up to the day before it stopped, and a new one from the day it was added", () => {
  assert.equal(liveOn({ added_on: "2026-09-10", stopped_on: null }, "2026-09-10"), true);
  assert.equal(liveOn({ added_on: "2026-09-11", stopped_on: null }, "2026-09-10"), false);
  assert.equal(liveOn({ added_on: "2026-09-01", stopped_on: "2026-09-10" }, "2026-09-09"), true);
  assert.equal(liveOn({ added_on: "2026-09-01", stopped_on: "2026-09-10" }, "2026-09-10"), false);
});

test("the tracking day is London's date, across both clock changes", () => {
  // 05:00 UTC in summer is 06:00 BST; in winter 05:00 GMT. Same date either way.
  assert.equal(trackingDay(new Date("2026-09-29T05:00:00Z")), "2026-09-29");
  assert.equal(trackingDay(new Date("2026-12-15T05:00:00Z")), "2026-12-15");
  // 23:30 UTC in summer is already tomorrow in London.
  assert.equal(trackingDay(new Date("2026-09-29T23:30:00Z")), "2026-09-30");
});

test("tracking settings fail closed", () => {
  assert.deepEqual(readTrackingSettings([]), { enabled: false, dailyCapUsd: 0 });
  assert.deepEqual(readTrackingSettings([{ key: "tracking_enabled", value: "true" }]), { enabled: false, dailyCapUsd: 0 });
  assert.deepEqual(
    readTrackingSettings([
      { key: "tracking_enabled", value: true },
      { key: "tracking_daily_cost_cap_usd", value: 25 },
    ]),
    { enabled: true, dailyCapUsd: 25 },
  );
  assert.ok(refuseRun({ enabled: false, dailyCapUsd: 25 }, 0));
  assert.ok(refuseRun({ enabled: true, dailyCapUsd: 25 }, 25));
  assert.ok(refuseRun({ enabled: true, dailyCapUsd: 0 }, 0), "no cap is no spend, not unlimited spend");
  assert.equal(refuseRun({ enabled: true, dailyCapUsd: 25 }, 24.99), null);
});

test("a run signature verifies only for the body and secret it was made with", () => {
  const body = JSON.stringify({ runId: "r1" });
  const sig = signRun(body, "s3cret");
  assert.ok(verifyRun(body, sig, "s3cret"));
  assert.ok(!verifyRun(JSON.stringify({ runId: "r2" }), sig, "s3cret"));
  assert.ok(!verifyRun(body, sig, "other"));
  assert.ok(!verifyRun(body, null, "s3cret"));
  assert.ok(!verifyRun(body, sig, ""), "an unset secret verifies nothing");
});

test("admin helpers: next day, slug, limit (T2)", () => {
  assert.equal(dayAfter("2026-09-29"), "2026-09-30");
  assert.equal(dayAfter("2026-09-30"), "2026-10-01");
  assert.equal(dayAfter("2026-12-31"), "2027-01-01");
  assert.equal(slugFor("www.tallyroo.com"), "tallyroo-com");
  assert.equal(slugFor("https://Example.com/path"), "example-com");
  assert.equal(underLimit(19, 20), true);
  assert.equal(underLimit(20, 20), false, "the 21st question is refused");
});

test("a run that read nothing successfully is failed, not a day of zeros", () => {
  assert.equal(runOutcome(80, 0), "complete");
  assert.equal(runOutcome(80, 3), "partial");
  assert.equal(runOutcome(80, 80), "failed");
  assert.equal(runOutcome(0, 0), "complete");
});
