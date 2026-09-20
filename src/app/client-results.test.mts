import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { bodyOf, headClaims, pageText, sweptPages } from "./dynamic-render.mts";
import { CLIENT_RESULTS, SWEPT_RESULTS, type ClientResult } from "../config/client-results.ts";

/**
 * The four numbers on this site that are somebody's real result.
 *
 * Every other figure here is derived from config or labelled example data.
 * `price-surfaces` holds the prices, `scan-shape` holds the engine and
 * question counts, `worked-example` holds the placeholder scan. Not one of
 * them reaches the Vibe Retail figures, and those are the ones AGENTS.md puts
 * outside "ship it rough": "a number about a client's result" carries
 * `[VERIFY]` until there is a dated source, and the cost of a wrong one is
 * not a scruffy page.
 *
 * Found by the claim census (`docs/census-claims.mjs`), which measured 185
 * asserting blocks across the 31 pages and 162 outside the four topic sweeps
 * - the denominator question aimed one level up, at the sweeps themselves.
 * Narrowing that to the percentages the site publishes gave fifteen figures,
 * of which all but the client readings are axis labels, example data, or
 * /about quoting a bad number in order to forbid it.
 *
 * Two rules, because the defect has two halves and they fail in opposite
 * directions.
 *
 * **One: the figure is typed in exactly one place.** It was typed in four -
 * `home/Results.tsx`, `/case-studies`, `/case-studies/vibe-retail` and
 * `scan/HeroSequence.tsx` - with no constant anywhere. That is the species
 * this tree keeps paying for, and this instance is not hypothetical: the
 * visibility figure has already been published in three forms at once ("25%
 * against the full question set and on the case study as 14% against both
 * that and ChatGPT alone"), reconciled by hand on 19 Sep 2026 and held since
 * only by a paragraph in `Results.tsx` asking the next person to remember.
 * The untested fourth copy was `HeroSequence.tsx` - the one surface on this
 * site nobody has ever watched render (blocked.md 15), so a drift there is
 * seen by visitors before it is seen by anyone working on it.
 *
 * **Two: no published surface prints a figure without its scope.** A reading
 * is a number and what it was measured against; /about publishes the general
 * form and calls it the point of the page - *"A percentage without its
 * denominator is not a finding"* - and `Results.tsx` spends a paragraph on
 * why the two keyword readings must not be collapsed, because showing them as
 * one claims #1 in eight weeks, which is not what happened.
 *
 * That rule found two live instances when it was written, and both are fixed
 * in the same push:
 *
 * - **The homepage printed "0% to 25%" with no denominator anywhere on the
 *   page.** `/case-studies` said "Of the tracked prompts" and the case study
 *   said "Share of the tracked prompts where ChatGPT names the brand". The
 *   homepage said nothing - the denominator was in a code comment on the line
 *   above instead. Same form as `67bc96d` and `486d63a`: what already knows
 *   the answer, and is the copy reading it or repeating it.
 * - **The case study's JSON-LD `description` did the same.** That string is
 *   read detached from the body two hundred words below it that carries the
 *   qualifier, which is why the surfaces below are split the way they are.
 *
 * **What this cannot see, said plainly.** Three things, asked of this sweep
 * the moment it went green, because every blind tripwire in this tree looked
 * like a reasonable check with a reason beside it a run later.
 *
 * - **Whether any of the four numbers is true.** They rest on Danny's word as
 *   the account owner, dated 19 Sep 2026, and blocked.md 3 is still open for
 *   the readings behind them. This checks that the site says one thing rather
 *   than four, and never says the number without saying what it was measured
 *   against. Nothing here makes an unsourced figure sourced.
 * - **`HeroSequence.tsx` renders on no swept page**, so the second rule cannot
 *   reach it - its `seq-*` acts exist only during a live scan, which is why
 *   `capture()` records `/scan/[token]` as blocked. The first rule reaches it
 *   as source, and its two labels interpolate `scope` so a figure cannot be
 *   written there without one, but that is construction rather than a
 *   measurement and should not be read as coverage.
 * - **A scope satisfied by unrelated copy.** The body is judged as one
 *   surface, so a page that happens to say "eight weeks" somewhere else
 *   passes. That is the deliberate cost of not forcing a detail table to
 *   repeat its window on every row; the alternative was a proximity window,
 *   and at 120 characters it reported the case study's own keyword table,
 *   which is true copy scoped by the "At a glance" block above it.
 *
 * Proved against 8 injected defects (`docs/inject-client-results.mjs`), 8/8,
 * three of them through a real `next build` and `npm run capture`. One is
 * green-expected: a doc comment quoting a figure must NOT read as a second
 * copy, which is what earns the comment strip rather than assuming it.
 */

const ROOT = join(import.meta.dirname, "..", "..");

/** The module the figures live in, and the one file allowed to type them. */
const HOME = "src/config/client-results.ts";

// ----------------------------------------------------------------- probes

