import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { code, sourceFiles } from "../source-read.mts";

/**
 * A campaign reading can never be claimed, so the nightly purge takes its
 * prose - and `/coverage-check` used to promise the opposite.
 *
 * `reading.ts` states this in its own header, as the reason the reading page
 * deliberately renders no answer text: "a reading is never unlocked - it takes
 * no email, so nothing ever sets `unlocked_at`. Every reading's prose is
 * therefore gone a week after it was taken." That sentence is a claim about
 * three files none of which it can see, and nothing held any of it.
 *
 * ## What it cost
 *
 * `/coverage-check` told a visitor: "We ask the same engines a free scan reads
 * - ... - **keep the answers word for word**, and check every source they cite
 * against the coverage you upload."
 *
 * We do not keep them. A benchmark reading is a `scans` row with a
 * `campaign_id`; there is no email field, no unlock route and no verify link
 * on that path, so `completeUnlock` - the only writer of `unlocked_at` in the
 * tree - is unreachable from it. The purge then selects precisely
 * `unlocked_at is null` past `response_retention_days` and clears
 * `response_text`, with no campaign exclusion anywhere in the query. Seven
 * days after a reading, its prose is gone; and `reading.ts` never rendered a
 * word of it to begin with. The page promised something the visitor could
 * never read, on the one surface that then deletes it.
 *
 * That clause is gone (20 Sep 2026). **This file is not the fix - it is what
 * stops the sentence coming back while the facts under it still hold**, and
 * what makes the facts fail loudly if somebody changes them on purpose.
 * Whether a benchmark reading *should* be exempt from the purge is a retention
 * decision with a privacy-policy line attached, so it is blocked.md 30 rather
 * than mine.
 *
 * ## Why this is distinct from blocked.md 29
 *
 * 29 is the wording call over thirteen surfaces that say "verbatim" or "word
 * for word" about text that is assembled and stripped. There the claim is
 * generous and the words a reader saw do survive, which is why it is Danny's.
 * Here the claim was flatly false for this product, which is the case
 * `67bc96d` and `486d63a` both settled as takeable unattended: stop saying the
 * untrue thing, do not invent a new promise.
 *
 * ## Read from source, and why
 *
 * `purge-responses/route.ts` and `unlock.ts` both import `server-only` and
 * neither can be loaded under `node --test`. The properties here are about
 * which query is written and which module writes a column, not about a return
 * value, so a structural check is the honest instrument rather than a
 * second-best one - `constant-time.test.mts` records the same reasoning.
 * Comments are stripped first: every file involved discusses `unlocked_at` in
 * prose, and this file's own header quotes the query it is checking for.
 */

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PURGE = "src/app/api/cron/purge-responses/route.ts";
const UNLOCK = "src/lib/scan/unlock.ts";
const READING = "src/lib/coverage/reading.ts";
const CAMPAIGN = "src/lib/coverage/campaign.ts";

function read(rel: string): string {
  return code(readFileSync(join(ROOT, rel), "utf8"));
}

test("exactly one module in the tree writes unlocked_at", () => {
  // The premise everything below rests on. If a second writer appears, "a
  // reading is never unlocked" stops being a fact about one unreachable
  // function and becomes a claim about however many there now are.
  const writers = sourceFiles(ROOT).filter((f) =>
    /unlocked_at\s*:\s*new Date\(\)\.toISOString\(\)/.test(read(f)),
  );
  assert.deepEqual(writers, [UNLOCK], `unlocked_at is written in: ${writers.join(", ")}`);
});

test("nothing on the campaign path can reach the one writer", () => {
  // `completeUnlock` is the export that stamps it. A benchmark that called it
  // would give readings a claim path, which would make the removed copy true
  // again - so this failing is the signal to re-read blocked.md 30, not a bug.
  assert.ok(
    !read(CAMPAIGN).includes("completeUnlock"),
    `${CAMPAIGN} reaches completeUnlock, so a reading can now be claimed`,
  );
  assert.ok(
    !read(READING).includes("completeUnlock"),
    `${READING} reaches completeUnlock, so a reading can now be claimed`,
  );
});

test("the purge takes every unclaimed scan, with no exemption for a reading", () => {
  const purge = read(PURGE);
  assert.match(
    purge,
    /\.is\("unlocked_at",\s*null\)/,
    "the purge no longer selects on unlocked_at, so what it clears has moved",
  );
  // The absence is the property. A campaign filter here would mean readings
  // keep their prose, and the sentence removed from /coverage-check could go
  // back - which is exactly why its absence has to be asserted rather than
  // assumed.
  assert.ok(
    !/campaign_id/.test(purge),
    "the purge now knows about campaigns - re-read blocked.md 30 before trusting the copy on /coverage-check",
  );
});

test("the purge clears the prose and keeps the measurement", () => {
  // What makes the benchmark's "dated, stored and re-runnable" still true
  // after the transcript is gone: the columns the reading page reads are
  // never touched by this job.
  const purge = read(PURGE);
  assert.ok(purge.includes("response_text"), "the purge no longer names the column it clears");
  for (const kept of ["brand_named", "answered"]) {
    assert.ok(!purge.includes(kept), `the purge now touches ${kept}, which the reading page reads`);
  }
});

test("the reading page still renders no answer prose", () => {
  // The other half of why the claim was false: even inside the retention
  // window a visitor could not read one. `reading.ts` selects the measured
  // columns off scan_answers and never response_text.
  assert.ok(
    !read(READING).includes("response_text"),
    `${READING} now reads response_text - if a reading shows its answers, the /coverage-check copy can be revisited`,
  );
});

test("no surface still tells a benchmark visitor its answers are kept", () => {
  // Scoped to the two campaign-facing pages on purpose. The claim elsewhere is
  // about the scan report, which IS readable and IS kept once unlocked - that
  // is blocked.md 29's wording call and this file decides nothing about it.
  const pages = [
    "src/app/coverage-check/page.tsx",
    "src/app/coverage-check/[token]/page.tsx",
  ];
  const offenders: string[] = [];
  for (const page of pages) {
    for (const m of read(page).matchAll(/[^.]*\b(?:word for word|verbatim)\b[^.]*/gi)) {
      const sentence = m[0].replace(/\s+/g, " ").trim();
      // "the same questions, word for word" is a claim about the QUESTIONS and
      // it is true - `prompts.test.mts` pins the five strings. What may not
      // come back is the claim about the ANSWERS.
      if (/\bquestions?\b/i.test(sentence)) continue;
      offenders.push(`${page}: ${sentence}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "a campaign surface promises the answers are kept, and the purge clears them at the retention window:\n" +
      offenders.join("\n"),
  );
});

test("the retention window the copy was measured against is still one setting", () => {
  // The number itself is blocked.md 26. What matters here is only that there
  // is one knob and the purge reads it, so "a week after it was taken" cannot
  // quietly become "never" without this file noticing.
  assert.match(
    read(PURGE),
    /response_retention_days/,
    "the purge no longer reads the retention setting",
  );
  const migrations = join(ROOT, "supabase", "migrations");
  const seeded = readdirSync(migrations)
    .filter((f) => f.endsWith(".sql"))
    .some((f) => readFileSync(join(migrations, f), "utf8").includes("response_retention_days"));
  assert.ok(seeded, "no migration seeds response_retention_days");
});
