import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

/**
 * Every reader of `scan_citations` that can count must dedupe first.
 *
 * `scan_citations` has no unique constraint and the pipeline inserts rather
 * than upserts, so a pass that stored its citations and then threw leaves those
 * rows behind and the retry writes a second copy on top. The table is therefore
 * allowed to hold the same `(source_domain, question_id, engine)` twice, and
 * "how many answers cited this domain" is a count over that triple, not over
 * physical rows.
 *
 * This is not hypothetical and it is not old. On 20 September 2026
 * `readingDetail` counted raw rows, so a retried campaign reading reported every
 * source as cited twice as often as it was - and `base.sources` is sorted on
 * that number, so the order of the table was wrong as well as the figures in it.
 * The comment in `pipeline.ts` that named three readers "as though they were all
 * of them" asserted no count could double. It was wrong, and nothing in the tree
 * could tell.
 *
 * `scan_answers` is the instructive contrast: it carries a unique key on
 * `(question_id, engine)` and is upserted onto it, so the database enforces
 * there what only this file enforces here. Adding the same constraint to
 * `scan_citations` is not available - existing rows already violate it, and a
 * unique index would start throwing inside the pass that writes them - so the
 * rule lives in the readers and needs something watching the readers.
 *
 * ## What this checks, and what it cannot
 *
 * The rule is keyed on the SHAPE of the read rather than on a judgement about
 * the code: a read that selects both `question_id` and `engine` is a read that
 * can count per answer, and it has to show its dedupe. A read that selects
 * neither cannot produce a per-answer count and is not asked to - which is
 * `classifySources`, taking `source_domain, url, title` to get a distinct domain
 * list, and that read is correct as it stands.
 *
 * What it cannot check is whether the dedupe is *applied to the right rows*.
 * It looks for the key being formed, not for the key being used, because
 * "used correctly" is not a property of the source text. A reader that builds
 * the triple and then counts something else would pass here. That limit is the
 * reason this is a sweep and not a proof, and it is still worth having: every
 * defect of this kind so far has been a reader that never formed the key at all.
 */

/**
 * Plain paths rather than URLs, for the reason `reads.test.mts` gives: the WHATWG
 * URL parser percent-encodes the brackets in `src/app/scan/[token]`, so a
 * URL-based walk silently skips the route directories.
 */
const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");
const SRC = join(ROOT, "src");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(child));
    else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")) out.push(child);
  }
  return out;
}

type CitationRead = {
  file: string;
  line: number;
  /** The column list the read asked for, as written. */
  columns: string;
  /** Can this read produce a per-answer count at all? */
  countable: boolean;
};

/**
 * Every `.from("scan_citations")` and the `.select(...)` that belongs to it.
 *
 * The select is taken from the text following the `.from(` up to the end of the
 * statement, which is how the call is always spelled here - `.from(...)` then
 * `.select(...)` then the filters. Anchored on the table name rather than on a
 * helper, because the point is to catch the next reader somebody writes and
 * that one will not be using today's helpers.
 */
