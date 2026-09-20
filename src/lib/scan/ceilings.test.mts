import assert from "node:assert/strict";
import { test } from "node:test";

import { type CeilingReads, type Count, decideCeilings } from "./ceilings-decide.ts";
import { SETTINGS_FALLBACK, type Settings } from "./settings-merge.ts";

/**
 * The ceilings, executed.
 *
 * `checkCeilings` is the single function standing between an anonymous form and
 * every dollar this site spends - three routes go through it and none has its
 * own copy - and until 20 September 2026 nothing ran it. It was invisible to
 * both censuses at once: `docs/census.mjs` asks whether a filename appears in a
 * test, and `docs/census2.mjs`, which follows imports from all 45 tests, listed
 * `src/lib/scan/ceilings.ts` among the 35 source files no test loads. It had
 * been swept by reading, and every hole named in its own header was found by
 * reading too.
 *
 * What is asserted here is the three things reading is worst at:
 *
 * 1. **The order.** Everything below a given ceiling costs money or database
 *    work, so the first refusal must win and no reading below it may be taken.
 *    That property was held by nothing except the order of the lines - a
 *    reordering typechecks, builds, deploys, and shows up as a bill.
 * 2. **The direction of a failed read.** A ceiling that could not be read has
 *    not been cleared. `?? 0` on a failed count said "nothing has run today" as
 *    a fact, and the cap it guarded was off for as long as that lasted. The
 *    hour this fails in is the hour the database is unwell, which is the same
 *    hour every request below it still pays Anthropic.
 * 3. **The boundary.** `>=` against `>` is one scan, one benchmark or one
 *    dollar over the cap, every time, for ever.
 *
 * Nothing here retypes a limit. Every threshold is read off the `Settings`
 * object the case was built with, so a changed default moves the expectation
 * with it - the blind-tripwire recipe this repo has now found five of is a test
 * that compares a value against its own copy of that value.
 */

/** A settings object at the shipped defaults, with the named limits overridden. */
function settings(over: Partial<Settings> = {}): Settings {
  return { ...SETTINGS_FALLBACK, ...over };
}

type Reading = Count | number | Error;

/**
 * Readings a case supplies, plus a record of which were actually taken.
 *
 * `taken` is the whole point of the harness rather than a convenience: a
 * refusal can be correct while the ceiling below it was read anyway, and that
 * is exactly the defect the order exists to prevent. Every read not named by a
 * case throws if it is reached, so a test that accidentally depends on a
 * reading it did not describe fails loudly instead of quietly passing on a
 * default.
 */
function reads(plan: Partial<Record<keyof CeilingReads, Reading>>) {
  const taken: string[] = [];
  const give = (name: keyof CeilingReads) => async () => {
    taken.push(name);
    const value = plan[name];
    if (value === undefined) {
      throw new Error(`the ${name} ceiling was read, and this case did not expect it to be`);
    }
    if (value instanceof Error) throw value;
    return value;
  };
  return {
    taken,
    reads: {
      todayScans: give("todayScans"),
      spentToday: give("spentToday"),
      modelCallsToday: give("modelCallsToday"),
      ipScans: give("ipScans"),
      ipCampaigns: give("ipCampaigns"),
    } as CeilingReads,
  };
}

/** Runs the real decision and hands back the refusal, the log and the order. */
async function decide(
  opts: { settings?: Settings; countCampaigns?: boolean; subject?: string },
  plan: Partial<Record<keyof CeilingReads, Reading>>,
) {
  const warnings: string[] = [];
  const r = reads(plan);
  const refusal = await decideCeilings(
    {
      settings: opts.settings ?? settings(),
      countCampaigns: opts.countCampaigns,
      subject: opts.subject ?? "scan",
    },
    r.reads,
    (m) => warnings.push(m),
  );
  return { refusal, warnings, taken: r.taken };
}

/** Every ceiling clear, at the shipped defaults. */
const CLEAR = {
  todayScans: 0,
  spentToday: 0,
  modelCallsToday: 0,
  ipScans: 0,
  ipCampaigns: 0,
} as const;

