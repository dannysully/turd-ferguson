import assert from "node:assert/strict";
import { test } from "node:test";

import { ENGINES, FREE_ENGINES, GATED_ENGINES } from "./engines.ts";
import { SETTINGS_FALLBACK, mergeSettings, sameShape } from "./settings-merge.ts";

/**
 * The kill switch, the two spend ceilings and the engine split - the settings
 * that decide whether this site scans at all and what a scan costs - had no
 * executor until 20 September 2026. They were one of the 24 files under `src`
 * named by no test: swept for text and markup by the four walking sweeps, with
 * nothing anywhere running the behaviour.
 *
 * What is asserted here is deliberately the *refusals*. A setting of the right
 * type is trivially right; the cases that matter are the ones a hand-edited
 * jsonb cell produces - `"false"` where `false` was meant, a name pasted twice,
 * a string where an array was meant - because every one of those fails
 * silently and in the expensive direction.
 *
 * Nothing here retypes a value out of `settings-merge.ts`. The fallbacks are
 * read off `SETTINGS_FALLBACK` and the engine names off `ENGINES`, so a changed
 * default moves the expectation with it rather than failing this file.
 */

/** Runs the real merge and hands back both the settings and what it logged. */
function merge(rows: Array<{ key: string; value: unknown }>) {
  const warnings: string[] = [];
  const settings = mergeSettings(rows, (m) => warnings.push(m));
  return { settings, warnings };
}

const anEngine = ENGINES[1];
const another = ENGINES[2];

test("no rows is the defaults, and the defaults are self-consistent", () => {
  const { settings, warnings } = merge([]);
  assert.deepEqual(settings, SETTINGS_FALLBACK);
  assert.deepEqual(warnings, []);

  // The shipped split must not itself contain the defect the merge refuses.
  assert.equal(new Set(FREE_ENGINES).size, FREE_ENGINES.length, "FREE_ENGINES repeats a name");
  assert.equal(new Set(GATED_ENGINES).size, GATED_ENGINES.length, "GATED_ENGINES repeats a name");
  const free = new Set<string>(FREE_ENGINES);
  assert.deepEqual(
    GATED_ENGINES.filter((e) => free.has(e)),
    [],
    "an engine is in both the free and gated defaults, so the unlock pass buys an answer it has",
  );
});

test("the returned engine lists are copies, so a caller cannot edit the defaults", () => {
  const first = mergeSettings([]);
  assert.notEqual(first.scan_engines_free, SETTINGS_FALLBACK.scan_engines_free);
  first.scan_engines_free.push(anEngine);
  first.scan_engines_gated.push(anEngine);

  const second = mergeSettings([]);
  assert.deepEqual(second.scan_engines_free, FREE_ENGINES);
  assert.deepEqual(second.scan_engines_gated, GATED_ENGINES);
  assert.deepEqual(SETTINGS_FALLBACK.scan_engines_free, FREE_ENGINES);
});

/**
 * The two booleans, and the reason this guard exists at all. A jsonb cell
 * holding the string "false" is truthy, so without it the kill switch reads as
 * on while the table says off.
 */
test("a boolean setting refuses anything that is not a boolean", () => {
  for (const notABoolean of ["false", "true", 0, 1, null, [], {}]) {
    const { settings, warnings } = merge([
      { key: "scans_enabled", value: notABoolean },
      { key: "require_email_verification", value: notABoolean },
    ]);
    assert.equal(settings.scans_enabled, SETTINGS_FALLBACK.scans_enabled, `scans_enabled took ${JSON.stringify(notABoolean)}`);
    assert.equal(
      settings.require_email_verification,
      SETTINGS_FALLBACK.require_email_verification,
      `require_email_verification took ${JSON.stringify(notABoolean)}`,
    );
    assert.equal(warnings.length, 2, `a refusal went unlogged for ${JSON.stringify(notABoolean)}`);
  }

  // And a real boolean still lands, both ways round, or the guard is a wall.
  assert.equal(merge([{ key: "scans_enabled", value: false }]).settings.scans_enabled, false);
  assert.equal(
    merge([{ key: "require_email_verification", value: true }]).settings.require_email_verification,
    true,
  );
});

test("a number setting refuses a non-number, a negative, and one big enough to break a Date", () => {
  const numberKeys = (Object.keys(SETTINGS_FALLBACK) as Array<keyof typeof SETTINGS_FALLBACK>).filter(
    (k) => typeof SETTINGS_FALLBACK[k] === "number",
  );
  assert.ok(numberKeys.length >= 7, `expected the number settings, found ${numberKeys.length}`);

  for (const key of numberKeys) {
    for (const bad of ["200", null, true, [], NaN, Infinity, -Infinity, -1, 1e308]) {
      const { settings, warnings } = merge([{ key, value: bad }]);
      assert.equal(
        settings[key],
        SETTINGS_FALLBACK[key],
        `${key} took ${JSON.stringify(bad) ?? String(bad)}`,
      );
      assert.equal(warnings.length, 1, `${key} refused ${String(bad)} without logging it`);
    }
    // Zero is a legitimate value - it is how a cap is set to "nothing".
    assert.equal(merge([{ key, value: 0 }]).settings[key], 0, `${key} refused 0`);
  }
});

/**
 * The cache window is the one number whose overflow is not a wrong answer but
 * a crash: `start/route.ts` builds it as a Date and calls `toISOString()`, and
 * an Invalid Date throws RangeError there, uncaught, on the route that starts
 * every scan.
 */
