import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { blankComments, sourceFiles } from "../source-read.mts";

/**
 * A stored engine list must be COUNTED by whatever validated it.
 *
 * ## What this is, and why `engine-list-readers` could not see it
 *
 * That sweep walks the bare `.filter(isEngine)` idiom and asks whether each one
 * dedupes. It is the right rule and it holds. But its header claims something
 * wider than its walk - "every reader of a stored engine list goes through one
 * door" - and the walk is keyed on the shape of the FIX rather than on the shape
 * of the READ. A reader that never filters at all is invisible to it, and that
 * is one layer below where it was looking. Same species as `mail-doors` missing
 * a route that reached Resend one hop away.
 *
 * ## The defect it was written against, which was live
 *
 * `ScanFlow.tsx` holds `gatedEngines` - the `scans.gated_engines` jsonb column,
 * straight off the row on first render and off the poll after that. It names
 * those engines through `engineLabels`, which goes through `knownEngines` and so
 * drops anything this build does not know. It then counted the RAW array at five
 * sites (`gatedEngines.length`) to decide whether to say anything at all.
 *
 * The two disagree exactly when the column holds a name that is not an engine -
 * an ordinary state for a hand-editable jsonb column, and this repo has already
 * typed `google_ai` for `google_aio` once. Then the length is 1, so the branch
 * fires, and the names are "", so the sentence on the gate that takes the
 * visitor's email address renders as:
 *
 *   "Unlock the full report, plus "
 *   "... and every page it cited for each, plus the same questions put through ."
 *
 * A clause that stops mid-sentence, on the one surface in this funnel whose job
 * is to say what the address buys.
 *
 * ## Why the rule is shaped like this
 *
 * The structural tell is general and worth more than the instance: **a
 * validating call whose result is bound to a name protects everything that uses
 * the new name; a validating call buried in a helper that returns something else
 * protects nothing, because the caller still holds the unvalidated list.**
 *
 * `HeroSequence`, `reading.ts` and `reading-figures.ts` all do the first thing -
 * `const engines = knownEngines(p.engines)` - and count the rebound name.
 * `ScanFlow` did the second: `engineLabels` takes the list, validates it inside
 * itself, and hands back a STRING, so `gatedEngines` was never narrowed for the
 * caller.
 *
 * So the walk follows the wrapper. A local function whose body calls a
 * validating function on one of its own parameters is itself validating - one
 * hop, which is what this tree has. If a second hop ever appears, rule 3's floor
 * is what notices that the set of doors stopped growing.
 *
 * ## What this walk cannot see, asked of itself while its denominator was still
 * in my head
 *
 * **The denominator is files that already mention the door.** A file that reads
 * a stored engine column and has never heard of `knownEngines` is invisible to
 * every rule here - which is the same shape as the gap this sweep was written to
 * close, one level out. Walked by hand on 20 Sep 2026, and there is no second
 * live instance:
 *
 * - `admin/scans/page.tsx` counts `engines` and `engines_answered` raw, and that
 *   is deliberate and must stay. It is the page an operator opens to SEE a
 *   duplicated row, so narrowing the figure would hide the symptom it exists to
 *   show. Recorded here so a later run does not "fix" it.
 * - `coverage-check/[token]/page.tsx` counts `reading.engines`, which
 *   `reading.ts` has already bound through the door - a validated count one file
 *   away, not a raw one.
 * - `scan/[token]/page.tsx` reads both columns raw and passes them as props. It
 *   is narrowed at render by the component that draws them, which is where the
 *   defect above was fixed.
 *
 * The rule that outlives this file: **a walk keyed on a fix can only see the
 * files that already have one.**
 */

const FILES = sourceFiles(".").filter((f) => /\.tsx?$/.test(f));

/** The door. `engines.ts` records why it lives there rather than beside a page. */
const DOOR = "knownEngines";

/** An argument we can reason about: a plain name or a dotted path off one. */
const PATH = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;

/**
 * The argument as written, with the noise a stored column is read through cut.
 *
 * `knownEngines(current.engines as string[] | null)` is the same read as
 * `knownEngines(engines)`; the cast is how a jsonb column is typed at the point
 * it is read and it says nothing about what is being counted.
 */
function argPath(raw: string): string | null {
  const cut = raw
    .replace(/\bas\b[\s\S]*$/, "")
    .replace(/\?\?[\s\S]*$/, "")
    .replace(/[()]/g, "")
    .trim();
  return PATH.test(cut) ? cut : null;
}

/**
 * The block a call sits in, by brace balance rather than by a line window.
 *
 * A window is a number somebody has to keep in step with the block, and it
 * fails in the flattering direction - a count that drifts past it reads as
 * validated. Balance cannot drift. Scoping to the block is also what keeps this
 * rule off `reading-figures.ts`, which calls the door in one function and counts
 * a DIFFERENT `engines` binding in another; a file-wide rule reports that file
 * and the obvious fix is an exemption that then excuses a real one.
 */
function blockAround(src: string, at: number): string {
  let depth = 0;
  let open = -1;
  for (let i = at; i >= 0; i--) {
    const ch = src[i];
    if (ch === "}") depth++;
    else if (ch === "{") {
      if (depth === 0) {
        open = i;
        break;
      }
      depth--;
    }
  }
  if (open === -1) return src;
  let d = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") d++;
    else if (src[i] === "}") {
      d--;
      if (d === 0) return src.slice(open, i + 1);
    }
  }
  return src.slice(open);
}

/** Every `NAME(` call in one file, with the argument text and its index. */
function callsTo(src: string, name: string): { arg: string; index: number }[] {
  const out: { arg: string; index: number }[] = [];
  const re = new RegExp(`(?<![\\w$.])${name}\\(([^()]*(?:\\([^()]*\\))?[^()]*)\\)`, "g");
  for (const m of src.matchAll(re)) out.push({ arg: m[1], index: m.index });
  return out;
}

