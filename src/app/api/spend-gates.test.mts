import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";

import { PAID, apiRoutes, code, mailSenders, missingEntryPoints, spendingRoutes, spends, vendors } from "./spenders.mts";

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
 * about which doors have it. Three routes call `checkCeilings`; **eight can
 * cause a paid call**, and the five that do not are each bounded by something
 * else entirely - a per-scan reservation, a compare-and-swap, a dollar cap read
 * somewhere else, a send ceiling counted in a database function. Not one of
 * those pairings was written down anywhere, so the
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
 *    the eight doors. That gap is real, it is Danny's call rather than mine
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
 *
 * ## The third vendor, and why the denominator left this file
 *
 * `VENDORS` was typed here, and its own comment called them "the two clients
 * that actually put a request on the wire to a vendor". There are three.
 * **Resend bills per message**, which is the premise `mail-doors.test.mts` is
 * built on and which blocked.md 24 states in as many words, and the module
 * that sends was not on this list because whoever wrote it was thinking about
 * the scan pipeline. So `/api/scan/[token]/resend` - under `src/app/api`,
 * named `route.ts`, squarely inside this walk, and existing only to put a
 * second message on a vendor's bill - passed tsc, the build, this file and the
 * deploy while appearing in neither list here.
 *
 * That is this file's own species caught in this file for the second time. The
 * first was the header, which claimed "every door" over a walk that could only
 * see routes; this was a typed denominator *inside* a rule, written from the
 * instances in front of whoever wrote it.
 *
 * The fix is not a longer list. `paid-get.test.mts` was answering the same
 * question two files away with a denominator of its own, derived off the two
 * *guard* names, and could see five of the eight - it missed
 * `scan/[token]/confirm`, which runs the whole free pass. **Two copies of one
 * denominator, each blind somewhere the other was not.** So the set moved to
 * `spenders.mts`, a helper both import, and its header carries the whole
 * measurement. What stays here is the question this file asks: what stands in
 * front of each door.
 *
 * `mail-doors.test.mts` still does not merge in, for the reason it gives: it
 * asks what bounds the *rate* a stranger can open a door, this asks whether a
 * door reaches `checkCeilings`. A route appearing in both is correct. What
 * would be wrong is a door appearing in neither, which is what just happened.
 */

const ROOT = join(import.meta.dirname, "..", "..", "..");
const API = join(ROOT, "src", "app", "api");

