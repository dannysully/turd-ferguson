import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { code, sourceFiles } from "../source-read.mts";

/**
 * `account_id` never reaches a visitor.
 *
 * ## Why this is a claim about the code and not a tidiness rule
 *
 * `unlock.ts` records a real defect it fixed: `resolveAccount` matched a
 * stored address with `ilike`, which takes a SQL LIKE pattern. An underscore
 * matches any single character, so a stored `a_b@x.com` matched anything
 * submitted as `aXb@x.com` **and handed that visitor the other person's
 * account row**. Percent and asterisk are wildcards on the same path, all
 * three are legal in an address, and all three pass the route's regex - so it
 * needed no malformed input, an underscore was enough.
 *
 * The fix is `eq` on a lowercased address. What matters here is the sentence
 * that classifies what happened before the fix:
 *
 * > Nothing reads account_id back to a visitor today, so what this produced
 * > was wrong attribution rather than disclosure [...] It stops being only
 * > attribution the day there is an account view.
 *
 * That sentence is the whole difference between a mis-filed row and one
 * visitor being handed another's account identifier. **It was true, and it was
 * held by nothing** - the file names its own trigger ("the day there is an
 * account view") and has no way to notice that day arriving. A stated reason
 * for a safety property is a claim about the tree, and it costs a `holds` now,
 * the same device `organization-entity.test.mts` uses for the `sameAs`
 * absence and `mail-from.test.mts` uses to stop blocked.md 20 outliving its
 * answer.
 *
 * ## The mechanism, which is what rules 1 and 2 are actually about
 *
 * Nothing redacts anything here. `account_id` stays off the wire for one
 * reason only: **every read in this tree names its columns**, and the three
 * that name `account_id` happen to sit in routes that answer with a redirect
 * or with a hand-built body. There is no allow-list, no serializer and no
 * type standing between the column and a response.
 *
 * So the edit that falsifies the claim is not a new feature. It is one
 * character: a `.select("*")` on `scans` or `leads` puts `account_id` into the
 * row object, and both routes below are then one `...scan` away from
 * publishing it. That edit moves no type, fails no build and reads as a
 * simplification. Rule 1 is the one that catches it.
 *
 * ## What each rule is for
 *
 * 1. **Nothing selects `*`.** The mechanism above, stated once. Green today
 *    across the whole tree - measured, not assumed - and it is the cheapest
 *    way to lose the property.
 * 2. **The set of reads that bring `account_id` into memory is pinned, with a
 *    reason each.** Derived by walking `src` and resolving an identifier
 *    select back to the constant it names, so `.select(SCAN_UNLOCK_COLUMNS)`
 *    counts as a reader of every column that string contains. A fourth reader
 *    fails this file until somebody classifies it - the failure is meant to be
 *    a question, not a bug report.
 * 3. **The set of files that mention it at all is pinned.** Rule 2 sees
 *    database reads. A server component rendering `{scan.account_id}` is not a
 *    read, and a page is not a `Response.json` - so neither of the other rules
 *    would see the account view the comment warns about. This one does,
 *    because such a page has to name the column somewhere.
 * 4. **No row bound from one of those reads is ever spread.** The two routes
 *    name their own response fields today. `...scan` is the one-line edit that
 *    undoes that, and it is invisible to a reader who is looking at the select
 *    rather than at the response.
 * 5. **No response body anywhere in the tree names it.** Tree-wide rather than
 *    scoped to the two routes, for the reason `spend-gates` learned the hard
 *    way: a rule scoped to the files that have the property today cannot see
 *    the file that gains it tomorrow.
 *
 * ## What this cannot see, stated plainly
 *
 * A column reaching a visitor through a module the route imports for another
 * reason. `buildUnlockPayload` is the live instance of that shape - the unlock
 * response spreads `...payload` - and it is covered only because rule 2 walks
 * every select in the tree and that function's selects are not in the set. An
 * import is not a call, and this file does not build a call graph.
 *
 * Nothing here is a live defect. The tree is clean under all five rules and
 * each was proved against an injected instance before it was committed.
 */

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");