function citationReadsIn(file: string): CitationRead[] {
  const source = readFileSync(file, "utf8");
  // Posix-style so the assertion messages read the same on any machine.
  const name = relative(ROOT, file).split(sep).join("/");
  const lines = source.split("\n");
  const out: CitationRead[] = [];

  for (const m of source.matchAll(/\.from\(\s*["'`]scan_citations["'`]\s*\)/g)) {
    const line = source.slice(0, m.index).split("\n").length;
    // Prose, not code. This file and `citation-count.ts` both quote the table
    // name in their explanations, and a sweep matching source text matches
    // comments too - the lesson `reads.test.mts` records against its own
    // first draft.
    const text = lines[line - 1].trim();
    if (text.startsWith("*") || text.startsWith("//") || text.startsWith("/*")) continue;

    const after = source.slice(m.index + m[0].length, m.index + m[0].length + 400);
    /**
     * Writes are not readers and have no count to get wrong.
     *
     * The first draft of this rule matched them, and the guard below caught it
     * rather than the rule quietly swallowing `pipeline.ts`'s `.insert(` as a
     * read with no columns. Judged on which verb comes first, not on the
     * presence of `.select(`: an insert may carry a trailing `.select()` to get
     * its rows back, and that is still a write.
     */
    const mutator = /\.(insert|upsert|update|delete)\(/.exec(after);
    const select = /\.select\(\s*(["'`])([\s\S]*?)\1/.exec(after);
    if (mutator && (!select || mutator.index < select.index)) continue;

    const columns = select?.[2] ?? "";
    out.push({
      file: name,
      line,
      columns: columns.replace(/\s+/g, " ").trim(),
      countable: /\bquestion_id\b/.test(columns) && /\bengine\b/.test(columns),
    });
  }
  return out;
}

/**
 * Does this file form the three-column key, or hand its rows to something whose
 * whole job is to?
 *
 * Three spellings are accepted because all three are in the tree and all three
 * are correct: the template literal that `buildUnlockPayload` keys a Set on,
 * `countCitedDomains`, and `deriveOpportunities`. The named helpers count
 * because each is a pure function with its own test asserting the dedupe -
 * `citation-count.test.mts` and the opportunity tests - so a reader delegating
 * to one is covered by that test rather than uncovered by this one.
 */
function formsTheKey(file: string): boolean {
  const source = readFileSync(file, "utf8");
  const code = source
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*");
    })
    .join("\n");

  if (/\bcountCitedDomains\s*\(/.test(code)) return true;
  if (/\bderiveOpportunities\s*\(/.test(code)) return true;
  // A template literal holding all three column names: the key itself, however
  // it is punctuated and whatever the row variable is called.
  for (const lit of code.matchAll(/`[^`]*`/g)) {
    const body = lit[0];
    if (/source_domain/.test(body) && /question_id/.test(body) && /engine/.test(body)) return true;
  }
  return false;
}

const FILES = sourceFiles(SRC);
const READS = FILES.flatMap(citationReadsIn);
const COUNTABLE = READS.filter((r) => r.countable);

test("the sweep can still see the citation reads it is sweeping", () => {
  /**
   * Guards the walk, the table-name match and the select extraction together.
   *
   * Without this every assertion below passes over an empty list and the file
   * tests nothing while showing green - which is exactly the state
   * `reads.test.mts` was in with respect to RPC calls, and the reason it now
   * asserts on the number examined rather than on an empty result.
   */
  assert.ok(FILES.length >= 40, `expected 40+ source files, walked ${FILES.length}`);
  assert.ok(READS.length >= 3, `expected 3+ reads of scan_citations, found ${READS.length}`);
  assert.ok(
    COUNTABLE.length >= 2,
    `expected 2+ reads selecting question_id and engine, found ${COUNTABLE.length}`,
  );
  // The select extraction is the part most likely to rot silently: if it stopped
  // finding column lists, every read would read as not countable and the rule
  // below would excuse the whole tree.
  assert.ok(
    READS.every((r) => r.columns.length > 0),
    `a read of scan_citations had no column list extracted: ${READS.filter((r) => !r.columns.length)
      .map((r) => `${r.file}:${r.line}`)
      .join(", ")}`,
  );
  // And the other half: a read that is deliberately not countable must still be
  // recognised as a read, or the shape rule is excusing by accident.
  assert.ok(
    READS.some((r) => !r.countable),
    "no non-countable read found - classifySources takes source_domain, url, title and should be one",
  );
});

test("every countable read of scan_citations dedupes on the three-column key", () => {
  const bare = COUNTABLE.filter((r) => !formsTheKey(join(ROOT, r.file)));

  assert.deepEqual(
    bare.map((r) => `${r.file}:${r.line} select(${r.columns})`),
    [],
    "this read selects question_id and engine, so it can count per answer - key it on (source_domain, question_id, engine) before counting, or hand the rows to countCitedDomains. scan_citations has no unique constraint and a retried pass leaves a second copy of every row behind",
  );
});
