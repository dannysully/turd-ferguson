import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

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
 * A third clause - a chain returned to a caller that would destructure it - was
 * written and then removed, because running it showed it exempted none of the 28
 * writes here. A clause that excuses nothing today cannot be relied on and can
 * only ever start excusing something by accident, which in a sweep is the same
 * as the sweep quietly stopping. If that shape is ever genuinely needed it
 * belongs in EXEMPT, where it has to be argued for by name.
 */
function writesIn(file: string): Write[] {
  const source = readFileSync(file, "utf8");
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
 * Writes that may discard their error, each with the reason it is safe.
 *
 * Keyed by file and line-independent text, not by line number, which would go
 * stale on the next edit above it. Adding an entry here is a decision to be
 * argued for in the comment beside it, which is the point.
 */
const EXEMPT: Record<string, string> = {};

const FILES = sourceFiles(SRC);
const WRITES = FILES.flatMap(writesIn);

test("the sweep can still see the writes it is sweeping", () => {
  // Guards the walk and the match together. If either stops working every
  // assertion below passes over an empty list and this file tests nothing,
  // which is the failure mode that makes a green check worse than no check.
  assert.ok(FILES.length >= 40, `expected 40+ source files, walked ${FILES.length}`);
  assert.ok(WRITES.length >= 15, `expected 15+ Supabase writes, found ${WRITES.length}`);
});

test("every Supabase write looks at its own error", () => {
  const unchecked = WRITES.filter((w) => !w.checked).filter(
    (w) => !(`${w.file}:${w.text}` in EXEMPT),
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