const MAIL_SENDERS = mailSenders(ROOT);
const VENDORS = vendors(ROOT);

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
  /**
   * The door the typed vendor list could not see. It spends on Resend rather
   * than on a model, which is why no ceiling is the right bound for it: the
   * scan behind it was already counted at `/api/scan/start`, and what this
   * route adds is a second copy of one message.
   *
   * Two bounds, and the evidence is the volume one rather than the cooldown.
   * Sixty seconds is a bound on a double click; `note_verify_send` is the
   * bound on somebody holding the public token - which is in every shared scan
   * link - and calling this on a timer. Without it the route had none, and
   * sixty seconds apart forever is about fourteen hundred messages a day to
   * one address past a cap that reads five.
   */
  "scan/[token]/resend": {
    why:
      "Sends the verification email again for a scan row that passed checkCeilings at " +
      "/api/scan/start. Bounded by a sixty-second cooldown on verify_sent_at and, because " +
      "that only stops a double click, a volume ceiling counted in note_verify_send against " +
      "unlock_emails_per_day. It fails closed, unlike the unlock cap: a refusal here costs a " +
      "second copy of a message already sent once.",
    evidence: /rpc\("note_verify_send"/,
    where: "src/app/api/scan/[token]/resend/route.ts",
  },
  /**
   * The door that reached a vendor one hop away, and so was invisible to the
   * derived denominator as well as to the typed one it replaced.
   *
   * `/api/scan/[token]/email-report` takes an address while a scan is running
   * and mails the free result when the pass ends. It imports `report-mail.ts`,
   * which imports `verify-email`, which imports Resend - so `mailSenders` never
   * listed it and `importsModule` could not match it. It passed this sweep and
   * `paid-get` green on the day it was written. `sendRequestedReport` is a
   * named paid entry point now, which is what makes it visible here.
   *
   * No ceiling, and that is right rather than an omission: the scan behind it
   * was counted at `/api/scan/start`, and what this route adds is one message
   * per scan row for the whole life of that row. The bound is not a rate at
   * all - it is a compare-and-swap, so posting this a thousand times writes one
   * column and sends one message.
   */
  "scan/[token]/email-report": {
    why:
      "Records an address on a scan row that passed checkCeilings at /api/scan/start, and " +
      "mails that row's free result once. Bounded by the claim inside sendRequestedReport: " +
      "report_email_sent_at is stamped by a filtered update that hands the address back only " +
      "to the caller that stamped it, so the pipeline and this route cannot both send and " +
      "neither can send twice. One message per scan, ever.",
    evidence: /\.is\("report_email_sent_at", null\)/,
    where: "src/lib/scan/report-mail.ts",
  },
  /**
   * 24 September 2026. The walkthrough request mails us, never the caller,
   * and starts no scan: the only spend is one Resend message to our own inbox.
   * Bounded twice - a unique (scan, email, kind) row, so a repeat alerts
   * nobody, and a per-IP ceiling on requests a day.
   */
  "scan/[token]/walkthrough": {
    why:
      "Sends one internal alert per new (scan, email, kind) request, to our own inbox, and starts " +
      "no scan. Bounded by the unique upsert - a duplicate inserts nothing and sends nothing - and " +
      "by PER_IP_PER_DAY requests from one hashed address.",
    evidence: /const PER_IP_PER_DAY = \d+/,
    where: "src/app/api/scan/[token]/walkthrough/route.ts",
  },
};

/**
 * Doors the kill switch actually reaches, measured on 20 September 2026.
 *
 * `scans_enabled` is read in exactly one place - `decideCeilings` - so a route
 * honours it if and only if it calls `checkCeilings`. The five exempt routes
 * above therefore do not, and the two most expensive things this system does
 * are both among them: a confirm runs the whole free pass, and an unlock runs
 * the gated one, which `spend.ts` calls the biggest single spender here.
 *
 * The fifth joined the list on 20 September, when the vendor denominator was
 * derived rather than typed. It does not change the shape of the question -
 * `scan/[token]/resend` spends pennies on mail rather than dollars on models -
 * but it changes the count blocked.md 22 is written around, and the count is
 * there precisely so a door cannot join quietly.
 *
 * Pinned rather than fixed, because which way it should go is a product call
 * and not a bug: closing it turns the switch into something that strands a
 * visitor who has already typed their domain or already given their address.
 * docs/blocked.md carries the question. This assertion means the answer arrives
 * as a deliberate edit to this list.
 */
const KILL_SWITCH_REACHES = GUARDED;

// --------------------------------------------------------------- the walk

/**
 * The walk, the comment strip and the spend test all live in `spenders.mts`
 * now. What is left here is this file's own question.
 */
const routes = apiRoutes(ROOT);

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

/**
 * The floor under the derived half, without which an empty walk reads as a
 * clean sweep.
 *
 * A `MAIL_SENDERS` that came back empty - a renamed package, a changed import
 * idiom, a walk pointed at the wrong directory - would silently restore the
 * exact blindness this was written to remove, and every assertion below would
 * still pass. So the walk is made to prove it can still find the module it is
 * about before its emptiness is believed.
 */
