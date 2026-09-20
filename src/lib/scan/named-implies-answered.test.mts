import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { code, liveSqlFunctions, sourceFiles } from "../source-read.mts";

/**
 * `brand_named` is only ever true on a row that answered - and one expression
 * in the whole tree makes that so.
 *
 * `readAndStore` writes `brandNamed: read.answered && namesBrand(...)`. Every
 * figure below counts `brand_named` **raw**, with no `answered` beside it, and
 * is correct only because of that one `&&`:
 *
 * | reader | what it publishes |
 * |---|---|
 * | `scan_teaser.by_engine.named` (SQL) | summed into the headline AI-visibility tile |
 * | `scan_teaser.named` (SQL) | "named in N of M" |
 * | `result-figures.questionTally` | the pill beside every question |
 * | `result-figures.namedBy` | which engines named you |
 * | `reading-figures` (campaign) | the same two figures on the other product |
 *
 * **Nothing executed it.** The invariant was carried as prose in two files -
 * `report-counts.ts` and `report-counts.test.mts` both write the sentence
 * "`readAndStore` writes `read.answered && namesBrand(...)`" - which is the
 * census-in-prose species this queue keeps finding: the obligation is stated
 * where nothing runs it, and it lands on the one line that can quietly stop
 * being true.
 *
 * ## What it costs when it stops being true
 *
 * Delete the `read.answered &&` - it typechecks, it builds, and every existing
 * test passes, because `reportCounts` and `tallyEngine` each re-guard on their
 * own way in. What changes is everything that does not:
 *
 * - the headline named count **inflates**, because `by_engine.named` counts
 *   names found in rows that never answered;
 * - `questionPill` can print "3 of 2", a numerator over a smaller denominator;
 * - `parseEngineResults` refuses `named > answered` and **drops the row**, so
 *   the engine's chip silently vanishes from the waiting screen rather than
 *   showing a wrong number - a failure with no error anywhere.
 *
 * And it breaks a rule the site publishes about itself: /about's first
 * measurement rule is "Unmeasured is excluded, never zero."
 *
 * ## Why the guard stays at the writer rather than being repeated at the reads
 *
 * Adding `and a.answered` to the SQL would make the two agree by construction,
 * and it is deliberately not done: that is a second judge of one fact, which is
 * the failure this repo names everywhere else. One writer, guarded, and a sweep
 * that says so. What these rules refuse is a **new** raw reader and a writer
 * that stops guarding. Guarding a recorded reader is a good change and is also
 * not free - it fails here until that reader's entry goes, in the same edit,
 * which is the only way the list below stays true.
 *
 * Scope, stated because a sweep's own reason for narrowing is a universal like
 * any other: this is about expressions that **count or filter** on the column,
 * because those are what produce a published number. Rendering a per-row
 * boolean - `ResultView`'s "does not name", `overviewState`'s "none shown" - is
 * the separate question of what a failed read should say, which is blocked
 * item 12 and Danny's.
 *
 * ## What this walk cannot see, asked of itself while the denominator is fresh
 *
 * - **A count written as a loop.** `predicates()` walks `.filter`, `.some`,
 *   `.every` and `.find`; `for (const a of rows) if (a.brand_named) n += 1` is
 *   invisible to it. There is no live instance - every count of this field in
 *   the tree today is an array method - so a rule about it would be decoration,
 *   and this note is here instead so the next reader knows which it is.
 * - **A reader in a `.tsx`.** `sourceFiles` includes them and the predicate
 *   walk is plain text, so a filter inside JSX is seen; a count assembled
 *   across a `map` and a `reduce` is not, for the same reason as above.
 * - **The SQL side reads the LAST definition of each function**, which is what
 *   the database runs. A superseded definition counting the field differently
 *   is correctly ignored.
 */

const ROOT = new URL("../../../", import.meta.url).pathname;
const src = (f: string) => code(readFileSync(ROOT + f, "utf8"));

/** Both spellings: the column and the pipeline's own field. */
const FIELD = /\b(?:brand_named|brandNamed)\b/;