test("domain_cache_days can never build an invalid Date", () => {
  for (const value of [1e308, Number.MAX_VALUE, -1, NaN, Infinity]) {
    const days = merge([{ key: "domain_cache_days", value }]).settings.domain_cache_days;
    const since = new Date(Date.now() - days * 86_400_000);
    assert.ok(Number.isFinite(since.getTime()), `domain_cache_days ${String(value)} made an invalid Date`);
    // And the window is in the past, or every scan misses the cache and pays.
    assert.ok(since.getTime() <= Date.now(), `domain_cache_days ${String(value)} put the window in the future`);
  }
});

test("an engine list drops names that are not engines, and says so", () => {
  const { settings, warnings } = merge([
    { key: "scan_engines_free", value: [anEngine, "bard", "copilot"] },
  ]);
  assert.deepEqual(settings.scan_engines_free, [anEngine]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /do not exist/);
});

/**
 * The expensive one. `pipeline.ts` builds its job list as
 * `questions.flatMap(q => engines.map(...))`, so a name appearing twice asks
 * every question of that engine twice and bills for both.
 */
test("a repeated engine name is read once", () => {
  const { settings, warnings } = merge([
    { key: "scan_engines_free", value: [anEngine, another, anEngine] },
  ]);
  assert.deepEqual(settings.scan_engines_free, [anEngine, another]);
  assert.ok(
    warnings.some((w) => /repeats an engine name/.test(w)),
    "a duplicate was dropped without logging it",
  );

  // The property that actually costs money, stated directly: whatever is
  // returned, one engine is one read per question.
  assert.equal(
    new Set(settings.scan_engines_free).size,
    settings.scan_engines_free.length,
    "the free list would ask an engine twice",
  );
});

test("an engine list that is not an array is refused, not silently emptied", () => {
  for (const notAList of [anEngine, null, 4, true, { 0: anEngine }]) {
    const { settings, warnings } = merge([
      { key: "scan_engines_free", value: notAList },
      { key: "scan_engines_gated", value: notAList },
    ]);
    assert.deepEqual(settings.scan_engines_free, FREE_ENGINES);
    assert.deepEqual(settings.scan_engines_gated, GATED_ENGINES);
    assert.equal(warnings.length, 2, `${JSON.stringify(notAList)} was refused without logging it`);
  }
});

test("the free list may not be empty; the gated list may", () => {
  const emptied = merge([
    { key: "scan_engines_free", value: [] },
    { key: "scan_engines_gated", value: [] },
  ]);
  assert.deepEqual(emptied.settings.scan_engines_free, FREE_ENGINES);
  assert.deepEqual(emptied.settings.scan_engines_gated, []);

  // A list of nothing but typos is an empty list, and takes the same route.
  const typos = merge([{ key: "scan_engines_free", value: ["bard", "bard"] }]);
  assert.deepEqual(typos.settings.scan_engines_free, FREE_ENGINES);
});

/**
 * An engine in both lists is a full second pass, at full price, for an answer
 * the free pass already stored - every citation reader keys on
 * `(source_domain, question_id, engine)`, so the report cannot even show it.
 */
test("an engine in both lists is dropped from the gated one", () => {
  const { settings, warnings } = merge([
    { key: "scan_engines_free", value: [anEngine, another] },
    { key: "scan_engines_gated", value: [another, ENGINES[4]] },
  ]);
  assert.deepEqual(settings.scan_engines_free, [anEngine, another], "the free pass was changed");
  assert.deepEqual(settings.scan_engines_gated, [ENGINES[4]]);
  assert.ok(warnings.some((w) => /full price/.test(w)), "the overlap was dropped without logging it");
});

/**
 * hasOwn, not `in`. `in` answers for the whole prototype chain, so these keys
 * passed the guard and were compared against an inherited function.
 *
 * The *silently* is what this test turns on, and it took an injected `in` to
 * find out why. Swapping `Object.hasOwn` back for `in` does not let the value
 * through - it is compared against a function, and `sameShape` returns false
 * for a function fallback - so asserting only that the settings are unchanged
 * passes either way. What changes is the log: with `in`, a row keyed
 * `constructor` is refused *loudly*, warning about a setting that does not
 * exist, which sends whoever reads that line to a question with no answer. A
 * name that is not a setting is an unknown key and takes the unknown-key
 * route, which is to be ignored and say nothing.
 */
test("a row named after an Object prototype member is ignored, silently", () => {
  for (const key of ["constructor", "toString", "valueOf", "hasOwnProperty", "__proto__"]) {
    const { settings, warnings } = merge([{ key, value: 1 }]);
    assert.deepEqual(settings, SETTINGS_FALLBACK, `a row keyed ${key} changed the settings`);
    assert.equal(Object.hasOwn(settings, key), false, `a row keyed ${key} became an own property`);
    assert.deepEqual(warnings, [], `a row keyed ${key} was treated as a setting rather than ignored`);
  }
  // And nothing reached Object.prototype itself.
  assert.equal(({} as Record<string, unknown>).constructor, Object);
});

test("an unknown key is ignored without logging, and one good row still lands beside it", () => {
  const { settings, warnings } = merge([
    { key: "not_a_setting", value: 99 },
    { key: "daily_scan_cap", value: 7 },
  ]);
  assert.equal(settings.daily_scan_cap, 7);
  assert.deepEqual(warnings, []);
});

test("sameShape is what the two guards above are actually made of", () => {
  assert.equal(sameShape(false, true), true);
  assert.equal(sameShape("false", true), false);
  assert.equal(sameShape(5, 200), true);
  assert.equal(sameShape(-5, 200), false);
  assert.equal(sameShape(5, [] as unknown), false, "an array fallback must not be handled here");
});
