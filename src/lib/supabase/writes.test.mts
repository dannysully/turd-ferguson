import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { blankComments } from "../source-read.mts";

/**
 * Every Supabase write must look at its own error, for the same reason every
 * read must.
 *
 * `reads.test.mts` swept the reads that answered as facts. This is the same
 * defect facing the other way, and it was still here afterwards: postgrest-js
 * does not throw on a write either, so `await db.from("scans").update({...})`
 * reports a row that was never touched exactly the way it reports one that was.
 *
 * Ten of them on 19 September 2026, and the sharp ones were the four that end a
 * pass:
 *
 *  - a lost `status: "complete"` leaves a scan that did every read, paid for
 *    every one and stored every answer saying `running` for ever. The screen
 *    waits six minutes and sends the visitor back to confirm to run it again, so
 *    one dropped write bills a whole second scan for a result already in the
 *    table;
 *  - a lost `gated_status: "complete"` is worse, because the claim that starts
 *    that pass is `.eq("gated_status", "queued")` - a row left at `running`
 *    cannot be picked up again by anything, and that is the pass somebody gave
 *    an email address for;
 *  - a lost `status: "failed"` loses the message describing what went wrong,
 *    to the screen that is waiting to show it;
 *  - and the search-volume writes sat inside a try whose catch exists to make
 *    that failure visible - which it could not, because the write reports
 *    failure in `error` rather than by throwing. The read was covered and the
 *    twelve writes under it were not.
 *
 * Structured as the reads sweep is, and for the reason that one gives: a list of
 * call sites typed into a test drifts exactly the way the comments promising
 * "this is handled" drifted. It reads the source instead, and every exemption
 * has to say why.
 */

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");
const SRC = join(ROOT, "src");
const MIGRATIONS = join(ROOT, "supabase", "migrations");

/**
 * The database functions that mutate, read off the migrations that define them.
 *
 * A write does not have to be a `.from(...).update(...)`. Four of them here are
 * `db.rpc("note_...")`, and the sweep below cannot see any of them: it is
 * anchored on `.from(`, which an RPC call does not have, and on a verb that
 * lives in SQL rather than in TypeScript. So `note_scan_spend`,
 * `note_verify_send`, `note_preview_call` and `note_preview_calls` were absent
 * from this sweep rather than exempted by it, and it reported the tree clean.
 *
 * All four happen to look at their error today, so nothing was broken - the same
 * "clean by accident" the `Promise.all` rule next door was added under. What
 * makes it worth closing is that three of the four are ceilings, which is the
 * one family of write whose silence reads as "nothing has happened yet".
 *
 * Derived rather than typed. A list of mutating function names written into
 * this file is the drift these two sweeps exist to avoid - it would be right on
 * the day it was written and silently wrong the first time somebody added a
 * function. This reads `supabase/migrations`, takes each `create [or replace]
 * function` body between its `$$` delimiters, and calls the function a write if
 * a statement in it mutates.
 *
 * Filename order is apply order, and these migrations redefine as they go -
 * `scan_teaser` is written five times. So the last definition wins, exactly as
 * it does in the database, and a function that gains an `update` in a later
 * migration becomes a write here without anyone remembering to say so.
 */
function mutatingFunctions(): Set<string> {
  const verdict = new Map<string, boolean>();

  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\w+)\s*\(/gi)) {
      const open = sql.indexOf("$$", m.index);
      if (open < 0) continue;
      const close = sql.indexOf("$$", open + 2);
      if (close < 0) continue;
      // `--` comments only. The bodies here carry no block comments, and a
      // prose line mentioning an update would otherwise make a read look like
      // a write - which fails in the noisy direction rather than the silent
      // one, but is still a wrong answer.
      const body = sql
        .slice(open + 2, close)
        .split("\n")
        .map((l) => l.replace(/--.*$/, ""))
        .join("\n");
      verdict.set(m[1], /\b(insert|update|delete)\s/i.test(body));
    }
  }

  return new Set([...verdict].filter(([, mutates]) => mutates).map(([name]) => name));
}

const MUTATING = mutatingFunctions();

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(child));
    else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")) out.push(child);
  }
  return out;
}

type Write = { file: string; line: number; text: string; checked: boolean };

