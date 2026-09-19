import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

/**
 * Every Supabase read must look at its own error.
 *
 * postgrest-js does not throw. A read that failed comes back as
 * `{ data: null, error: {...} }`, so `const { data } = await db.from(...)` is
 * indistinguishable from a read that succeeded and found nothing - and the code
 * after it then states the wrong one of those two as a fact. Found in eleven
 * places on 19 September 2026, and it was never a cosmetic difference:
 *
 *  - the verify link redirected to "that link does not match a report we hold,
 *    run a scan below", to somebody who had just proved their address, because
 *    a read did not answer;
 *  - the scan page rendered its 404 to somebody following the link to their own
 *    report;
 *  - the pipeline read no confirmed questions, so it wrote a fresh set and
 *    asked those instead - and the report only ever shows what was asked, so
 *    nobody outside could tell;
 *  - the gated pass wrote its engines over `engines_answered` rather than into
 *    it, so an unlocked report said the free engines had not answered;
 *  - `billedOnto` added this pass's spend to zero and wrote the total back,
 *    erasing what the earlier pass had cost - under the two ceilings that read
 *    those columns to bound the day's spend. That read is gone rather than
 *    fixed: the addition happens in the database now, through
 *    `note_scan_spend`, which also closes the overlap two correct reads still
 *    lost.
 *
 * A list of call sites written into this test would drift exactly the way the
 * comments promising "this is handled" drifted. So it reads the source and
 * asserts over what it finds, and every exemption below has to say why.
 */

/**
 * Plain paths rather than URLs. `src/app/scan/[token]` is a real directory here
 * and the WHATWG URL parser percent-encodes the brackets, so a URL-based walk
 * looks for `%5Btoken%5D` and does not find it - which would have quietly
 * skipped the scan route, the one this check most needs to read.
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

type Read = { file: string; line: number; destructure: string };

/**
 * Every `const { ... } = await <something>` whose bindings include `data` or
 * `count`.
 *
 * Deliberately not tied to `db.from(` or `supabaseAdmin()`: the call is spelled
 * several ways here - a bare `db`, a chained `supabaseAdmin()`, an `.rpc()` -
 * and a pattern that named them would miss the next spelling. What identifies a
 * Supabase result is the shape it is destructured into.
 *
 * `count` was added on 19 September 2026, and its absence is the more
 * instructive half of this file. The sweep matched `data` alone, so a read
 * written `.select("id", { count: "exact", head: true })` was invisible to it -
 * a head request returns no rows at all, so the only binding worth taking is
 * `count`. That shape is not an obscure corner: it is how every ceiling in this
 * codebase is counted, and three of the four call sites were ceilings. The
 * sweep reported no unchecked reads and was read as covering the reads, when
 * what it covered was one of the two shapes a read comes in.
 */
function readsIn(file: string): Read[] {
  const source = readFileSync(file, "utf8");
  // Posix-style so the keys in EXEMPT read the same on any machine.
  const name = relative(ROOT, file).split(sep).join("/");
  const out: Read[] = [];
  for (const m of source.matchAll(/const\s*(\{[^}]*\})\s*=\s*await\b/g)) {
    const destructure = m[1];
    if (!/\bdata\b/.test(destructure) && !/\bcount\b/.test(destructure)) continue;
    out.push({
      file: name,
      line: source.slice(0, m.index).split("\n").length,
      destructure: destructure.replace(/\s+/g, " ").trim(),
    });
  }
  return out;
}

/**
 * Reads that may discard their error, each with the reason it is safe.
 *
 * Keyed by file and the name `data` is bound to, not by line number, which
 * would go stale on the next edit above it. Adding an entry here is a decision
 * to be argued for in the comment beside it, which is the point.
 */
const EXEMPT: Record<string, string> = {
  // A failed cache read reads as a cache miss, so the visitor gets a fresh scan
  // rather than an error. That costs one scan and fails in the safe direction;
  // making it fatal would take the funnel down whenever the cache hiccuped.
  "src/app/api/scan/start/route.ts:cached":
    "a failed read is a cache miss, which is the safe direction",
  // Falls through to the insert below it, and the insert's own error is read.
  // An address that is neither insertable nor findable ends at the logged warn
  // at the bottom of resolveAccount.
  "src/lib/scan/unlock.ts:existing": "covered by the insert below it, which reads its error",
  "src/lib/scan/unlock.ts:raced": "the last read before resolveAccount's logged failure",
  // `if (!questionRows?.length) throw` on the next line. A failed read and an
  // empty table both stop the gated pass, which is the correct end for both.
  "src/lib/scan/pipeline.ts:questionRows": "throws on the next line either way",
};

/**
 * The local name the rows - or the count - came back as, which is how EXEMPT
 * keys a read.
 *
 * `data` first, because a read that binds both is a read for its rows. A head
 * request binds only `count`, and keying those as "data" too would have made
 * every one of them collide on a single key per file - so one exemption would
 * have silently excused all of them.
 */
function boundName(destructure: string): string {
  const data = /\bdata\s*:\s*(\w+)/.exec(destructure);
  if (data) return data[1];
  if (/\bdata\b/.test(destructure)) return "data";
  const count = /\bcount\s*:\s*(\w+)/.exec(destructure);
  if (count) return count[1];
  return "count";
}

const FILES = sourceFiles(SRC);
const READS = FILES.flatMap(readsIn);

test("the sweep can still see the reads it is sweeping", () => {
  // Guards the regex and the walk together. If either stops working, every
  // assertion below passes over an empty list and this file tests nothing -
  // which is the failure mode that makes a green check worse than no check.
  assert.ok(FILES.length >= 40, `expected 40+ source files, walked ${FILES.length}`);
  assert.ok(READS.length >= 20, `expected 20+ destructured awaits binding data, found ${READS.length}`);
});

test("every Supabase read looks at its own error", () => {
  const unchecked = READS.filter((r) => !/\berror\b/.test(r.destructure)).filter(
    // hasOwn, not `in`: EXEMPT is a plain object keyed by a string built out of
    // a file path and an identifier, so `in` would answer true for a read bound
    // to `constructor` or `toString` and excuse it without an entry.
    (r) => !Object.hasOwn(EXEMPT, `${r.file}:${boundName(r.destructure)}`),
  );

  assert.deepEqual(
    unchecked.map((r) => `${r.file}:${r.line} ${r.destructure}`),
    [],
    "these reads discard their error, so a failed read is indistinguishable from an empty one",
  );
});

test("every exemption still points at a read that exists", () => {
  // An exemption left behind after its call site moves is a hole nobody can
  // see. The list has to stay honest in both directions.
  for (const key of Object.keys(EXEMPT)) {
    const [file, bound] = key.split(":");
    const found = READS.some((r) => r.file === file && boundName(r.destructure) === bound);
    assert.ok(found, `EXEMPT lists ${key}, but there is no such read any more - delete the entry`);
  }
});
