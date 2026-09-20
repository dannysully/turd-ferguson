import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { blankComments, code, sourceFiles } from "../source-read.mts";

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
  // Scoped to the two campaign-facing pages on purpose: on those the claim may
  // not appear AT ALL, because a reading can never be claimed. Everywhere else
  // the claim is allowed with a bound, which is the rule below this one.
  //
  // **That sentence used to read "the claim elsewhere is about the scan report,
  // which IS readable and IS kept once unlocked", and it was a universal about
  // the tree that nothing executed.** It was false on /about, whose second
  // measurement rule - on the page whose own doc comment calls the rules "the
  // point of the page" - said the response text is "kept per question" with no
  // condition at all. The narrowing was written from a guess about the other
  // surfaces rather than from a reading of them, which is the species this
  // repo keeps paying for.
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

/**
 * Every surface in the tree that promises the answer TEXT is kept, and whether
 * it names the condition the purge actually applies.
 *
 * ## Why this is not `verbatim-claims.test.mts`
 *
 * That file walks the same pages and asks a different question of them: is the
 * stored text *untouched* (blocked.md 29's wording call). It reads the word
 * `verbatim` and never reads the verb in front of it. **Whether the text is
 * KEPT is a second claim living inside the same sentence, and nothing walked
 * for it** - which is how /about's rule 2 sat beside /legal's "deleted after
 * seven days if nobody claims the scan" for as long as both were published.
 * Two files disagreeing about one fact, one of them a marketing page.
 *
 * ## The pattern, and why it is a pair rather than a word
 *
 * A keeping verb alone matches `could not store the answers` in a throw and
 * `the clusters you keep` on the homepage FAQ; an answer-text noun alone is
 * every line of `engines.ts`. The claim is the two together inside one
 * sentence, in either order - `[^.!?]` is the sentence bound, so a keeping
 * verb in one sentence and the noun in the next is not a promise.
 *
 * ## Read flattened, not line by line
 *
 * A per-line walk was written first and then asked what it could not see,
 * which is the refill this repo runs on its own sweeps. The answer was copy
 * concatenated across lines - `ResultView.tsx` writes its copy as one
 * concatenated string and `verbatim-claims` records that a single line there
 * can carry two claims. **Measured on 20 Sep 2026 the two walks agree at five,
 * so nothing is caught by the change today**; it is here because the direction
 * the per-line walk fails in is the flattering one, and a claim broken over
 * two lines to fit the formatter would have read as a clean tree.
 *
 * Comments are blanked first for the reason `verbatim-claims` needs the same
 * cut: this very header pairs "kept" with "the answers" several times.
 */
const KEEPING =
  /\b(?:stores?|stored|storing|keeps?|kept|keeping|saved?|retain(?:s|ed)?)\b[^.!?]{0,80}?\b(?:verbatim|word for word|response text|full text|transcript|the answers?|whole answer|what each engine said)\b|\b(?:verbatim|word for word|response text|full text|transcript|the answers?|whole answer|what each engine said)\b[^.!?]{0,80}?\b(?:stores?|stored|storing|keeps?|kept|keeping|saved?|retain(?:s|ed)?)\b/i;

/**
 * Where the claim is published and what earns it, `spend-gates`' shape.
 *
 * `holds` is the point: each entry re-earns its own measurement off source, so
 * the day the thing excusing a site changes, this fails rather than going on
 * quietly excusing it. An entry keyed to a FILE would excuse whatever lands in
 * that file next, so each is keyed to the string that makes the claim.
 */