/**
 * Every `.from(...)` chain that mutates, and whether its error is looked at.
 *
 * Anchored on `.from(` rather than on the mutating verb alone, which is what
 * separates a Supabase write from `Set.delete`, `Map.delete` and
 * `createHash(...).update(...)` - all three are in this tree and all three
 * match a bare `\.update\(`.
 *
 * "Looked at" is one of two shapes, because those are the two this tree uses and
 * each is a decision to handle the failure: destructured into a binding whose
 * name contains `error` or `Err`, or handed to `endWrite`, which retries it and
 * logs both attempts.
 *
 * **Read through `blankComments`, and that is a fix rather than a precaution.**
 * The `checked` test below looks at the eight lines *above* the write, which is
 * where a doc comment lives. Measured 20 Sep 2026 by injection: an unchecked
 * `await db.from("scans").update(...)` with `const { data, error } = await` in
 * a comment above it came back MISSED - prose describing the idiom satisfied
 * the check that the idiom was there. The identical write with no comment was
 * CAUGHT, so this was the comment, not the pattern. Eighth instance of that cut
 * in this tree and the first inside a rule about silence.
 *
 * Line-numbering survives the blanking, which is why it is not `code`: every
 * message here is a `file:line` somebody has to open.
 *
 * A third clause - a chain returned to a caller that would destructure it - was
 * written and then removed, because running it showed it exempted none of the 28
 * writes here. A clause that excuses nothing today cannot be relied on and can
 * only ever start excusing something by accident, which in a sweep is the same
 * as the sweep quietly stopping. If that shape is ever genuinely needed it
 * belongs in EXEMPT, where it has to be argued for by name.
 */
function writesIn(file: string): Write[] {
  const source = blankComments(readFileSync(file, "utf8"));
  const name = relative(ROOT, file).split(sep).join("/");
  const lines = source.split("\n");
  const out: Write[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!/\.from\(/.test(lines[i])) continue;
    // The chain, as far as its terminator. A write is spelled over up to a dozen
    // lines here, so the verb is rarely on the line `.from(` is.
    const chain = lines.slice(i, i + 25).join("\n");
    const body = chain.slice(0, chain.indexOf(";") + 1 || undefined);
    if (!/\.(update|insert|upsert|delete)\(/.test(body)) continue;

    // Where the statement starts, which is where the error would be bound.
    const opening = lines.slice(Math.max(0, i - 8), i + 1).join("\n");
    const checked =
      /const\s*\{[^}]*\b(error|\w+Err)\b[^}]*\}\s*=\s*await/.test(opening) ||
      /\bendWrite\(/.test(opening);

    out.push({ file: name, line: i + 1, text: lines[i].trim(), checked });
  }
  return out;
}

/**
 * Calls to a database function that mutates, and whether the error is read.
 *
 * "Looked at" is the same pair as above, with the same reasoning. What differs
 * is how the call is found: an RPC is identified by the name it calls, matched
 * against the set derived from the migrations, so a call to a function that
 * only reads - `scan_teaser`, `scan_source_coverage` - is not a write and is
 * left to the reads sweep next door.
 *
 * The statement is taken back to the previous `;`, which is what stops a
 * destructure belonging to some earlier statement from excusing this one.
 *
 * Matching the name means matching a **string literal**, which is the one shape
 * this rule cannot see past: `db.rpc(fnName, ...)` has no name to look up, so it
 * could not be classified as a write and would drop out of this sweep silently -
 * the exact failure the whole run was about. Every call in this tree spells the
 * name inline, and `every RPC call names its function inline` below keeps it
 * that way rather than trusting it to stay true.
 *
 * **A literal spelled WRONG drops out by the identical mechanism**, and nothing
 * here closes that: `MUTATING.has` answers false for a name no migration
 * declares exactly as it does for a name that only reads.
 * `rpc-signatures.test.mts` is that other direction - it walks the calls and
 * asks whether each names a function the migrations declare, with the argument
 * names that function takes.
 */