/**
 * The validating functions in one file: the door, plus any local wrapper that
 * puts one of its own parameters through a validating one.
 *
 * Derived per file rather than typed. A typed list of wrappers is the species
 * this repo keeps finding - `77c842e` wrote a sweep to close a denominator gap
 * and typed its own denominator, which was already wrong about one of its four
 * members.
 */
function validatorsIn(src: string): Set<string> {
  const found = new Set<string>([DOOR]);
  // One pass per hop, so a wrapper declared above the door's import still
  // resolves. Two passes is one more than this tree needs; the floor in rule 3
  // is what reports the day a third hop appears.
  for (let pass = 0; pass < 2; pass++) {
    for (const m of src.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)) {
      const [, fn, params] = m;
      if (found.has(fn)) continue;
      const names = params
        .split(",")
        .map((p) => p.trim().split(/[:=\s]/)[0].trim())
        .filter((p) => PATH.test(p));
      if (!names.length) continue;
      const body = blockAround(src, src.indexOf("{", m.index + m[0].length) + 1);
      for (const v of found) {
        if (callsTo(body, v).some((c) => names.includes(argPath(c.arg) ?? ""))) {
          found.add(fn);
          break;
        }
      }
    }
  }
  return found;
}

/** Is `X.length` read anywhere in this block? */
function countsRaw(block: string, path: string): boolean {
  const esc = path.replace(/\./g, "\\.");
  return new RegExp(`(?<![\\w$.])${esc}\\.length\\b`).test(block);
}

/**
 * Names bound to the RESULT of a validating call - `const gated = knownEngines(raw)`.
 *
 * Counting one of these is the thing this rule is asking for, so it must not
 * report it. Without this the fix for the defect below fails the rule that found
 * it: the fixed shape passes the narrowed list to `engineLabels` and counts the
 * narrowed list, which is two validated reads of one name and exactly right.
 *
 * This is the half that makes the rule a rule rather than a ban on calling the
 * door twice, and it is worth saying which direction it fails in: a name wrongly
 * believed validated is waved through. It is bound to the literal call, so the
 * only way to earn it is to actually make one.
 */
function validatedBindings(src: string, validators: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const v of validators) {
    for (const m of src.matchAll(new RegExp(`(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*${v}\\(`, "g"))) {
      out.add(m[1]);
    }
  }
  return out;
}

/** Every place a stored engine list is validated, and whether it is also counted raw. */
function findings(): { where: string; path: string }[] {
  const out: { where: string; path: string }[] = [];
  for (const file of FILES) {
    const src = blankComments(readFileSync(file, "utf8"));
    if (!src.includes(DOOR)) continue;
    const validators = validatorsIn(src);
    const validated = validatedBindings(src, validators);
    for (const v of validators) {
      for (const call of callsTo(src, v)) {
        const path = argPath(call.arg);
        if (!path) continue;
        if (validated.has(path)) continue;
        const before = src.slice(Math.max(0, call.index - 80), call.index);
        // `engines = knownEngines(engines)` narrows the name it counts. That is
        // the shape this rule exists to require, not to report.
        if (new RegExp(`(?:const|let|var)?\\s*${path.replace(/\./g, "\\.")}\\s*=\\s*$`).test(before)) continue;
        const block = blockAround(src, call.index);
        if (countsRaw(block, path)) {
          out.push({ where: `${file}:${src.slice(0, call.index).split("\n").length}`, path });
        }
      }
    }
  }
  return out;
}

test("nothing counts a stored engine list it only validated on the way to a sentence", () => {
  assert.deepEqual(
    findings().map((f) => `${f.where} counts ${f.path}.length raw`),
    [],
    "an engine list is named through knownEngines and counted without it - the gate and the sentence beside it " +
      "disagree the moment the column holds a name this build does not know",
  );
});

test("the walk still finds the doors it is walking", () => {
  /**
   * A floor, because every part of this rule fails silently by finding nothing:
   * a renamed door, a wrapper shape the regex stops matching, or a block walk
   * that returns the wrong span all report a clean tree.
   */
  let calls = 0;
  let wrappers = 0;
  for (const file of FILES) {
    const src = blankComments(readFileSync(file, "utf8"));
    if (!src.includes(DOOR)) continue;
    const validators = validatorsIn(src);
    wrappers += validators.size - 1;
    for (const v of validators) calls += callsTo(src, v).filter((c) => argPath(c.arg)).length;
  }
  assert.ok(calls >= 6, `the walk found only ${calls} validated engine reads - it has stopped seeing them`);
  assert.ok(wrappers >= 1, "the walk found no local wrapper around the door, which is the hop the defect hid in");
});

test("the block walk scopes to a block, not to a file", () => {
  /**
   * The property that keeps this rule off correct code, asserted rather than
   * assumed. `reading-figures.ts` calls the door on a parameter in one function
   * and counts a different binding of the same NAME in another, so a file-wide
   * version of this rule reports it. Held here because the day it stops being
   * true, the failure lands as a false positive on a correct file and the
   * obvious fix is an exemption that then excuses a real one.
   */
  const file = "src/lib/coverage/reading-figures.ts";
  const src = blankComments(readFileSync(file, "utf8"));
  assert.ok(src.includes("knownEngines(engines)"), `${file} no longer calls the door on a bare parameter`);
  assert.match(src, /(?<![\w$.])engines\.length\b/, `${file} no longer counts an engines binding of its own`);
  assert.deepEqual(
    findings().filter((f) => f.where.startsWith(file)),
    [],
    `${file} is correct and this rule reports it, so the scoping has widened to the file`,
  );
});