/**
 * The value an object literal gives `brandNamed`, read to the next top-level
 * comma rather than to the end of the line.
 *
 * Brace-matched on purpose. A line window is a number somebody has to keep in
 * step with the code, and it fails in the flattering direction here: an
 * initialiser wrapped onto a second line would read as empty, match no
 * `answered`, and - if this were written the other way round - be waved
 * through. It is the shape `upsert-conflict.test.mts` records.
 */
function initialiserAt(body: string, from: number): string {
  let depth = 0;
  for (let i = from; i < body.length; i += 1) {
    const ch = body[i]!;
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    else if (ch === ")" || ch === "]" || ch === "}") {
      if (depth === 0) return body.slice(from, i);
      depth -= 1;
    } else if (ch === "," && depth === 0) return body.slice(from, i);
  }
  return body.slice(from);
}

/**
 * The assignments to `name`, skipping type declarations.
 *
 * A member of a type literal - `brandNamed: boolean;` - is the same syntax as
 * an object-literal member and has to be cut, or the rules below judge a type
 * as though it were a write. It is cut on the `;`, which an object-literal
 * member cannot contain at top level, and then on the primitive names, rather
 * than by trying to work out whether the offset is inside a `type` block.
 */
function assignments(name: string): { file: string; value: string }[] {
  const out: { file: string; value: string }[] = [];
  const re = new RegExp(`\\b${name}\\s*:\\s*`, "g");
  for (const file of sourceFiles(ROOT)) {
    const body = src(file);
    for (const m of body.matchAll(re)) {
      const value = initialiserAt(body, m.index! + m[0].length).split(";")[0]!.trim();
      if (/^(?:boolean|number|string|null|undefined)$/.test(value)) continue;
      out.push({ file, value });
    }
  }
  return out;
}

/**
 * A value that is the same field read straight off something else.
 *
 * The distinction these rules turn on, and the first draft did not make it:
 * `brandNamed: a.brand_named` is a **copy** between two shapes of a row that
 * has already been written and read back - `reading-figures.ts` and
 * `reading.ts` both do it on the campaign path - and it carries whatever
 * guarantee the column already holds. `brandNamed: <anything else>` is a
 * **derivation**, which is where a judgement about a read is being made and
 * where the guard has to be. A rule that cannot tell them apart demands
 * `answered` beside a rename, which is noise, and noise is how a real failure
 * gets an exemption written for it.
 */
const COPY = /^[A-Za-z_$][\w$]*(?:\.[\w$]+)*\.(?:brand_named|brandNamed)$/;

/**
 * Every expression that counts or filters on the column, as `file` plus the
 * predicate, split into those that also name `answered` and those that do not.
 *
 * The predicate is the body of the arrow inside a `.filter(` or a `.some(` -
 * read to the closing paren, so `(a) => isEngine(a.engine) && a.brand_named`
 * is one predicate rather than two fragments.
 */
