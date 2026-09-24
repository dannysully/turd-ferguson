import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { blankComments, sourceFiles } from "../source-read.mts";

/**
 * Every caller of a gate read has a branch for its throw.
 *
 * ## The property, and why it is a caller rule rather than a value rule
 *
 * `opportunityShape` and `buildUnlockPayload` both used to swallow a failed
 * `scan_answers` read and hand back an empty set. An opportunity is a page
 * cited for an answer the brand was *absent* from, and absence is only
 * knowable from the answer row - so an empty answer set produces exactly what
 * a scan with nothing to place into produces. **A database fault and a real
 * finding of zero were the same number on the gate**, and zero is the number
 * that tells a visitor there is nothing behind it worth an address.
 *
 * `opportunities.test.mts` holds the value half - empty answers really do
 * derive to nothing, which is why the read must not degrade to it. Both
 * functions throw now instead. That fix moved the obligation onto the callers,
 * and **nothing in this tree read the callers**: a new call written bare turns
 * a database blip into an unhandled 500 on `/scan/<token>` - the one path the
 * verify email's link actually takes - or on the request that has just taken
 * somebody's address. `npx tsc --noEmit` cannot see it, because a function
 * that throws has the same type as one that does not.
 *
 * ## The census belongs here and not in a comment
 *
 * `unlock.ts` said "all three callers already have the branch for it" inside
 * `opportunityShape`, which has two. The count was right about
 * `buildUnlockPayload` and had drifted onto the wrong function - the shape
 * this repo keeps finding, a true clause and a false one in one sentence,
 * reading as settled. A count in prose cannot notice a fourth caller either
 * way; this walks for them.
 */

/** The reads that throw rather than degrading to an empty result. */
const GATE_READS = ["opportunityShape", "buildUnlockPayload"] as const;

/** Where they are declared. A declaration is not a call. */
const DECLARED_IN = "src/lib/scan/unlock.ts";

const FILES = sourceFiles(".").filter((f) => /\.tsx?$/.test(f) && f !== DECLARED_IN);

type Call = { file: string; fn: string; index: number; line: number };

/**
 * Every call to a gate read in shipping source.
 *
 * `await <fn>(` rather than the bare name, so an import line, a doc comment
 * that names the function (there are eight of those across the tree) and a
 * type-only reference are not counted as calls. Comments are blanked first
 * regardless - the cut this repo has paid for nine times - because three of
 * those mentions sit in prose *about* the throw and would otherwise be read as
 * the thing they describe.
 */
function callsIn(file: string): Call[] {
  const src = blankComments(readFileSync(file, "utf8"));
  const out: Call[] = [];
  for (const fn of GATE_READS) {
    for (const m of src.matchAll(new RegExp(`await ${fn}\\(`, "g"))) {
      out.push({ file, fn, index: m.index, line: src.slice(0, m.index).split("\n").length });
    }
  }
  return out;
}

/**
 * Is this offset inside a `try { ... } catch`?
 *
 * Brace-matched from the nearest preceding `try {` rather than measured in
 * lines. A line window would be a number somebody has to keep in step with the
 * length of the block, and it fails in the flattering direction: a call that
 * drifts past the window reads as unguarded and gets an exemption, which then
 * excuses the real bare call that lands there later.
 */
function insideTryCatch(src: string, at: number): boolean {
  const open = src.lastIndexOf("try {", at);
  if (open === -1) return false;

  let depth = 0;
  let close = -1;
  for (let i = open + "try ".length; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close === -1 || at > close) return false;
  // `catch (err)` and `catch` with no binding are both guards. The first draft
  // demanded the parenthesis, and the injection harness caught it: a
  // green-expected new caller written with a bare `catch {` was reported as
  // unguarded. An optional binding has been legal for years and reads as the
  // tidier form when the error is not used.
  return /^\s*catch\s*[({]/.test(src.slice(close + 1));
}

test("every call to a gate read is inside a try/catch", () => {
  const bare: string[] = [];
  let seen = 0;

  for (const file of FILES) {
    const src = blankComments(readFileSync(file, "utf8"));
    for (const c of callsIn(file)) {
      seen++;
      if (!insideTryCatch(src, c.index)) bare.push(`${c.file}:${c.line} ${c.fn}`);
    }
  }

  // A floor on the walk, derived from nothing but the walk itself: a probe
  // that stopped matching would report a clean tree, which is how a tripwire
  // passes because it is blind. Five until 24 September 2026; four now, the
  // fifth having been the verify route's call, deleted with the email gate.
  assert.ok(seen >= 4, `the walk found only ${seen} gate-read calls - it has stopped seeing them`);
  assert.deepEqual(
    bare,
    [],
    "a gate read is called with no branch for its throw - a failed read will 500 instead of degrading",
  );
});

test("both gate reads still throw rather than returning an empty result", () => {
  /**
   * The other end of the same claim, and without it the rule above is a rule
   * about try/catch. If either function went back to swallowing its read
   * error, every caller's branch would be dead code and the gate would be
   * reporting a fault as a finding of zero again with all of this still green.
   */
  const src = blankComments(readFileSync(DECLARED_IN, "utf8"));

  /**
   * Counted, not matched. The first draft asserted each name threw *somewhere
   * in the file* and the injection harness reported MISSED: `opportunityShape`
   * and `buildUnlockPayload` read the same two tables, so there are two throw
   * blocks per error name, and deleting one left the other satisfying the
   * rule. That is the "a check satisfied by `headerSafe` appearing somewhere
   * in this module" failure `contact.test.mts` records, one file over.
   *
   * One per gate read, so the expected count is the number of gate reads.
   */
  for (const err of ["answersErr", "questionsErr"]) {
    const thrown = [...src.matchAll(new RegExp(`if \\(${err}\\) \\{\\s*throw new Error\\(`, "g"))].length;
    assert.equal(
      thrown,
      GATE_READS.length,
      `${err} is thrown on in ${thrown} place(s), not ${GATE_READS.length}` +
        " - a gate read went back to swallowing it, and its callers' branches are now dead code",
    );
  }
});

test("each gate read has at least one caller", () => {
  /**
   * The reverse direction, which is the one this repo has paid for twelve
   * times: a rule that is right about every caller it finds says nothing about
   * a function whose callers have all gone. A gate read nobody calls is either
   * dead code or a deleted caller, and both are worth knowing.
   */
  for (const fn of GATE_READS) {
    const callers = FILES.flatMap((f) => callsIn(f)).filter((c) => c.fn === fn);
    assert.ok(callers.length > 0, `${fn} is declared and called by nothing`);
  }
});
