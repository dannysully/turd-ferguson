import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { blankComments, sourceFiles } from "../source-read.mts";

/**
 * Every reader of a stored engine list goes through one door.
 *
 * ## What was wrong
 *
 * `scans.engines` and `scans.gated_engines` are jsonb arrays a human can edit,
 * and `pipeline.ts` takes both through `[...new Set((...).filter(isEngine))]`
 * before it asks anything - its own comment saying it does so "for rows
 * already written", because `settings-merge` only stops a repeat reaching a
 * *new* row. So the pass treats a repeated name as one engine.
 *
 * Three other readers filtered and did not dedupe, and each of them therefore
 * disagreed with the pass about the same row:
 *
 * - the campaign reading's grid, whose width is the headline's denominator, so
 *   one answer was counted twice on both sides of *named in N of M* while the
 *   history strip twelve lines below counted answer rows and counted it once;
 * - the waiting screen's engine rail, which renders a chip per entry keyed on
 *   the engine name - two identical children under one React key, and a
 *   visitor told their scan reads five engines when it reads four.
 *
 * Both now call `knownEngines`.
 *
 * ## Why this is a walk and not a value rule
 *
 * A test that only asserted `knownEngines` dedupes would have passed on the
 * tree that carried the defect, because that tree did not call it. The rule
 * that has to hold is about the readers, so the denominator is the source: for
 * every `.filter(isEngine)` in shipping source, either it is deduped on the
 * spot, or it is the body of `knownEngines`, or it is on a list that cannot
 * repeat - and that last one costs an exemption that re-earns its own
 * evidence, so it fails the day the reason stops being true rather than going
 * on matching.
 *
 * The pattern is deliberately the bare `.filter(isEngine)`. A predicate over
 * *rows* - `filter((a) => isEngine(a.engine))` in `reading-figures.ts` - is
 * not a list of engine names and is not this species; matching it would put a
 * fourth entry in EXEMPT for a question nobody asked.
 */

/**
 * The idiom, as a literal and as a global regex.
 *
 * Two of them on purpose. `matchAll` demands the `g` flag, and a `g` regex
 * carries `lastIndex` between calls - so reusing this one in an
 * `assert.match` inside a loop passes on the first file and then starts
 * searching the second from wherever the first left off. That is what the
 * third test did on its first run, and it reported a file that plainly
 * contains the idiom as no longer containing it.
 */
const IDIOM = ".filter(isEngine)";
const PATTERN = /\.filter\(isEngine\)/g;
const FILES = sourceFiles(".").filter((f) => /\.tsx?$/.test(f));

/**
 * A filter with no dedupe, and the reason it does not need one.
 *
 * Keyed to the thing that earns the exemption rather than to a file. `receiver`
 * is what must be immediately in front of the filter for the entry to excuse
 * it, and it is not decoration: the first draft keyed these on the file alone,
 * and the injection harness then showed `reading.ts` reverting the campaign
 * headline to a bare filter and being waved straight through by the entry that
 * exists for `engines_answered`. An exemption keyed to a file excuses whatever
 * lands in it next, which is the failure this repo has recorded twice.
 *
 * `holds` re-measures the reason itself, so the entry fails the day the thing
 * it relies on changes rather than going on matching.
 */