const RETENTION_CLAIMS: {
  file: string;
  needle: string;
  why: string;
  holds: (src: string) => boolean;
}[] = [
  {
    file: "src/app/about/page.tsx",
    needle: "Store the whole answer",
    why: "a rule card's three-word title; the bound is in the body of the same RULES entry, immediately below it",
    holds: (src) => {
      const at = src.indexOf('title: "Store the whole answer"');
      return at >= 0 && /^[^}]*\bnobody claims\b/.test(src.slice(at));
    },
  },
  {
    file: "src/app/about/page.tsx",
    needle: "Full response text and source lists are kept",
    why: "measurement rule 2, and it names the condition: unclaimed scans are purged, sources and measurements stay",
    holds: (src) => /kept per question[^"]*\bOn a scan nobody claims\b[^"]*\bpurged\b/.test(src),
  },
  {
    file: "src/app/compare/page.tsx",
    needle: "Stores the verbatim answer behind every reading",
    why:
      "a feature row under a column that is the alwayscited TIER, not a scan this tree runs - " +
      "nothing here creates a paid-tier scan, so its retention is not this purge (blocked.md 32)",
    holds: (src) => /COLUMNS[^=]*=\s*\[\{\s*key:\s*"us",\s*label:\s*<TierName tier="cited"/.test(src),
  },
  {
    file: "src/components/scan/HeroSequence.tsx",
    needle: "The answer is stored word for word",
    why:
      "an act of the waiting sequence describing the alwaystracked TIER, not the free scan running behind it " +
      "- same paid-path question as /compare (blocked.md 32)",
    holds: (src) => {
      const at = src.indexOf('body: "The answer is stored word for word');
      return at >= 0 && /tier:\s*"tracked"[^}]*$/.test(src.slice(0, at));
    },
  },
  {
    file: "src/lib/scan/pipeline.ts",
    needle: "could not store the answers",
    why: "not a published surface - the message of a thrown Error on the insert path",
    holds: (src) => /throw new Error\(`could not store the answers/.test(src),
  },
];

/** Every claim in one file, flattened so a sentence broken over lines is one match. */
function keepingClaims(rel: string): string[] {
  const flat = blankComments(readFileSync(join(ROOT, rel), "utf8")).replace(/\s*\n\s*/g, " ");
  return [...flat.matchAll(new RegExp(KEEPING.source, "gi"))].map((m) => m[0].replace(/\s+/g, " "));
}

test("every surface promising the answer text is kept is on the list", () => {
  const found = new Map<string, string[]>();
  let total = 0;
  for (const rel of sourceFiles(ROOT)) {
    const claims = keepingClaims(rel);
    if (!claims.length) continue;
    found.set(rel, claims);
    total += claims.length;
  }

  // A floor, because the walk narrowing to nothing reads exactly like a clean
  // tree. Five sites on 20 Sep 2026, four of them published copy.
  assert.ok(total >= 5, `the walk found ${total} keeping-claims, was 5 - it has narrowed`);

  /**
   * By COUNT per file as well as by membership.
   *
   * Membership alone is a file-keyed exemption, which excuses whatever lands
   * in that file next - /about already carries two of these, so "about is on
   * the list" would wave through a third. The count is what makes a new claim
   * inside an already-listed file fail.
   */
  const unlisted: string[] = [];
  for (const [file, claims] of found) {
    const recorded = RETENTION_CLAIMS.filter((c) => c.file === file).length;
    if (!recorded) unlisted.push(`${file} is not on the list: ${claims.join(" | ")}`);
    else if (claims.length !== recorded) {
      unlisted.push(`${file} makes ${claims.length} keeping-claims, ${recorded} recorded: ${claims.join(" | ")}`);
    }
  }

  assert.deepEqual(
    unlisted,
    [],
    "a surface promises the answer text is kept and nothing on the list bounds it - the purge clears\n" +
      "response_text on every scan with unlocked_at null, campaign readings included:\n" +
      unlisted.map((f) => `  ${f}`).join("\n"),
  );
});

test("every listed surface still earns the reason it is listed under", () => {
  const broken: string[] = [];
  for (const c of RETENTION_CLAIMS) {
    const src = blankComments(readFileSync(join(ROOT, c.file), "utf8"));
    if (!src.includes(c.needle)) broken.push(`${c.file}: "${c.needle}" is gone - drop the entry`);
    else if (!c.holds(src)) broken.push(`${c.file}: "${c.needle}" no longer holds: ${c.why}`);
  }
  assert.deepEqual(broken, [], broken.join("\n"));
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