test("every ceiling clear returns null, and all five are read in order", async () => {
  const { refusal, warnings, taken } = await decide({ countCampaigns: true }, { ...CLEAR });
  assert.equal(refusal, null);
  assert.deepEqual(warnings, []);
  assert.deepEqual(taken, [
    "todayScans",
    "spentToday",
    "modelCallsToday",
    "ipScans",
    "ipCampaigns",
  ]);
});

test("the campaign count is not read at all unless the caller asks for it", async () => {
  // Not `countCampaigns`, and `ipCampaigns` is absent from the plan - so the
  // harness throws if it is reached. The scan route must not pay for a count
  // of a table it never writes to.
  const { refusal, taken } = await decide({}, { ...CLEAR, ipCampaigns: undefined });
  assert.equal(refusal, null);
  assert.deepEqual(taken, ["todayScans", "spentToday", "modelCallsToday", "ipScans"]);
});

test("the kill switch costs nothing to honour: no ceiling is read at all", async () => {
  // Every reading absent, so any read is a throw. The switch exists to be
  // thrown in a hurry by someone who will not check that it took, and a
  // database that is unwell must not be able to stop it working.
  const { refusal, taken } = await decide({ settings: settings({ scans_enabled: false }) }, {});
  assert.equal(refusal?.http, 503);
  assert.equal(refusal?.code, "paused");
  assert.deepEqual(taken, []);
});

test("each ceiling refuses at its own limit and stops everything below it", async () => {
  const s = settings();

  const volume = await decide({ countCampaigns: true }, { todayScans: s.daily_scan_cap });
  assert.equal(volume.refusal?.code, "capped");
  assert.equal(volume.refusal?.http, 503);
  assert.deepEqual(volume.taken, ["todayScans"], "a capped day still paid for the ceilings below it");

  const dollars = await decide(
    { countCampaigns: true },
    { todayScans: 0, spentToday: s.daily_cost_cap_usd },
  );
  assert.equal(dollars.refusal?.code, "capped");
  assert.deepEqual(dollars.taken, ["todayScans", "spentToday"]);

  const calls = await decide(
    { countCampaigns: true },
    { todayScans: 0, spentToday: 0, modelCallsToday: s.anthropic_calls_per_day },
  );
  assert.equal(calls.refusal?.code, "capped");
  assert.deepEqual(calls.taken, ["todayScans", "spentToday", "modelCallsToday"]);
  // The model ceiling says so in the log. It is the only one of the three whose
  // figure is not visible anywhere else - dfs_cost is on the row and the scan
  // count is the row - so an unlogged trip is a day of refusals with no cause.
  assert.equal(calls.warnings.length, 1);
  assert.match(calls.warnings[0], new RegExp(String(s.anthropic_calls_per_day)));

  const perIp = await decide(
    { countCampaigns: true },
    { todayScans: 0, spentToday: 0, modelCallsToday: 0, ipScans: s.ip_scans_per_day },
  );
  assert.equal(perIp.refusal?.code, "rate_limited");
  assert.equal(perIp.refusal?.http, 429);
  assert.deepEqual(perIp.taken, ["todayScans", "spentToday", "modelCallsToday", "ipScans"]);

  const campaigns = await decide(
    { countCampaigns: true },
    { ...CLEAR, ipCampaigns: s.ip_scans_per_day },
  );
  assert.equal(campaigns.refusal?.code, "rate_limited");
  assert.equal(campaigns.refusal?.http, 429);
});

test("one below every limit is allowed - the boundary is >= and not >", async () => {
  const s = settings();
  const { refusal } = await decide(
    { countCampaigns: true },
    {
      todayScans: s.daily_scan_cap - 1,
      spentToday: s.daily_cost_cap_usd - 0.01,
      modelCallsToday: s.anthropic_calls_per_day - 1,
      ipScans: s.ip_scans_per_day - 1,
      ipCampaigns: s.ip_scans_per_day - 1,
    },
  );
  assert.equal(refusal, null, "a caller one under the cap was refused a scan they were owed");
});