function sourceOf(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

/**
 * Source with its prose removed.
 *
 * Paid for five times in this tree and once inside the test written to stop
 * it, so it is not optional: the doc comments on all four surfaces quote the
 * figures while explaining them, and `config/client-results.ts` quotes "25%"
 * and "14%" in the paragraph recording the drift. A rule reading raw source
 * would report every one of those as a second copy, and the honest-looking
 * fix - exempting the files - is the fix that blinds it to the real ones.
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
 * Every string an answer engine could read out of a page's JSON-LD.
 *
 * Walked recursively rather than read off known keys: `description` is where
 * the live defect was, but `headline`, `name` and `about` carry prose on this
 * site too, and a rule that names its keys by hand is the shape this repo
 * keeps finding on the wrong side of a denominator question.
 */
function ldStrings(html: string): string[] {
  const out: string[] = [];
  for (const m of bodyOf(html).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    (function walk(v: unknown) {
      if (typeof v === "string") out.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    })(JSON.parse(m[1]!));
  }
  return out;
}

/**
 * The surfaces a figure can be published on, each judged on its own.
 *
 * The body is one surface, because a reader has the whole page: the case
 * study states its window in an "At a glance" block at the top and then lists
 * five keyword movements two thousand characters below it, and a rule
 * demanding the scope beside every table row would force a page to repeat
 * itself to stay legal. Each head string and each JSON-LD string is its own
 * surface, because each is quoted away from the page - which is the same
 * argument `og-card.test.mts` makes about the share image, one surface over.
 */
function surfacesOf(html: string): { where: string; text: string }[] {
  return [
    { where: "body", text: pageText(html) },
    ...headClaims(html).map((text) => ({ where: "head", text })),
    ...ldStrings(html).map((text) => ({ where: "json-ld", text })),
  ];
}

// ------------------------------------------------------------------ rules

test("every client figure is written out in exactly one place", () => {
  const files = sourceFiles();
  // A walk that stopped walking returns a clean list, which is the failure
  // shape this whole file exists to refuse.
  assert.ok(files.length >= 40, `expected 40+ source files, walked ${files.length}`);

  const typed: string[] = [];
  for (const file of files) {
    if (file === HOME) continue;
    const src = code(sourceOf(file));
    src.split("\n").forEach((line, i) => {
      for (const r of SWEPT_RESULTS) {
        if (line.includes(r.value)) typed.push(`${file}:${i + 1} ${r.value} - ${line.trim()}`);
      }
    });
  }

  assert.deepEqual(
    typed,
    [],
    `a client's result figure is typed out instead of imported from ${HOME}:\n` +
      typed.map((s) => `  ${s}`).join("\n"),
  );
});

/**
 * And the one place is real, rather than a constant nothing uses.
 *
 * The rule above passes perfectly on a tree where every figure has been
 * deleted from every page - a green that would mean the homepage, the
 * evidence index and the case study had all stopped publishing the only proof
 * this site has. This is the other direction, and it is the half that makes
 * the first one mean something.
 */
test("the constant is what the published surfaces actually use", () => {
  const readers = sourceFiles().filter(
    (f) => f !== HOME && /\bfrom "@\/config\/client-results"/.test(sourceOf(f)),
  );

  for (const surface of [
    "src/components/home/Results.tsx",
    "src/app/case-studies/page.tsx",
    "src/app/case-studies/vibe-retail/page.tsx",
    "src/components/scan/HeroSequence.tsx",
  ]) {
    assert.ok(readers.includes(surface), `${surface} publishes a client figure and no longer reads the constant`);
  }
});

test("no published surface prints a client figure without its scope", () => {
  const pages = sweptPages();
  assert.ok(pages.length >= 20, `expected 20+ swept pages, got ${pages.length} - run the build and capture`);

  const bare: string[] = [];
  let checked = 0;
  for (const { page, html } of pages) {
    for (const { where, text } of surfacesOf(html)) {
      for (const r of SWEPT_RESULTS) {
        if (!text.includes(r.value)) continue;
        checked++;
        if (!text.toLowerCase().includes(r.scope)) {
          bare.push(`${page} (${where}): "${r.value}" with no "${r.scope}" - ${text.replace(/\s+/g, " ").trim().slice(0, 140)}`);
        }
      }
    }
  }

  // A floor, because a rule that finds no figure at all passes silently and
  // that is indistinguishable from the pages having stopped carrying them.
  assert.ok(checked >= 10, `only ${checked} published figures found, expected 10+`);
  assert.deepEqual(
    bare,
    [],
    "a client's result figure is published without what it was measured against:\n" +
      bare.map((s) => `  ${s}`).join("\n"),
  );
});

/**
 * Each figure still has somebody standing behind it.
 *
 * The `{ why, evidence, where }` shape `spend-gates.test.mts` established, one
 * field narrower: an attestation is the only thing separating these four
 * numbers from the ones this repo refuses to publish, so it costs a `holds`
 * rather than a sentence nothing executes.
 */
test("every client figure records who attested it and when", () => {
  for (const r of CLIENT_RESULTS satisfies readonly ClientResult[]) {
    assert.match(r.attested, /\b\d{1,2} \w+ \d{4}\b/, `${r.value} has no dated attestation`);
    assert.ok(r.scope.trim().length > 3, `${r.value} has no scope`);
  }
  assert.equal(CLIENT_RESULTS.length, 4, "the attested set changed - read the header before widening it");
});
