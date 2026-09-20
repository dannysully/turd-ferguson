/**
 * The readers more than one sweep in this tree needs, in one place.
 *
 * Not a test - `npm run check` globs `src/**` + `/*.test.mts`, so this is a
 * helper the way `src/app/dynamic-render.mts` is. That distinction is the
 * whole reason the file exists: `mail-from.test.mts` first imported
 * `sendCalls` out of `email-header.test.mts` directly, which works, and
 * silently made node run that entire suite twice - once as its own file and
 * once through the import. A shared reader belongs beside the tests rather
 * than inside one of them.
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Every shipped source file under `src`, as posix paths from the repo root.
 *
 * A walk, never a typed list, and never `git ls-files`. Both failures have
 * been paid for here: a typed list cannot report the member absent from it -
 * which is how `DASH_EXEMPT` sat outside both of `copy.test.mts`'s exemption
 * audits, and how `price-schema`'s own "one reader" rule came to name two
 * filenames while asking a question about the tree - and `git ls-files` misses
 * anything not yet added, because `npm run check` runs before `git add`.
 *
 * Tests are excluded. A sweep asking "does any shipped file do X" that reads
 * the test written to forbid X reports the guard as the defect, which is the
 * comment-strip failure one level up.
 *
 * Three private copies of this walk already exist, in `client-results`,
 * `verbatim-claims` and `mail-doors`. They are deliberately not collapsed into
 * this one, for the reason recorded under `code` about the six strippers: a
 * reader that differs in one case blinds the sweep that depended on that case,
 * and three at once is not a change to make beside a finding. New callers use
 * this.
 */
export function sourceFiles(root: string): string[] {
  const out: string[] = [];
  (function walk(dir: string, prefix: string) {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      const rel = `${prefix}${entry.name}`;
      if (entry.isDirectory()) walk(join(dir, entry.name), `${rel}/`);
      else if (/\.(tsx?|mts)$/.test(entry.name) && !entry.name.includes(".test.")) out.push(rel);
    }
  })("src", "src/");
  return out;
}

/**
 * Source with its prose removed.
 *
 * This cut has been paid for seven times in this tree and twice inside the
 * test written to stop it. `0a3aa9e` is the sharpest instance: the assertion
 * that `ToConfirm` still renders a `<mark>` came back MISSED because that
 * component's own doc comment contains `<mark>` while explaining the defect,
 * so prose describing the code satisfied the check that the code was there.
 * The seventh was `readiness.test.mts` on 20 Sep, reporting a sender as still
 * reading `process.env.SCAN_FROM_EMAIL` because its doc comment quoted the
 * line it used to have.
 *
 * Six private copies of this existed before this file. They are not
 * consolidated here in one go - a stripper that differs in one case blinds
 * the sweep that depended on that case, and six at once is not a change to
 * make in the same push as the finding that prompted it. New callers use
 * this one.
 */
export function code(src: string): string {
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

/**
 * The same cut as `code`, with the line numbering left intact.
 *
 * A comment line becomes an empty line rather than disappearing, so
 * `src.slice(0, i).split("\n").length` still answers the line a reader would
 * open the file at. `code` cannot do that - it drops lines - and a sweep that
 * reports `file:line` needs both properties at once.
 *
 * Deliberately a second function rather than a flag on the first. The six
 * private strippers in this tree are not consolidated for the reason recorded
 * above, and the way to honour that is not to give the shared one a mode that
 * changes what its existing callers get.
 *
 * Written for `reads.test.mts` and `writes.test.mts`, which both report a line
 * and both read prose as code today - measured 20 Sep 2026, in the two
 * directions a sweep can be wrong:
 *
 *  - `writes.test.mts` decides a write is safe by looking for a `const { ...
 *    error ... } = await` in the eight lines above it, and finds one in a doc
 *    comment. An unchecked write with prose above it describing the checked
 *    idiom is reported as checked. That is the silent direction, and the
 *    eighth time this cut has been paid for here;
 *  - `reads.test.mts` matches the destructure itself, so a comment quoting
 *    `const { data } = await ...` is reported as an unchecked read. That is
 *    the noisy direction, and it is not harmless: the obvious fix is an EXEMPT
 *    entry, which then excuses the real read that lands on that key later.
 */
export function blankComments(src: string): string {
  const out: string[] = [];
  let open = false;
  for (const line of src.split("\n")) {
    const t = line.trim();
    if (open) {
      if (t.includes("*/")) open = false;
      out.push("");
      continue;
    }
    if (t.startsWith("{/*") || t.startsWith("/*")) {
      if (!t.includes("*/")) open = true;
      out.push("");
      continue;
    }
    out.push(t.startsWith("*") || t.startsWith("//") ? "" : line);
  }
  return out.join("\n");
}

/**
 * Every `emails.send({ ... })` in a file, sliced out by its own braces.
 *
 * Per call rather than per file, which is the lesson `contact.test.mts`
 * records about its own error returns: a rule satisfied by "headerSafe
 * appears somewhere in this module" is satisfied by the correct send while
 * the one beside it drops it. `verify-email.ts` has two sends and is exactly
 * that file.
 *
 * Read by two sweeps that ask different questions of the same set -
 * `email-header.test.mts` reads each send's subject, `mail-from.test.mts`
 * reads its From - and shared rather than copied so the two cannot come to
 * disagree about what a send is. Both carry a floor, so a narrowing here
 * fails in both rather than reading as a clean tree in either.
 */
export function sendCalls(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/emails\.send\(/g)) {
    const open = source.indexOf("{", m.index);
    if (open === -1) continue;
    let depth = 0;
    for (let i = open; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}" && --depth === 0) {
        out.push(source.slice(open, i + 1));
        break;
      }
    }
  }
  return out;
}