/** The column this file is about. Named once so a rule cannot drift from it. */
const COLUMN = "account_id";

type Source = { file: string; src: string };

/** Every shipped source file, prose removed. Tests are excluded by the walk. */
function shipped(): Source[] {
  return sourceFiles(ROOT).map((file) => ({
    file,
    src: code(readFileSync(join(ROOT, file), "utf8")),
  }));
}

/**
 * Every `const NAME = "..."` in the tree whose value is a column list naming
 * the column, as a set of identifier names.
 *
 * Resolved rather than special-cased: `SCAN_UNLOCK_COLUMNS` is shared by two
 * routes precisely so the list is written once, and a rule that only matched
 * inline strings would see neither of its readers.
 */
function columnConstants(files: Source[]): Set<string> {
  const names = new Set<string>();
  for (const { src } of files) {
    for (const m of src.matchAll(
      /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*(["'`])([^"'`]*)\2/g,
    )) {
      if (new RegExp(`\\b${COLUMN}\\b`).test(m[3])) names.add(m[1]);
    }
  }
  return names;
}

/** A `.select(...)` call: the file, the line, and the argument as written. */
type Select = { file: string; line: number; arg: string; index: number };

function selectsIn({ file, src }: Source): Select[] {
  const out: Select[] = [];
  for (const m of src.matchAll(/\.select\(\s*(["'`])([^"'`]*)\1|\.select\(\s*([A-Za-z_$][\w$]*)\s*[),]/g)) {
    out.push({
      file,
      line: src.slice(0, m.index).split("\n").length,
      arg: (m[2] ?? m[3] ?? "").replace(/\s+/g, " ").trim(),
      index: m.index,
    });
  }
  return out;
}

/**
 * The reads that bring the column into server memory, each with the reason it
 * cannot reach the person who made the request.
 *
 * Keyed on file and argument rather than on a line number: a line number
 * churns on every edit above it, and an entry that has to be renumbered to
 * keep the suite green is an entry nobody re-reads.
 */
const RECORDED: Record<string, string> = {
  'src/app/api/verify/[vtoken]/route.ts :: id, email, scan_id, account_id, verified_at':
    "The leads row behind a verify link. account_id is passed to resolveAccount and " +
    "nothing else; every exit from this route is a 302 redirect, so the route has no " +
    "body for a column to reach.",
  "src/app/api/verify/[vtoken]/route.ts :: SCAN_UNLOCK_COLUMNS":
    "The scan being unlocked, same route, same redirect-only exits.",
  "src/app/api/scan/[token]/unlock/route.ts :: SCAN_UNLOCK_COLUMNS":
    "The scan being unlocked. The success body names its own five fields and spreads " +
    "only buildUnlockPayload, whose own selects name no identity column - checked by " +
    "rule 2, which walks every select in the tree rather than these two files.",
};

/**
 * Every shipped file that mentions the column, and why it is allowed to.
 *
 * The write sites are the point of the column existing and are listed as
 * writes, so a rule cannot quietly start reading an insert payload as a
 * disclosure.
 */
const MENTIONED: Record<string, string> = {
  "src/lib/scan/unlock.ts":
    "Declares SCAN_UNLOCK_COLUMNS, and writes the column on the accounts and " +
    "client_domains rows. Writes, not reads: resolveAccount is the only thing that " +
    "inserts into accounts.",
  "src/app/api/verify/[vtoken]/route.ts":
    "Reads it to resolve the account behind a verified lead. Answers only with a redirect.",
  "src/app/api/scan/[token]/unlock/route.ts":
    "Reads it off the scan to seed resolveAccount, and writes it onto the new leads row. " +
    "The insert's own .select() asks for id and verify_token.",
};

test("nothing in this tree selects *", () => {
  const stars: string[] = [];
  for (const { file, src } of shipped()) {
    for (const m of src.matchAll(/\.select\(\s*(["'`])\s*\*\s*\1/g)) {
      stars.push(`${file}:${src.slice(0, m.index).split("\n").length}`);
    }
  }
  assert.deepEqual(
    stars,
    [],
    "a select(*) puts every column of the row into the object a route answers with, " +
      `which is how ${COLUMN} stops being unreachable without anybody editing a response:\n  ` +
      stars.join("\n  "),
  );
});

test(`every read of ${COLUMN} is recorded with the reason it cannot reach a visitor`, () => {
  const files = shipped();
  const constants = columnConstants(files);
  const found: string[] = [];

  for (const source of files) {
    for (const sel of selectsIn(source)) {
      const namesIt = new RegExp(`\\b${COLUMN}\\b`).test(sel.arg) || constants.has(sel.arg);
      if (namesIt) found.push(`${sel.file} :: ${sel.arg}`);
    }
  }

  const recorded = Object.keys(RECORDED).sort();
  assert.deepEqual(
    [...new Set(found)].sort(),
    recorded,
    `a read of ${COLUMN} is in nobody's list. Classify it here with the reason it ` +
      "cannot reach the person who made the request, or stop selecting the column.",
  );
});

test(`every file that mentions ${COLUMN} is recorded`, () => {
  const found = shipped()
    .filter(({ src }) => new RegExp(`\\b${COLUMN}\\b`).test(src))
    .map(({ file }) => file)
    .sort();

  assert.deepEqual(
    found,
    Object.keys(MENTIONED).sort(),
    `a shipped file names ${COLUMN} and is on no list. A page rendering it is neither a ` +
      "select nor a response body, so this is the only rule here that would see the " +
      "account view unlock.ts names as the day its own reasoning stops holding.",
  );
});

test(`no row read with ${COLUMN} on it is ever spread`, () => {
  const files = shipped();
  const constants = columnConstants(files);
  const offenders: string[] = [];

  for (const { file, src } of files) {
    /**
     * The variable each account-bearing read binds, as `const { data: NAME }`.
     *
     * Taken from the 200 characters in front of the `.select(`, which is where
     * the destructuring sits in every one of these call sites - the read is
     * always `const { data: x, error } = await db.from(...).select(...)`.
     */
    const bound = new Set<string>();
    for (const sel of selectsIn({ file, src })) {
      if (!(new RegExp(`\\b${COLUMN}\\b`).test(sel.arg) || constants.has(sel.arg))) continue;
      const before = src.slice(Math.max(0, sel.index - 200), sel.index);
      const decl = [...before.matchAll(/data\s*:\s*([A-Za-z_$][\w$]*)/g)].pop();
      if (decl) bound.add(decl[1]);
    }
    for (const name of bound) {
      if (new RegExp(`\\.\\.\\.\\s*${name}\\b`).test(src)) {
        offenders.push(`${file}: ...${name}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "these routes keep the column off the wire by naming their response fields one by " +
      `one. Spreading the row publishes ${COLUMN} with no edit to any select:\n  ` +
      offenders.join("\n  "),
  );
});

test(`no response body in this tree names ${COLUMN}`, () => {
  const offenders: string[] = [];

  for (const { file, src } of shipped()) {
    for (const m of src.matchAll(/(?:Next)?Response\.json\(/g)) {
      // The argument list, matched by counting parens so a nested object or a
      // second `{ status }` argument does not cut it short.
      let depth = 0;
      let end = m.index + m[0].length - 1;
      for (let i = end; i < src.length; i++) {
        if (src[i] === "(") depth++;
        else if (src[i] === ")") {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      const args = src.slice(m.index, end);
      if (new RegExp(`\\b${COLUMN}\\b`).test(args)) {
        offenders.push(`${file}:${src.slice(0, m.index).split("\n").length}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `a response names ${COLUMN}. That is the disclosure unlock.ts's own comment says ` +
      "this tree does not do, and it is the sentence that downgrades the ilike defect " +
      `from handing a visitor another account to mis-filing a row:\n  ` + offenders.join("\n  "),
  );
});
