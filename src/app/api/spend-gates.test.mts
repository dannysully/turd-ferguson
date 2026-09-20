import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";

/**
 * Every **route** in this tree that can cause somebody to be billed, and what
 * stands in front of each one.
 *
 * That word is load-bearing and it was not here originally. This file said
 * "every door in this tree" and then walked `src/app/api` for `route.ts`,
 * which is a claim wider than its own denominator - the defect it was written
 * to catch, in itself. **Two `"use server"` actions bill Resend on an
 * anonymous post and are neither under `src/app/api` nor named `route.ts`**, so
 * this walk cannot see either of them however the lists below are edited.
 * `src/app/mail-doors.test.mts` is that half, and it derives its own set by
 * walking for `"use server"` rather than by naming the two.
 *
 * `ceilings.test.mts` now executes the ceilings themselves. That is one way
 * down a two-way street: it proves the guard decides correctly and says nothing
 * about which doors have it. Three routes call `checkCeilings`; **seven can
 * cause a paid call**, and the four that do not are each bounded by something
 * else entirely - a per-scan reservation, a compare-and-swap, a dollar cap read
 * somewhere else. Not one of those pairings was written down anywhere, so the
 * denominator was invisible: a new route that spends would have been in nobody's
 * list, passed tsc, passed the build, passed every test and passed the deploy.
 *
 * This is the same shape as `readiness.ts` before `d0898cf` - correct about
 * every key it named, while `SCAN_FROM_EMAIL` was read by four senders and on
 * no list at all. A census belongs in a test, not a comment.
 *
 * ## What is asserted, and why each part has to be here
 *
 * 1. **The set of spending routes is pinned.** A route that starts calling a
 *    paid entry point fails this file until somebody classifies it. That is the
 *    whole point: the failure is meant to be a question, not a bug report.
 * 2. **Every spending route is guarded or exempt, and every exemption names its
 *    own bound in its own source.** A written list that is merely a list rots
 *    into a blanket pass - `public-routes.test.mts` learned that. So each
 *    exemption is re-earned here by finding the thing it claims bounds it.
 * 3. **The kill switch's reach is measured, not assumed.** `scans_enabled` is
 *    documented in `settings-merge.ts` as the switch thrown in a hurry "by
 *    someone who will not then go and check that it took". It reaches three of
 *    the seven doors. That gap is real, it is Danny's call rather than mine
 *    (docs/blocked.md), and pinning it here means it cannot widen silently
 *    while the question is open.
 *
 * ## The honest limit of reading this as source
 *
 * A route "spends" if its own source calls one of the paid entry points below,
 * or imports a vendor client directly. That cannot see a paid call reached
 * through a module the route imports for another reason - which is exactly why
 * the import-graph version of this check was discarded: it reported `/full` and
 * `/opportunities` as spenders because something in their graph imports
 * `anthropic.ts`, when both only read rows that were already paid for. An
 * import is not a call. The named-entry-point list is narrower and true, and
 * the direct-import assertion below is what stops a route routing around it.
 */

const ROOT = join(import.meta.dirname, "..", "..", "..");
const API = join(ROOT, "src", "app", "api");

/**
 * The functions that bill somebody, or queue work that will.
 *
 * Every one is re-checked below against the module that exports it, so a rename
 * fails this file rather than silently emptying the list - the failure mode a
 * name-matching probe has by default.
 */
const PAID: Record<string, { module: string; what: string }> = {
  runScan: { module: "src/lib/scan/pipeline.ts", what: "every question against every engine" },
  readBrand: { module: "src/lib/scan/anthropic.ts", what: "one model call to name the brand" },
  completeUnlock: { module: "src/lib/scan/unlock.ts", what: "the gated pass, the biggest single spender here" },
  startBenchmark: { module: "src/lib/coverage/campaign.ts", what: "a campaign and its first reading" },
  addReading: { module: "src/lib/coverage/campaign.ts", what: "a further reading of a campaign" },
};

/** The two clients that actually put a request on the wire to a vendor. */
const VENDORS = ["@/lib/scan/anthropic", "@/lib/scan/dataforseo"];

/** Routes that pass through `checkCeilings` - the kill switch and four ceilings. */
const GUARDED = [
  "scan/start",
  "coverage-check",
  "coverage-check/[token]/rerun",
];