test("a ceiling that could not be read refuses, and is not read as zero", async () => {
  const s = settings();
  // Every other reading is far over its cap, so a decision that treated the
  // failed read as zero would sail past this ceiling and refuse at a later one
  // with a different code. Asserting only "refused" would pass on that.
  for (const which of ["todayScans", "ipScans", "ipCampaigns"] as const) {
    const plan: Partial<Record<keyof CeilingReads, Reading>> = { ...CLEAR };
    plan[which] = { failed: "connection terminated unexpectedly" };
    const { refusal, warnings, taken } = await decide({ countCampaigns: true, subject: "scan" }, plan);

    assert.equal(refusal?.code, "cap_unreadable", `${which} read as zero rather than refusing`);
    assert.equal(refusal?.http, 503, `${which} accused the visitor of something unmeasured`);
    assert.equal(taken[taken.length - 1], which, `${which} did not stop the ceilings below it`);

    // The reason the read gave survives into the log. Without it the line names
    // a ceiling and not a cause, which sends whoever is on call to the wrong
    // question on the one hour it matters.
    assert.equal(warnings.length, 1, `${which} refused without saying so`);
    assert.match(warnings[0], /connection terminated unexpectedly/);
    assert.match(warnings[0], /unverified/);
  }

  // And the two that throw still throw: spentSince and anthropicCallsSince
  // refuse by reaching the route as a 500 rather than by returning a refusal,
  // which is the behaviour this split had to preserve.
  for (const which of ["spentToday", "modelCallsToday"] as const) {
    const plan: Partial<Record<keyof CeilingReads, Reading>> = { ...CLEAR };
    plan[which] = new Error("PostgREST said no");
    await assert.rejects(
      () => decide({ settings: s }, plan),
      /PostgREST said no/,
      `${which} swallowed a failed read instead of refusing`,
    );
  }
});

test("a refusal names what the caller asked for, in their words", async () => {
  const s = settings({ ip_scans_per_day: 1 });
  const overIp = { ...CLEAR, ipScans: 1 };

  const scan = await decide({ settings: s, subject: "scan" }, { ...overIp });
  assert.match(scan.refusal!.message, /free scans/);

  const benchmark = await decide({ settings: s, subject: "benchmark" }, { ...overIp });
  assert.match(benchmark.refusal!.message, /free benchmarks/);

  // Same on the unreadable path, which is the one a visitor is most likely to
  // see twice in a row and go looking for the wrong limit over.
  const unreadable = await decide(
    { settings: s, subject: "benchmark" },
    { ...CLEAR, todayScans: { failed: "timeout" } },
  );
  assert.match(unreadable.refusal!.message, /that benchmark/);
  assert.doesNotMatch(unreadable.refusal!.message, /scan/);
});

test("no refusal tells the visitor a number about our spend or our day", async () => {
  // Every message a caller can be handed, gathered from the real decision
  // rather than typed out here. The ceilings are our cost basis - the daily
  // dollar cap, the model call budget and the scan volume are all figures this
  // repo keeps server-side - and a refusal is the one place they could reach a
  // visitor without anybody noticing, because a 503 is not read as a leak.
  const s = settings();
  const cases: Array<Partial<Record<keyof CeilingReads, Reading>>> = [
    { todayScans: s.daily_scan_cap },
    { todayScans: 0, spentToday: s.daily_cost_cap_usd },
    { todayScans: 0, spentToday: 0, modelCallsToday: s.anthropic_calls_per_day },
    { ...CLEAR, ipScans: s.ip_scans_per_day },
    { ...CLEAR, ipCampaigns: s.ip_scans_per_day },
    { ...CLEAR, todayScans: { failed: "x" } },
    { ...CLEAR, ipScans: { failed: "x" } },
  ];
  const messages: string[] = [];
  for (const plan of cases) {
    const { refusal } = await decide({ countCampaigns: true }, plan);
    assert.ok(refusal, "a case built to refuse did not");
    messages.push(refusal.message);
  }
  const paused = await decide({ settings: settings({ scans_enabled: false }) }, {});
  messages.push(paused.refusal!.message);

  assert.equal(messages.length, 8);
  for (const m of messages) {
    assert.doesNotMatch(m, /\d/, `a refusal put a figure in front of the visitor: ${m}`);
  }
});