function mutatingRpcsIn(file: string): Write[] {
  // Blanked for the same reason as `writesIn`, and it replaces the three
  // `startsWith` guards that used to sit below: those caught a call on a line
  // *opening* with a comment marker and not one on the second line of a block
  // comment, which is where the tree's real instance lives.
  const source = blankComments(readFileSync(file, "utf8"));
  const name = relative(ROOT, file).split(sep).join("/");
  const lines = source.split("\n");
  const out: Write[] = [];

  for (const m of source.matchAll(/\.rpc\(\s*["'`](\w+)["'`]/g)) {
    if (!MUTATING.has(m[1])) continue;
    const line = source.slice(0, m.index).split("\n").length;
    const text = lines[line - 1].trim();

    const head = source.slice(source.lastIndexOf(";", m.index) + 1, m.index);
    const checked =
      /const\s*\{[^}]*\b(error|\w+Err)\b[^}]*\}\s*=\s*await/.test(head) || /\bendWrite\(/.test(head);

    out.push({ file: name, line, text, checked });
  }
  return out;
}

/**
 * Writes that may discard their error, each with the reason it is safe.
 *
 * Keyed by file and line-independent text, not by line number, which would go
 * stale on the next edit above it. Adding an entry here is a decision to be
 * argued for in the comment beside it, which is the point.
 */
const EXEMPT: Record<string, string> = {};

const FILES = sourceFiles(SRC);
const WRITES = [...FILES.flatMap(writesIn), ...FILES.flatMap(mutatingRpcsIn)];

test("the sweep can still see the writes it is sweeping", () => {
  // Guards the walk and the match together. If either stops working every
  // assertion below passes over an empty list and this file tests nothing,
  // which is the failure mode that makes a green check worse than no check.
  assert.ok(FILES.length >= 40, `expected 40+ source files, walked ${FILES.length}`);
  assert.ok(WRITES.length >= 15, `expected 15+ Supabase writes, found ${WRITES.length}`);
});

test("the migrations still say which functions mutate", () => {
  /**
   * Guards the derivation in both directions, because a set that came back
   * empty and a tree with no mutating RPCs produce the same green.
   *
   * Both halves are asserted on purpose. `note_scan_spend` is the `update scans`
   * that the two spend ceilings depend on, so if it stops reading as a write
   * the rule has quietly stopped covering the four calls it exists for.
   * `scan_teaser` is a `select` and must stay out of the set: were the body
   * parse to give up and call everything a write, every read RPC would land in
   * the writes sweep and the error check would be asserted twice in two files
   * while nobody noticed the parse had failed.
   */
  assert.ok(MUTATING.has("note_scan_spend"), "note_scan_spend updates scans and must read as a write");
  assert.ok(!MUTATING.has("scan_teaser"), "scan_teaser only selects and must not read as a write");
  assert.ok(
    WRITES.some((w) => /\.rpc\(/.test(w.text)),
    "no mutating RPC call site was found, so the name match is not reaching the source",
  );
});

test("every RPC call names its function inline", () => {
  /**
   * The one shape the rule above cannot classify.
   *
   * It decides whether a call is a write by looking the function name up in the
   * set derived from the migrations, so a call whose name is a variable -
   * `db.rpc(fnName, ...)` - has nothing to look up and would drop out of this
   * sweep without saying so. That is the same silent disappearance this whole
   * file was widened for, one shape further along, and it is cheaper to refuse
   * it than to discover it later from the outside.
   *
   * Not a style rule. If a computed name is ever genuinely wanted, the fix is to
   * teach this sweep how to resolve it - not to delete the assertion.
   */
  const computed = FILES.flatMap((file) => {
    const name = relative(ROOT, file).split(sep).join("/");
    // Blanked, not raw. `src/app/scan/[token]/page.tsx` carries
    // `(await db.rpc(...)).data` inside a doc comment explaining a defect that
    // was fixed, and against raw source that is a `.rpc(` with no literal after
    // it - so this rule would report the prose describing the code as the one
    // shape it exists to refuse. The three `startsWith` guards this replaces
    // did hide that instance, because the comment line happens to open with
    // `*`; they would not hide it written any other way.
    const source = blankComments(readFileSync(file, "utf8"));
    const lines = source.split("\n");
    return [...source.matchAll(/\.rpc\(/g)]
      .map((m) => ({ line: source.slice(0, m.index).split("\n").length, rest: source.slice(m.index) }))
      .filter(({ rest }) => !/^\.rpc\(\s*["'`]\w+["'`]/.test(rest))
      .map(({ line }) => `${name}:${line} ${lines[line - 1].trim()}`);
  });

  assert.deepEqual(
    computed,
    [],
    "name this RPC's function with a string literal - a computed name cannot be matched against the migrations, so the call would leave the writes sweep silently",
  );
});

test("every Supabase write looks at its own error", () => {
  // hasOwn, not `in`, to match the reads sweep. EXEMPT is a plain object keyed
  // by a string built out of a line of source, so `in` answers for the whole
  // prototype chain. Not reachable today - every key carries a file path and a
  // colon - but a membership test that does not do what it looks like it does
  // is the exact thing these two files exist to catch elsewhere.
  const unchecked = WRITES.filter((w) => !w.checked).filter(
    (w) => !Object.hasOwn(EXEMPT, `${w.file}:${w.text}`),
  );

  assert.deepEqual(
    unchecked.map((w) => `${w.file}:${w.line} ${w.text}`),
    [],
    "these writes discard their error, so a row that was never touched is indistinguishable from one that was",
  );
});

test("every exemption still points at a write that exists", () => {
  // An exemption left behind after its call site moves is a hole nobody can
  // see. The list has to stay honest in both directions.
  for (const key of Object.keys(EXEMPT)) {
    const [file, ...rest] = key.split(":");
    const text = rest.join(":");
    assert.ok(
      WRITES.some((w) => w.file === file && w.text === text),
      `EXEMPT lists ${key}, but there is no such write any more - delete the entry`,
    );
  }
});
