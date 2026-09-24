import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

/**
 * Every surface that promises the stored answer is the engine's own words.
 *
 * blocked.md 29 is the open wording call: five surfaces say "verbatim" and
 * "word for word", and what `response_text` holds is assembled, stripped of
 * link URLs, and on the local-business path has panel titles prepended. That
 * item is Danny's - the claim is generous rather than false, which AGENTS.md
 * puts outside "ship it rough". **This file decides nothing about the
 * wording.** It fixes the denominator underneath it, which was wrong.
 *
 * **It is not five surfaces. It was fourteen sites, and the five the census
 * found are exactly the five a page walk can reach** - because it read the
 * rendered pages, and three whole classes of published copy on this site are
 * not pages. Thirteen now: `/coverage-check`'s came off on 20 Sep for a reason
 * that is not the wording call, recorded above the count below.
 *
 * - **The live scan screens.** `ResultView.tsx`, `ScanFlow.tsx` and
 *   `HeroSequence.tsx` render only behind a running scan, so no prerender and
 *   no capture reaches them. Four sites.
 * - **`/coverage-check/[token]`.** Recorded BLOCKED in the capture manifest -
 *   it needs a database and 404s without one (blocked.md 19). Two sites.
 * - **The transactional email.** `email-render.ts` is copy this product sends
 *   to a visitor's inbox, and no sweep on this site has ever read it for a
 *   claim. Three sites.
 *
 * That is the same finding arriving for the third time, and it is worth
 * naming as a rule rather than a coincidence: **a claim sweep that walks
 * rendered pages is blind to every published surface that is not one.**
 * `745832a` found the head, because a meta description lives in an attribute.
 * `77bb364` found the share card, because it is a PNG. This is the mail, the
 * screens behind the funnel, and the one route the capture cannot render. For
 * a claim published across all four classes, **the source tree is the
 * denominator and the page walk is a subset of it** - which is why this file
 * reads source where `price-claims` and `white-label-claims` read pages.
 *
 * **And the recorded page list was stale in the other direction too.**
 * blocked.md 29 names `/alwaystracked` twice; neither string is on that page
 * any more, and `PackagePage.tsx` and `config/pricing.ts` carry no instance at
 * all. Checked 20 Sep 2026 against the built pages and the source. The two
 * entries it lists for `/alwaysmentioned` and `/alwayscited` are a different
 * and weaker sentence - "Every source behind every answer" - which claims
 * completeness of the source list rather than fidelity of the text, and is
 * true. They are not in this set.
 *
 * **What this holds, while the wording waits.** The set may not grow or shrink
 * silently. A fifteenth instance fails and has to be added here, so it lands
 * in the fix when the fix is decided; and if the fix narrows the pages and
 * leaves the mail and the scan screens saying it - which is exactly what a
 * page-shaped census invites - the count drops and this fails naming the
 * files still carrying it. A blocked item whose scope nothing measures is an
 * item that gets half-fixed.
 *
 * **What this cannot see:** whether the claim is fair. That is blocked.md 29
 * and it is his. Nor can it read a claim phrased some other way - it matches
 * three known forms, so a new surface saying "exactly as the engine wrote it"
 * is outside it. The forms are pinned rather than guessed at because a wider
 * pattern reported the source-list claim, which is a different promise.
 */

const ROOT = join(import.meta.dirname, "..", "..");

/**
 * The three phrasings in use. Narrow on purpose: "every source behind every
 * answer" is a claim about the source list being complete, not about the text
 * being untouched, and it is true - folding it in here would put a true claim
 * inside a set that exists to scope an overstated one.
 */
const CLAIM = /\bverbatim\b|\bword for word\b|\bfull response text\b/i;

/**
 * Where the claim is published, and **why the page sweeps cannot see it** -
 * the `{ why, evidence, where }` shape `spend-gates.test.mts` established. An
 * entry with no reason is the prose an exemption used to be.
 */
const SURFACES: { file: string; sites: number; why: string }[] = [];

// ----------------------------------------------------------------- probes

