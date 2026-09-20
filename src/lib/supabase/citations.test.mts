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
 * The dedupe is looked for inside the top-level function performing the read,
 * not anywhere in the file. That distinction is the whole of `formsTheKey`'s
 * second half and the reason the scoping test below exists: the per-file
 * version of this rule was satisfiable by a dedupe in a neighbouring function,
 * which is a tripwire guarding code it is not watching.
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
  /** Byte offset of the `.from(`, so the dedupe can be looked for around it. */
  offset: number;
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
      offset: m.index,
      columns: columns.replace(/\s+/g, " ").trim(),
      countable: /\bquestion_id\b/.test(columns) && /\bengine\b/.test(columns),
    });
  }
  return out;
}

/**
 * The start of every top-level declaration, which is how a read is tied to the
 * one function that has to dedupe it.
 *
 * Column-anchored deliberately: at this indentation it is a declaration in the
 * module rather than a nested arrow or an object property, and the three
 * readers in the tree are each a top-level `export async function`.
 */
const TOP_LEVEL_DECL = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface)\s/gm;

/**
 * The span of the top-level declaration containing `offset`.
 *
 * Falls back to the whole file when nothing matches, which would make the rule
 * below no stricter than the per-file one it replaced - so the guard test
 * asserts the narrowing is real rather than trusting this to keep working.
 */
function enclosingSpan(source: string, offset: number): { from: number; to: number } {
  let from = 0;
  let to = source.length;
  for (const d of source.matchAll(TOP_LEVEL_DECL)) {
    if (d.index <= offset) from = d.index;
    else {
      to = d.index;
      break;
    }
  }
  return { from, to };
}

/**
 * Does the function performing this read form the three-column key, or hand its
 * rows to something whose whole job is to?
 *
 * Three spellings are accepted because all three are in the tree and all three
 * are correct: the template literal that `buildUnlockPayload` keys a Set on,
 * `countCitedDomains`, and `deriveOpportunities`. The named helpers count
 * because each is a pure function with its own test asserting the dedupe -
 * `citation-count.test.mts` and the opportunity tests - so a reader delegating
 * to one is covered by that test rather than uncovered by this one.
 *
 * ## Why this is scoped to the function and not to the file
 *
 * It used to read the whole file, and that is a hole of the same shape as the
 * defect the file exists to catch. `unlock.ts` holds two countable reads and
 * both dedupe, so the file passes - and it would have gone on passing if a
 * third read were added to it that deduped nothing, because `deriveOpportunities`
 * appears in `opportunityShape` two hundred lines above. The rule would have
 * been satisfied by somebody else's correctness.
 *
 * That is not hypothetical in kind: every motion defect found on 20 September
 * was a ceiling nothing was measured against, and `b21279a` is the same
 * correction applied to the stagger cap. A tripwire that can be satisfied from
 * outside the code it guards is not watching that code.
 *
 * The narrowing is still not a proof, for the reason the header gives - it
 * looks for the key being formed, not for it being used on the right rows.
 */
function formsTheKey(file: string, offset: number): boolean {
  const source = readFileSync(file, "utf8");
  const { from, to } = enclosingSpan(source, offset);
  const code = source
    .slice(from, to)
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

test("the dedupe rule is scoped to the reading function, not to the whole file", () => {
  /**
   * The narrowing has to be real, and it is the part that can rot silently.
   *
   * `enclosingSpan` falls back to the whole file when `TOP_LEVEL_DECL` matches
   * nothing, so a regex that stopped matching would leave every assertion above
   * passing while the rule quietly went back to being per-file - satisfied by a
   * dedupe two hundred lines away in a different function. That is the exact
   * hole this scoping was added to close, so it is asserted rather than assumed.
   */
  for (const r of COUNTABLE) {
    const source = readFileSync(join(ROOT, r.file), "utf8");
    const { from, to } = enclosingSpan(source, r.offset);
    assert.ok(
      from <= r.offset && r.offset < to,
      `${r.file}:${r.line} the span found does not contain the read it was found for`,
    );
    assert.ok(
      to - from < source.length,
      `${r.file}:${r.line} resolved to the whole file, so the dedupe rule is not scoped to anything - TOP_LEVEL_DECL has stopped matching`,
    );
  }

  /**
   * And the narrowing has to bite where it matters. `unlock.ts` is the file the
   * per-file rule was excusing: two countable reads in two different functions,
   * each of which must show its own dedupe. If they ever collapse into one span
   * the scoping has stopped distinguishing them.
   */
  const unlock = COUNTABLE.filter((r) => r.file.endsWith("scan/unlock.ts"));
  assert.ok(unlock.length >= 2, `expected 2+ countable reads in unlock.ts, found ${unlock.length}`);
  const source = readFileSync(join(ROOT, unlock[0].file), "utf8");
  // Distinct spans rather than an exact read count: a third countable read that
  // does dedupe is a fine thing to add, and a tripwire that fails on correct new
  // code gets deleted by the next person rather than heeded.
  const starts = new Set(unlock.map((r) => enclosingSpan(source, r.offset).from));
  assert.ok(
    starts.size >= 2,
    "every countable read in unlock.ts resolved to one span, so they are excusing each other's dedupe",
  );
});

test("every countable read of scan_citations dedupes on the three-column key", () => {
  const bare = COUNTABLE.filter((r) => !formsTheKey(join(ROOT, r.file), r.offset));

  assert.deepEqual(
    bare.map((r) => `${r.file}:${r.line} select(${r.columns})`),
    [],
    "this read selects question_id and engine, so it can count per answer - key it on (source_domain, question_id, engine) before counting, or hand the rows to countCitedDomains. scan_citations has no unique constraint and a retried pass leaves a second copy of every row behind",
  );
});