test("the derived vendor walk still finds the mail senders", () => {
  assert.ok(
    MAIL_SENDERS.length >= 3,
    `only ${MAIL_SENDERS.length} mail senders found; the walk has stopped seeing Resend: ${MAIL_SENDERS.join(", ")}`,
  );
  assert.ok(
    MAIL_SENDERS.includes("@/lib/scan/verify-email"),
    "verify-email is no longer read as a mail sender, and it is the one a route imports",
  );
  for (const v of VENDORS) {
    const file = join(ROOT, "src", v.replace(/^@\//, "") + ".ts");
    assert.ok(
      readFileSync(file, "utf8").length > 0,
      `${v} is on the vendor list and is not a module any more`,
    );
  }
});

/**
 * The detector shown finding what it is for, on text written here.
 *
 * A clean tree makes the set below correct and so does a detector that has
 * stopped matching - the state every sweep in this repo has been caught in at
 * least once. These three shapes are the ones the first version of `spends`
 * could not see, and two of them were invisible *by construction* rather than
 * by an oversight in a list:
 *
 *  - a route importing the vendor package itself, which `mailSenders` would
 *    list under the route's own specifier - and no file's source contains its
 *    own import path, so the set grew and the answer stayed `false`;
 *  - a route importing a vendor by a relative path, which this tree uses on
 *    purpose in two places and tells you not to tidy back.
 *
 * Found by asking the refill question of this file's own helper on the day it
 * was written, which is the practice that has paid twelve times here.
 */
test("the spend detector sees a vendor reached three different ways", () => {
  const v = vendors(ROOT);

  assert.ok(
    spends('import { Resend } from "resend";\nexport async function POST() {}', v),
    "a route importing Resend itself does not read as a spender - the most direct spend there is",
  );
  assert.ok(
    spends('import { readBrand } from "../../../lib/scan/anthropic";\nexport async function POST() {}', v),
    "a vendor imported by a relative path does not read as a spender",
  );
  assert.ok(
    spends('import { readBrand } from "@/lib/scan/anthropic";\nexport async function POST() {}', v),
    "a vendor imported by its @/ specifier does not read as a spender",
  );
});

/**
 * And the other way, which is what makes the three above mean anything: a
 * detector that answered `true` for everything would satisfy all of them.
 *
 * Its own test, not a fourth assertion above - the injection harness reports
 * which named subtest fired, so a case landing in the wrong branch is
 * indistinguishable from one landing in the right branch otherwise.
 */
test("the spend detector still refuses a route that only reads rows", () => {
  const v = vendors(ROOT);

  assert.ok(
    !spends('import { supabaseAdmin } from "@/lib/supabase/admin";\nexport async function GET() {}', v),
    "a route that only reads rows reads as a spender, so the detector answers true for everything",
  );
  // The comment strip, on the shape that is not a call. `start/route.ts`
  // discusses runScan and completeUnlock in prose without calling either.
  assert.ok(
    !spends('// import { Resend } from "resend";\n/* runScan( */\nexport async function GET() {}', v),
    "prose describing a paid call reads as one",
  );
});

test("every paid entry point still exists under the name this file matches on", () => {
  assert.deepEqual(
    missingEntryPoints(ROOT),
    [],
    "a paid entry point was renamed, so the spend walk is matching a name nothing answers to",
  );
  assert.ok(Object.keys(PAID).length >= 5, "the paid entry points emptied out");
});

test("exactly the expected routes can cause a paid call", () => {
  const spenders = spendingRoutes(ROOT).map((r) => r.name).sort();

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

  /**
   * Said as an assertion so it is not mistaken for an oversight: six doors onto
   * real spend do not honour the kill switch, and that is the open question.
   *
   * **Six since 20 September 2026, and the sixth does not move the decision.**
   * `scan/[token]/email-report` records an address for a scan that is already
   * running and paid for, and sends one message per row for the life of that
   * row. `scans_enabled` stops new scans; refusing this one would strand a
   * visitor mid-scan to save nothing, which is the same reading the resend door
   * got when it joined this list a few hours earlier.
   *
   * What the count is for is that a door cannot join quietly, and this one
   * tried: it reached its vendor one hop away and was green in this sweep and
   * in `paid-get` until `sendRequestedReport` was named in `spenders.mts`.
   */
  assert.equal(
    Object.keys(EXEMPT).length,
    // Seven since 24 Sep 2026: the walkthrough alert, which mails only us.
    7,
    "the number of spending doors the kill switch does not reach has changed - see docs/blocked.md",
  );
});
