import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import {
  NOT_REQUIRED,
  PRODUCTION_ONLY,
  RECOMMENDED,
  REQUIRED,
  isSet,
  readinessOf,
  type Requirement,
} from "./readiness-spec.ts";

/**
 * `readiness.ts` decides whether this site offers a live scan at all, and it
 * was one of the source files named by no test.
 *
 * The defect it turned out to carry was not in any of its assertions. Every
 * line of it was correct about the keys it named; what was wrong was the list.
 * `SCAN_FROM_EMAIL` was read by four senders and named by none of the three
 * lists, so a deployment with `RESEND_API_KEY` set and that one unset reported
 * ready with nothing missing while every piece of mail the product sends went
 * out from a domain this project does not own.
 *
 * That is the same species as `contact.test.mts`, which was correct in every
 * assertion and read one file while a second public form mailed us from
 * outside the measurement. So the test that matters here is the census: every
 * environment variable the tree reads is either a requirement, a
 * recommendation, or an exemption somebody wrote down and had to justify. A new
 * variable read by new code joins the check or fails this file.
 */

const SRC = new URL("../../../src", import.meta.url).pathname;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/**
 * Tests are excluded deliberately. `cron-schedule.test.mts` carries
 * `process.env.CRON_SECRET` inside a string it injects into a fixture, and a
 * census that counted it would be measuring its own fixtures.
 */
const SOURCES = walk(SRC).filter(
  (f) => /\.(ts|tsx|mts)$/.test(f) && !f.endsWith(".test.mts") && !f.endsWith("readiness-spec.ts"),
);

/** Every `process.env.NAME` read in the shipped tree, and where. */
function envReads(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const file of SOURCES) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/process\.env\.([A-Z][A-Z_0-9]*)/g)) {
      const where = found.get(m[1]) ?? [];
      where.push(file.slice(SRC.length + 1));
      found.set(m[1], where);
    }
  }
  return found;
}

const ALL_REQUIREMENTS: Requirement[] = [...REQUIRED, ...PRODUCTION_ONLY, ...RECOMMENDED];
const NAMED = new Set(ALL_REQUIREMENTS.map((r) => r.key));

// ────────────────────────────── the denominator ──────────────────────────────

test("the census is not empty, so a silent failure to read the tree fails loudly", () => {
  const reads = envReads();
  assert.ok(SOURCES.length > 100, `only ${SOURCES.length} source files were read`);
  assert.ok(reads.size > 10, `only ${reads.size} environment variables were found in the tree`);
});

test("every variable the tree reads is a requirement or a written-down exemption", () => {
  const unaccounted: string[] = [];
  for (const [key, where] of envReads()) {
    if (NAMED.has(key) || key in NOT_REQUIRED) continue;
    unaccounted.push(`${key} (read in ${where.join(", ")})`);
  }
  assert.deepEqual(
    unaccounted,
    [],
    "these are read by the shipped code and named by no readiness list - add them, or add a reason to NOT_REQUIRED",
  );
});

test("every key a list names is actually read somewhere, so nothing is guarded for its own sake", () => {
  const reads = envReads();
  const dangling = ALL_REQUIREMENTS.map((r) => r.key).filter((k) => !reads.has(k));
  assert.deepEqual(dangling, [], "named as a requirement and read by nothing");
});

test("no key is on two lists, and every one carries a reason", () => {
  const seen = new Set<string>();
  for (const r of ALL_REQUIREMENTS) {
    assert.ok(!seen.has(r.key), `${r.key} is on two lists, so it would be reported missing twice`);
    seen.add(r.key);
    assert.ok(r.why.trim().length > 10, `${r.key} has no usable reason`);
  }
  for (const key of Object.keys(NOT_REQUIRED)) {
    assert.ok(!seen.has(key), `${key} is both exempt and required`);
    assert.ok(NOT_REQUIRED[key].trim().length > 10, `${key} is exempt with no reason`);
  }
});

/**
 * The finding, asserted by name.
 *
 * Every sender in the tree falls back to a `resend.dev` address if this is
 * unset, and `resend.dev` is not a domain this project owns. Whether that mail
 * is delivered, refused or filtered is a question about a vendor and is not
 * claimed here; what is claimed is read off this repo alone - the product's own
 * transactional mail must not default to sending from somebody else's domain
 * with the readiness check reporting nothing wrong.
 */
