import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { decideCeilings } from "../scan/ceilings-decide.ts";
import { SETTINGS_FALLBACK, mergeSettings } from "../scan/settings-merge.ts";
import { decideRecentReading, recentReadingLine } from "./domain-ceiling-decide.ts";

/**
 * R165 (Danny, 1 Oct 2026, danny.md line 174): the coverage check's
 * per-domain ceiling has an exempt list in app_settings; the IP ceiling does
 * not. Only example.com appears here - a real domain is never written into
 * src, tests or fixtures.
 */

const recentRow = async () => true;

test("an exempt domain with a recent reading is not refused, and its read is not taken", async () => {
  let read = false;
  const refusal = await decideRecentReading("example.com", ["example.com"], async () => {
    read = true;
    return true;
  });
  assert.equal(refusal, null);
  assert.equal(read, false, "an exempt domain still paid for the campaigns read");
});

test("a non-exempt domain with the same recent reading is still refused", async () => {
  assert.equal(
    await decideRecentReading("other.example.com", ["example.com"], recentRow),
    recentReadingLine("other.example.com"),
  );
  assert.equal(await decideRecentReading("example.com", [], recentRow), recentReadingLine("example.com"));
});

test("no recent reading, or a failed read, lets the visitor through", async () => {
  assert.equal(await decideRecentReading("example.com", [], async () => false), null);
  assert.equal(await decideRecentReading("example.com", [], async () => null), null);
});

test("the IP ceiling still refuses an exempt domain over the limit", async () => {
  const settings = mergeSettings([{ key: "coverage_ceiling_exempt_domains", value: ["example.com"] }]);
  assert.deepEqual(settings.coverage_ceiling_exempt_domains, ["example.com"]);
  const refusal = await decideCeilings(
    { settings, countCampaigns: true, subject: "benchmark" },
    {
      todayScans: async () => 0,
      spentToday: async () => 0,
      modelCallsToday: async () => 0,
      ipScans: async () => 0,
      ipCampaigns: async () => settings.ip_scans_per_day,
    },
    () => {},
  );
  assert.equal(refusal?.code, "rate_limited");
  // And the decision layer has no way to see the list at all.
  const decide = readFileSync(join(import.meta.dirname, "../scan/ceilings-decide.ts"), "utf8");
  assert.ok(!decide.includes("coverage_ceiling_exempt_domains"), "the IP ceiling reads the exempt list");
});

test("the exempt list defaults empty and is cleaned on the way in", () => {
  assert.deepEqual(SETTINGS_FALLBACK.coverage_ceiling_exempt_domains, []);
  const warnings: string[] = [];
  const s = mergeSettings(
    [{ key: "coverage_ceiling_exempt_domains", value: [" Example.COM ", "example.com", 3, ""] }],
    (m) => warnings.push(m),
  );
  assert.deepEqual(s.coverage_ceiling_exempt_domains, ["example.com"]);
  assert.equal(warnings.length, 1);

  const notArray = mergeSettings([{ key: "coverage_ceiling_exempt_domains", value: "example.com" }], (m) =>
    warnings.push(m),
  );
  assert.deepEqual(notArray.coverage_ceiling_exempt_domains, []);
  assert.match(warnings[1], /not an array/);
});

test("the route's ceiling reads the list from settings and goes through the decision", () => {
  const ceiling = readFileSync(join(import.meta.dirname, "domain-ceiling.ts"), "utf8");
  assert.match(ceiling, /\.coverage_ceiling_exempt_domains/);
  assert.match(ceiling, /return decideRecentReading\(domain, exempt,/);
});