function predicates(): { file: string; text: string; guarded: boolean }[] {
  const out: { file: string; text: string; guarded: boolean }[] = [];
  for (const file of sourceFiles(ROOT)) {
    const body = src(file);
    for (const m of body.matchAll(/\.(?:filter|some|every|find)\s*\(/g)) {
      const open = m.index! + m[0].length - 1;
      let depth = 0;
      let end = open;
      for (let i = open; i < body.length; i += 1) {
        if (body[i] === "(") depth += 1;
        else if (body[i] === ")") {
          depth -= 1;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      const text = body.slice(open + 1, end).replace(/\s+/g, " ").trim();
      if (!FIELD.test(text)) continue;
      out.push({ file, text, guarded: /\banswered\b/.test(text) });
    }
  }
  return out;
}

/** Derivations of the field: assignments that are not a copy of it. */
const INITS = assignments("brandNamed").filter((a) => !COPY.test(a.value));
/** Every assignment to the column, copies included - a copy is what it must be. */
const WRITES = assignments("brand_named");
const PREDS = predicates();

// --------------------------------------------------------------- denominators

test("the walk can see the writer and the readers it is written about", () => {
  /**
   * Asserted before anything is judged. A rename that hides every site reads as
   * a clean tree in every rule below it, and four of this repo's own tripwires
   * have failed exactly that way.
   */
  assert.ok(INITS.length >= 3, `expected at least 3 brandNamed initialisers, found ${INITS.length}`);
  assert.ok(WRITES.length >= 1, `expected the column to be written somewhere, found ${WRITES.length}`);
  assert.ok(PREDS.length >= 5, `expected at least 5 predicates on the field, found ${PREDS.length}`);
  assert.ok(
    PREDS.some((p) => p.guarded),
    "no predicate guards on `answered` - the walk is reading the wrong thing",
  );
  assert.ok(
    PREDS.some((p) => !p.guarded),
    "no predicate counts the field raw - this sweep would be checking nothing",
  );
});

// ------------------------------------------------------------------ the writer

test("the one writer of brand_named guards it on answered", () => {
  /**
   * The whole invariant, in one assertion. `brandNamed: false` is the honest
   * form for a read that never happened and needs no guard; anything else must
   * name `answered`, because a name found in prose that was never returned is
   * not a finding.
   */
  for (const { file, value } of INITS) {
    if (value === "false") continue;
    assert.match(
      value,
      /\banswered\b/,
      `${file}: \`brandNamed: ${value}\` does not require the read to have answered. ` +
        `Every figure in this product counts brand_named raw and trusts this one expression - ` +
        `see this file's header for the five that inflate silently.`,
    );
  }
});

test("the column is written from the guarded field and from nothing else", () => {
  /**
   * The way round the rule above: guarding `brandNamed` buys nothing if the
   * insert can set the column from something else. The value must be the field,
   * so the guard above is the only path onto the row.
   */
  for (const { file, value } of WRITES) {
    assert.ok(
      COPY.test(value),
      `${file}: brand_named is set from \`${value}\`, which is a derivation rather than a copy ` +
        `of the guarded field. The judgement about whether a read named the brand belongs at ` +
        `the one writer, where \`answered\` is in scope.`,
    );
  }
});

// ------------------------------------------------------------- the raw readers

/**
 * The readers that count the column raw, each with why that is safe.
 *
 * Derived and pinned, the shape `spend-gates.test.mts` settled on: the list is
 * read off source, and this table only records the reason. A reader that stops
 * being raw drops out and passes; a NEW raw one fails here and has to be
 * thought about, which is the only direction that matters.
 */
const RAW_READERS: { file: string; predicate: string; count: number; why: string }[] = [
  {
    file: "src/lib/scan/pipeline.ts",
    predicate: "(a) => a.engine === engine && a.brandNamed",
    count: 1,
    why:
      "the subject's own leaderboard row: this count becomes scan_brands.mentions when " +
      "nothing was extracted from the prose. The safest of the five - it counts the " +
      "pipeline's own in-memory objects, the ones the guard above has just been applied to.",
  },
  {
    file: "src/components/scan/result-figures.ts",
    predicate: "(a) => a.brand_named",
    count: 2,
    why:
      "questionTally's numerator and namedBy's engine list, over one question's own answer " +
      "rows. Two sites, counted as two: reportCounts re-guards on its own way in because it " +
      "is handed rows off a table rather than the pipeline's objects, and these are not.",
  },
  {
    file: "src/lib/coverage/reading-figures.ts",
    predicate: "(a) => a.brandNamed",
    count: 1,
    why: "the campaign product's per-question figure, over scan_answers rows written by the same pipeline.",
  },
  {
    file: "src/lib/coverage/reading-figures.ts",
    predicate: "(a) => isEngine(a.engine) && a.brand_named",
    count: 1,
    why: "the campaign product's per-reading figure. Same guarantee, one product over.",
  },
];

/**
 * The recorded set and the measured set must match exactly, in both directions
 * and **by count**.
 *
 * Keyed to the occurrence rather than to the file, and carrying a number rather
 * than a membership, because a file-keyed entry excuses whatever lands in it
 * next: `result-figures.ts` genuinely counts the field raw twice, so a
 * file-keyed reason would wave a third through in silence. The injection
 * harness recorded that exact case as a MISS against the first draft of this
 * rule, which is what the harness is for.
 *
 * The consequence is that guarding a reader is not a free edit - it fails here
 * until its entry goes, in the same commit. That is deliberate: an exemption
 * that outlives the thing it excuses is how a list stops meaning anything, and
 * the failure names the entry to delete.
 */
test("the raw counts are exactly the ones we have a reason for", () => {
  const tally = (pairs: { file: string; text: string }[]) => {
    const m = new Map<string, number>();
    for (const p of pairs) {
      const k = `${p.file} :: ${p.text}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m].map(([k, n]) => `${k}  x${n}`).sort();
  };

  const measured = tally(PREDS.filter((p) => !p.guarded));
  const recorded = tally(
    RAW_READERS.flatMap((r) => Array.from({ length: r.count }, () => ({ file: r.file, text: r.predicate }))),
  );

  assert.deepEqual(
    measured,
    recorded,
    "the raw counts of brand_named are not the ones recorded above.\n" +
      "Extra means a new reader trusts the writer's guard without saying so - guard the\n" +
      "predicate, or record it with the reason it is safe. Missing means a recorded reader\n" +
      "changed and its entry has to go in the same edit.",
  );
});

test("every recorded reason is a sentence, not a placeholder", () => {
  // An exemption costs a reason. `spend-gates.test.mts` settled the shape; this
  // is the cheap half of it, so an entry cannot be added with an empty `why`
  // to make the rule above go green.
  for (const r of RAW_READERS) {
    assert.ok(r.why.length > 40, `${r.file} :: ${r.predicate} has no real reason recorded`);
    assert.ok(r.count >= 1, `${r.file} :: ${r.predicate} records a count of ${r.count}`);
  }
});

// --------------------------------------------------------------------- the SQL

/**
 * The database counts it raw too, and that is the half no TypeScript rule can
 * reach: `scan_teaser` is the function behind the headline figure, and its
 * `named` counts `brand_named` with no `answered` beside it.
 *
 * Read off the LAST definition of the function, because that is the one that
 * runs - `scan_teaser` is written five times across these migrations.
 */
test("every live SQL function that counts the field is one we know about", () => {
  // Derived, not named. The first draft asked `get("scan_teaser")`, which is a
  // typed denominator inside a sweep - a second function counting the column
  // raw would have been invisible to the rule written about exactly that.
  const counting = [...liveSqlFunctions(ROOT)]
    .filter(([, def]) => /\bbrand_named\b/.test(def.body))
    .map(([name]) => name)
    .sort();
  assert.deepEqual(
    counting,
    ["scan_teaser"],
    "a live SQL function counts brand_named and is not recorded here. Every one of them " +
      "trusts the single guarded writer, so a new one is a new thing trusting it.",
  );
});

test("the live scan_teaser counts brand_named, and every raw count is known", () => {
  const teaser = liveSqlFunctions(ROOT).get("scan_teaser");
  assert.ok(teaser, "scan_teaser is not in the migrations where this sweep looks for it");

  /**
   * Each `brand_named` with the predicate it sits in: from the nearest `where`
   * to the left, which is where its own clause begins.
   *
   * **Not a character window**, which is the first thing this was and it was
   * wrong in the flattering direction. `by_engine` reads
   * `count(*) filter (where a.answered) as answered, count(*) filter (where
   * a.brand_named) as named` - so a fixed lookback wide enough to reach the
   * start of the clause also reaches the PREVIOUS column's `answered`, and two
   * of the three raw counts here read as guarded. Every `filter (where ...)`
   * opens its own `where`, so the keyword is the boundary the window was
   * guessing at.
   */
  const counts = [...teaser.body.matchAll(/\bbrand_named\b/g)].map((m) => {
    const before = teaser.body.slice(0, m.index!);
    const opens = [...before.matchAll(/\bwhere\b/gi)];
    const from = opens.length ? opens[opens.length - 1]!.index! : 0;
    return teaser.body.slice(from, m.index! + "brand_named".length).replace(/\s+/g, " ");
  });
  assert.ok(counts.length >= 2, `expected scan_teaser to count brand_named, found ${counts.length}`);

  const rawCount = counts.filter((c) => !/\banswered\b/.test(c)).length;
  assert.equal(
    rawCount,
    counts.length,
    "a scan_teaser count of brand_named now names `answered` as well. That is a second " +
      "judge of one fact rather than a fix - the guard belongs at the single writer, and " +
      "this sweep holds it there. If the intent is to move the guard into SQL, this file " +
      "and the writer rule above are the same edit.",
  );
});