test("the address our mail is sent from is on a list", () => {
  assert.ok(NAMED.has("SCAN_FROM_EMAIL"), "SCAN_FROM_EMAIL is read by every sender and named by no list");

  const senders = SOURCES.filter((f) => readFileSync(f, "utf8").includes("SCAN_FROM_EMAIL"));
  assert.ok(senders.length >= 3, `only ${senders.length} senders read SCAN_FROM_EMAIL - the census has narrowed`);
});

// ──────────────────────────────── the judging ────────────────────────────────

/** A complete environment, built from the lists rather than typed out. */
function full(): Record<string, string> {
  return Object.fromEntries(ALL_REQUIREMENTS.map((r) => [r.key, "set"]));
}

test("a complete environment is ready in both production and development", () => {
  for (const isProd of [true, false]) {
    const r = readinessOf(full(), isProd);
    assert.equal(r.ready, true, `not ready with everything set (production: ${isProd})`);
    assert.deepEqual(r.missingRequired, []);
    assert.deepEqual(r.missingRecommended, []);
  }
});

test("an empty environment is not ready, and says everything that is missing", () => {
  const r = readinessOf({}, true);
  assert.equal(r.ready, false);
  assert.equal(r.missingRequired.length, REQUIRED.length + PRODUCTION_ONLY.length);
  assert.equal(r.missingRecommended.length, RECOMMENDED.length);
});

test("Turnstile is required in production and not in development", () => {
  const env = full();
  for (const r of PRODUCTION_ONLY) delete env[r.key];

  assert.equal(readinessOf(env, false).ready, true, "development must not demand the bot check");
  const prod = readinessOf(env, true);
  assert.equal(prod.ready, false, "production without the bot check is not ready");
  assert.deepEqual(
    prod.missingRequired.map((r) => r.key).sort(),
    PRODUCTION_ONLY.map((r) => r.key).sort(),
  );
});

test("dropping any single required key drops readiness", () => {
  for (const r of REQUIRED) {
    const env = full();
    delete env[r.key];
    assert.equal(readinessOf(env, false).ready, false, `${r.key} can be missing and the funnel still goes live`);
  }
});

test("a recommendation never blocks a scan", () => {
  const env = full();
  for (const r of RECOMMENDED) delete env[r.key];
  assert.equal(readinessOf(env, true).ready, true, "a recommendation is blocking the funnel");
  assert.equal(readinessOf(env, true).missingRecommended.length, RECOMMENDED.length);
});

/**
 * These are pasted into a dashboard by hand. A trailing blank line or a stray
 * space is the commonest way one goes wrong, and the old check - `!value` -
 * read a single space as a credential. It reported ready and then failed auth
 * on every call, which is the funnel live and the scan dying at the reading
 * step: the exact outcome this module exists to prevent.
 */
test("a blank or whitespace-only value is missing, not present", () => {
  assert.equal(isSet(undefined), false);
  assert.equal(isSet(""), false);
  assert.equal(isSet(" "), false);
  assert.equal(isSet("\n"), false);
  assert.equal(isSet("\t  \n"), false);
  assert.equal(isSet(" x "), true, "a real value with padding is still a value");

  const env = full();
  env[REQUIRED[0].key] = "   ";
  const r = readinessOf(env, false);
  assert.equal(r.ready, false, "a whitespace-only credential reported the funnel ready");
  assert.deepEqual(r.missingRequired.map((x) => x.key), [REQUIRED[0].key]);
});

// ───────────────────────── the margin stays server side ─────────────────────────

/**
 * `engine-costs.ts` holds what each call costs us. It is deliberately not split
 * for testability the way the rest of this sweep was: a pure module carrying
 * the margin is one `import` away from a client component and a prospect
 * reading it out of a bundle. So it is checked from the outside instead.
 */
test("nothing that reaches the browser imports our cost basis", () => {
  const costFile = join(SRC, "lib/scan/engine-costs.ts");
  const cost = readFileSync(costFile, "utf8");
  assert.match(cost, /^import "server-only";/m, "engine-costs.ts no longer declares itself server-only");

  const importers = SOURCES.filter((f) => {
    if (f === costFile) return false;
    return /from "[^"]*engine-costs(\.ts)?"/.test(readFileSync(f, "utf8"));
  });
  assert.ok(importers.length > 0, "nothing imports engine-costs at all - this probe has gone blind");

  for (const f of importers) {
    const text = readFileSync(f, "utf8");
    assert.ok(
      !/^\s*["']use client["']/m.test(text),
      `${f.slice(SRC.length + 1)} is a client component and imports our cost basis`,
    );
  }
});