const EXEMPT: Record<string, { receiver: string; why: string; holds: () => void }> = {
  "src/lib/scan/settings-merge.ts": {
    receiver: "const known = value",
    why: "the dedupe is the next statement - `known` is filtered here and `[...new Set(known)]` two lines down",
    holds() {
      const src = blankComments(readFileSync("src/lib/scan/settings-merge.ts", "utf8"));
      assert.match(src, /const known = value\.filter\(isEngine\);/);
      assert.match(src, /\[\.\.\.new Set\(known\)\]/, "settings-merge stopped deduping the list it filters");
    },
  },
  "src/app/api/coverage-check/[token]/rerun/route.ts": {
    receiver: "settings.scan_engines_free",
    why: "the list is `settings.scan_engines_free`, which came out of mergeSettings already deduped",
    holds() {
      const src = blankComments(readFileSync("src/app/api/coverage-check/[token]/rerun/route.ts", "utf8"));
      assert.match(
        src,
        /settings\.scan_engines_free\.filter\(isEngine\)/,
        "the rerun route stopped reading the merged settings list",
      );
      const merge = blankComments(readFileSync("src/lib/scan/settings-merge.ts", "utf8"));
      assert.match(merge, /\[\.\.\.new Set\(known\)\]/, "mergeSettings no longer dedupes what this relies on");
    },
  },
  "src/lib/coverage/reading.ts": {
    receiver: "engines_answered",
    why: "the column is `engines_answered`, which `pipeline.ts` writes as a Set rather than appending to",
    holds() {
      const src = blankComments(readFileSync("src/lib/coverage/reading.ts", "utf8"));
      assert.match(
        src,
        /engines_answered[\s\S]{0,80}?\.filter\(isEngine\)/,
        "reading.ts's bare filter is no longer the engines_answered one",
      );
      const pipeline = blankComments(readFileSync("src/lib/scan/pipeline.ts", "utf8"));
      assert.match(
        pipeline,
        /engines_answered: \[\.\.\.new Set\(/,
        "the pipeline stopped writing engines_answered as a Set, so reading.ts must dedupe it too",
      );
    },
  },
};

/** Where the door itself lives. Its own filter is the one that may stand bare. */
const DOOR = "src/lib/scan/engines.ts";

/**
 * The text immediately in front of each `.filter(isEngine)` in one file.
 *
 * The same slice the rule below matches an exemption's `receiver` against, so
 * the two tests cannot come to disagree about what "in front of" means - which
 * is the drift that put two counts of one reading on one page in the first
 * place.
 */
function contextsOf(file: string): string[] {
  const src = blankComments(readFileSync(file, "utf8"));
  return [...src.matchAll(PATTERN)].map((m) => src.slice(Math.max(0, m.index - 120), m.index));
}

/**
 * Is this filter wrapped in a `[...new Set(` that has not closed yet?
 *
 * Counted rather than matched. The first draft asked whether the text before
 * the match ended with `[...new Set([^)]*`, which reported both of the
 * pipeline's own deduped reads as defects - the receiver is
 * `(scan.engines ?? [])`, so there is a `)` inside the Set's own parentheses
 * and the negated class stopped dead on it. A `[^)]*` behind an opening paren
 * is not a "still open" test; balance is.
 */
function dedupedHere(src: string, at: number): boolean {
  const open = src.lastIndexOf("[...new Set(", Math.max(0, at - 1));
  if (open === -1 || at - open > 160) return false;
  const between = src.slice(open + "[...new Set(".length, at);
  let depth = 1;
  for (const ch of between) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (depth === 0) return false;
  }
  return true;
}

test("every bare filter(isEngine) in shipping source is deduped, the door, or exempt", () => {
  const unheld: string[] = [];
  let seen = 0;

  for (const file of FILES) {
    const src = blankComments(readFileSync(file, "utf8"));
    for (const m of src.matchAll(PATTERN)) {
      seen++;
      if (file === DOOR) continue;
      if (dedupedHere(src, m.index)) continue;
      // The exemption has to fit THIS occurrence, not the file it is in.
      const before = src.slice(Math.max(0, m.index - 120), m.index);
      if (EXEMPT[file] && before.includes(EXEMPT[file].receiver)) continue;
      unheld.push(`${file}: ${src.slice(Math.max(0, m.index - 60), m.index + 20).trim().split("\n").pop()}`);
    }
  }

  // A floor, because a walk that stopped finding the idiom would report a
  // clean tree. Five today: the two in `pipeline.ts`, the door itself, and the
  // three exempt ones.
  assert.ok(seen >= 5, `the walk found only ${seen} filter(isEngine) calls - it has stopped seeing them`);
  assert.deepEqual(unheld, [], "an engine list is read without deduping - see knownEngines in scan/engines.ts");
});

test("every exemption still earns itself", () => {
  for (const [file, e] of Object.entries(EXEMPT)) {
    assert.ok(e.why.length > 20, `${file} is exempt without saying why`);
    assert.ok(
      contextsOf(file).some((before) => before.includes(e.receiver)),
      `${file}'s exemption names a receiver (${e.receiver}) that is no longer in front of any filter here`,
    );
    e.holds();
  }
});

test("no exemption outlives the filter it excuses", () => {
  /**
   * The other direction, and it is the one that rots quietly: an entry whose
   * file no longer contains the idiom is excusing nothing, and will go on
   * excusing whatever lands there next.
   */
  for (const file of Object.keys(EXEMPT)) {
    const src = blankComments(readFileSync(file, "utf8"));
    assert.ok(src.includes(IDIOM), `${file} is exempt but no longer filters an engine list`);
  }
});

test("the two readers the defect was found in call the door by name", () => {
  /**
   * A value rule over `knownEngines` cannot see whether anything calls it -
   * which is exactly how the tree that carried this defect would have passed
   * one. Named rather than walked because these two are the finding.
   */
  // HeroSequence was the second of the two. The waiting screen's engine chips
  // moved to ScanProgress.tsx when ProcessSequence replaced the acts beside
  // them; the reader is the same reader, in a new file.
  for (const file of ["src/lib/coverage/reading.ts", "src/components/scan/ScanProgress.tsx"]) {
    const src = blankComments(readFileSync(file, "utf8"));
    assert.match(src, /knownEngines\(/, `${file} stopped reading its engine list through knownEngines`);
  }
});