/**
 * Routes that spend and do not call `checkCeilings`, each with the bound that
 * stands in its place and a string that must still be findable in its source.
 *
 * `evidence` is not decoration. Without it this is a list of names, and a list
 * of names is satisfied by a route whose bound was deleted last week.
 */
const EXEMPT: Record<string, { why: string; evidence: RegExp; where: string }> = {
  "scan/[token]/confirm": {
    why:
      "Runs the free pass for a row that already passed the ceilings at /api/scan/start. " +
      "Its own bound is the compare-and-swap on status: the update matches only a row that " +
      "is not already queued, running or complete, so one row can start one pass however " +
      "many times it is confirmed.",
    evidence: /\.not\("status", "in", "\(queued,running,complete\)"\)/,
    where: "src/app/api/scan/[token]/confirm/route.ts",
  },
  "scan/[token]/questions": {
    why:
      "Rewrites one question at a time. Bounded per scan by a reservation taken inside a " +
      "database function against a fixed ceiling, rather than by the day's caps - a rewrite " +
      "is a fraction of a pass and the row it belongs to was already counted.",
    evidence: /p_ceiling: CALL_CEILING/,
    where: "src/app/api/scan/[token]/questions/route.ts",
  },
  "scan/[token]/unlock": {
    why:
      "Starts the gated pass. Bounded inside completeUnlock, which reads daily_cost_cap_usd " +
      "itself - including tracking runs, unlike the scan route, because it is protecting the " +
      "day's budget rather than a visitor's allowance.",
    evidence: /spentToday < settings\.daily_cost_cap_usd/,
    where: "src/lib/scan/unlock.ts",
  },
  "verify/[vtoken]": {
    why:
      "The second door to the same gated pass, for a visitor who had to prove their address " +
      "first. Same bound, same function, and it is on this list separately because a reader " +
      "who found only the unlock route would conclude there was one door.",
    evidence: /spentToday < settings\.daily_cost_cap_usd/,
    where: "src/lib/scan/unlock.ts",
  },
};

/**
 * Doors the kill switch actually reaches, measured on 20 September 2026.
 *
 * `scans_enabled` is read in exactly one place - `decideCeilings` - so a route
 * honours it if and only if it calls `checkCeilings`. The four exempt routes
 * above therefore do not, and the two most expensive things this system does
 * are both among them: a confirm runs the whole free pass, and an unlock runs
 * the gated one, which `spend.ts` calls the biggest single spender here.
 *
 * Pinned rather than fixed, because which way it should go is a product call
 * and not a bug: closing it turns the switch into something that strands a
 * visitor who has already typed their domain or already given their address.
 * docs/blocked.md carries the question. This assertion means the answer arrives
 * as a deliberate edit to this list.
 */
const KILL_SWITCH_REACHES = GUARDED;

// --------------------------------------------------------------- the walk

function routeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...routeFiles(p));
    else if (entry === "route.ts") out.push(p);
  }
  return out;
}

/** `src/app/api/scan/start/route.ts` -> `scan/start`, which is how a human names it. */
function routeName(file: string): string {
  return relative(API, file).replace(/\/route\.ts$/, "");
}

/**
 * Strip comments before looking for a call.
 *
 * Every one of these routes discusses the others in prose - `start/route.ts`
 * names `runScan`, `completeUnlock` and `checkCeilings` in comments without
 * calling any of them - so a bare substring search reads almost every route as
 * a spender. That is the `String.replace` lesson in a different coat: the
 * target has to be the code, not the paragraph above it.
 *
 * Trailing comments are stripped as well as whole-line ones, and that was found
 * by the injection harness rather than by reading: a case that appended
 * `// checkCeilings(` to a line was reported CAUGHT, by the right test, for
 * entirely the wrong reason - the sweep had matched a comment. A pass that
 * means nothing looks exactly like a pass that means something, which is why
 * the harness asks which assertion fired and not merely whether one did.
 *
 * The `[^:]` guard is so `https://` in a comment or a string does not take the
 * rest of its line with it.
 */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const files = routeFiles(API);
const routes = files.map((f) => ({ name: routeName(f), file: f, src: readFileSync(f, "utf8") }));

// --------------------------------------------------------------- the tests

test("the walk found the routes, so a zero here cannot pass as a clean sweep", () => {
  assert.ok(routes.length >= 15, `only ${routes.length} routes found; the walk is reading the wrong tree`);
  for (const name of [...GUARDED, ...Object.keys(EXEMPT)]) {
    assert.ok(
      routes.some((r) => r.name === name),
      `${name} is on a list here and is not a route any more`,
    );
  }
});