/**
 * Source with its prose removed.
 *
 * Load-bearing rather than tidy, and this file is the proof: the paragraph
 * above quotes "verbatim" and "word for word" repeatedly while explaining
 * them, `engines.ts` discusses the claim in `stripMarkdownLinks`' header, and
 * `pipeline.ts` names it too. A rule reading raw source reports all of them
 * and the count means nothing. Paid five times in this tree already, once
 * inside the very test written to stop it (`0a3aa9e`).
 */
function code(src: string): string {
  const out: string[] = [];
  let open = false;
  for (const line of src.split("\n")) {
    const t = line.trim();
    if (open) {
      if (t.includes("*/")) open = false;
      continue;
    }
    if (t.startsWith("{/*") || t.startsWith("/*")) {
      if (!t.includes("*/")) open = true;
      continue;
    }
    if (t.startsWith("*") || t.startsWith("//")) continue;
    out.push(line);
  }
  return out.join("\n");
}

/** Every source file in the tree, so the denominator is walked and not typed. */
function sourceFiles(): string[] {
  const out: string[] = [];
  (function walk(dir: string, prefix: string) {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${prefix}${entry.name}`;
      if (entry.isDirectory()) walk(join(dir, entry.name), `${rel}/`);
      else if (/\.(tsx?|mts)$/.test(entry.name) && !entry.name.includes(".test.")) out.push(rel);
    }
  })("src", "src/");
  return out;
}

/**
 * The claim's sites in one file, counted by MATCH rather than by line.
 *
 * It counted lines first and the injection harness caught it: adding a second
 * phrasing to a line that already carried one came back MISSED, because one
 * line with two claims on it scored the same as one line with one. A count
 * that cannot rise is a count that cannot notice the thing it exists to
 * notice, and `ResultView.tsx` writes its copy as one concatenated string, so
 * a line here genuinely can hold two.
 */
function sitesIn(rel: string): number {
  const src = code(readFileSync(join(ROOT, rel), "utf8"));
  return [...src.matchAll(new RegExp(CLAIM.source, "gi"))].length;
}

// ------------------------------------------------------------------ rules

test("no surface publishes the claim that is not on the list", () => {
  const files = sourceFiles();
  assert.ok(files.length >= 40, `expected 40+ source files, walked ${files.length}`);

  const listed = new Set(SURFACES.map((s) => s.file));
  const unlisted = files.filter((f) => !listed.has(f) && sitesIn(f) > 0);

  assert.deepEqual(
    unlisted,
    [],
    "a surface claims the answer is stored word for word and is outside blocked.md 29's scope:\n" +
      unlisted.map((f) => `  ${f}`).join("\n"),
  );
});

test("blocked.md 29 stayed closed - no surface describes the stored answers that way", () => {
  /**
   * This file used to census where the claim was published, because the answer
   * to blocked.md 29 was a wording call nobody had taken yet and the list was
   * how the scope stayed honest. Fourteen sites when it was written, six by
   * the morning of 24 September 2026.
   *
   * **Danny took the call that day: stored answers are "what each engine
   * said", never "verbatim" and never "word for word".** So the list is empty,
   * and the rule above - no surface publishes the claim unless it is listed -
   * is now the whole file rather than half of it. Every remaining site was
   * rewritten in the same push, which is what the failure message on the
   * deleted rule always asked for: "if this is the fix landing, it has to land
   * everywhere at once."
   *
   * The `sites` field is kept on the (empty) type rather than simplified away,
   * because the shape is what makes a deliberate exception expressible. If one
   * ever has to come back - a quotation, a comparison table naming what
   * somebody else does - it goes on the list with a count and a reason, and
   * everything that is not on the list still fails.
   */
  assert.deepEqual(
    SURFACES,
    [],
    "a surface is recorded as publishing the retired wording. blocked.md 29 is closed; either this is a " +
      "deliberate exception, in which case say why here, or the wording has come back somewhere.",
  );
});

test("every surface records why the page sweeps can or cannot see it", () => {
  for (const s of SURFACES) {
    assert.ok(s.why.trim().length > 20, `${s.file} has no reason recorded`);
    assert.ok(s.sites > 0, `${s.file} is listed with no sites`);
  }
});