test("every paid entry point still exists under the name this file matches on", () => {
  for (const [fn, { module }] of Object.entries(PAID)) {
    const src = readFileSync(join(ROOT, module), "utf8");
    assert.match(
      src,
      new RegExp(`export (async )?function ${fn}\\b`),
      `${module} no longer exports ${fn}, so this sweep is matching a name nothing answers to`,
    );
  }
});

test("exactly the expected routes can cause a paid call", () => {
  const spenders = routes
    .filter((r) => {
      const c = code(r.src);
      const calls = Object.keys(PAID).some((fn) => new RegExp(`\\b${fn}\\s*\\(`).test(c));
      const vendor = VENDORS.some((v) => c.includes(`"${v}"`));
      return calls || vendor;
    })
    .map((r) => r.name)
    .sort();

  assert.deepEqual(
    spenders,
    [...GUARDED, ...Object.keys(EXEMPT)].sort(),
    "a route started or stopped being able to spend. Classify it: either it goes through " +
      "checkCeilings, or it goes on EXEMPT with the bound that stands in its place.",
  );
});

test("a guarded route really calls checkCeilings, and an exempt one really does not", () => {
  for (const name of GUARDED) {
    const r = routes.find((x) => x.name === name)!;
    assert.match(code(r.src), /\bcheckCeilings\s*\(/, `${name} is listed as guarded and does not call it`);
  }
  for (const name of Object.keys(EXEMPT)) {
    const r = routes.find((x) => x.name === name)!;
    assert.doesNotMatch(
      code(r.src),
      /\bcheckCeilings\s*\(/,
      `${name} is on the exempt list and now calls checkCeilings - move it to GUARDED`,
    );
  }
});

test("every exemption still has the bound it claims", () => {
  for (const [name, { evidence, where }] of Object.entries(EXEMPT)) {
    const src = readFileSync(join(ROOT, where), "utf8");
    assert.match(
      src,
      evidence,
      `${name} is exempt from the ceilings because of something in ${where}, and that is no ` +
        "longer there. It is now a door onto real spend with nothing in front of it.",
    );
  }
});

test("the kill switch is read in one place, so its reach is exactly the guarded set", () => {
  // If `scans_enabled` were read anywhere else, the reach below would be a
  // guess rather than a measurement - which is the failure this whole file is
  // about. Checked rather than asserted in prose.
  // Measured, not assumed - and the first version of this list was wrong in
  // both directions, which is the argument for the assertion existing. It named
  // `start/route.ts`, which only discusses the switch in a comment, and missed
  // the admin page, which renders it. One of the three acts on it.
  const readers = [
    // Defines it and refuses a value of the wrong type.
    "src/lib/scan/settings-merge.ts",
    // The only thing that ACTS on it. This is what makes the reach below a
    // measurement: a route honours the switch exactly when it calls into here.
    "src/lib/scan/ceilings-decide.ts",
    // Renders it on /admin/scans so somebody can see whether it is thrown.
    // A display, so it changes nothing about the reach - but it belongs on the
    // list, because a reader who found it and assumed otherwise would conclude
    // the switch was enforced somewhere it is not.
    "src/app/admin/scans/page.tsx",
  ];
  const found: string[] = [];
  const scan = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) scan(p);
      else if (/\.tsx?$/.test(entry) && !entry.endsWith(".test.mts")) {
        if (code(readFileSync(p, "utf8")).includes("scans_enabled")) found.push(relative(ROOT, p));
      }
    }
  };
  scan(join(ROOT, "src"));
  assert.deepEqual(
    found.sort(),
    readers.sort(),
    "scans_enabled is read somewhere new. The kill switch's reach is measured off the set of " +
      "routes that call checkCeilings, and that is only true while decideCeilings is the only " +
      "thing acting on it.",
  );

  assert.deepEqual(
    KILL_SWITCH_REACHES.slice().sort(),
    GUARDED.slice().sort(),
    "the kill switch reaches the routes that call checkCeilings and no others",
  );

  // Said as an assertion so it is not mistaken for an oversight: four doors
  // onto real spend do not honour it, and that is the open question.
  assert.equal(
    Object.keys(EXEMPT).length,
    4,
    "the number of spending doors the kill switch does not reach has changed - see docs/blocked.md",
  );
});
