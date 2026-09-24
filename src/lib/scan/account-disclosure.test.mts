import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { code, liveSqlFunctions, sourceFiles } from "../source-read.mts";

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

// ------------------------------------------------------------- the SQL half

/**
 * Same claim, same column, the other language.
 *
 * Rule 1 above says "nothing in this tree selects `*`" and walks `src` for
 * `.ts` and `.tsx`. The header calls that green "across the whole tree". It is
 * not the whole tree: **`scan_teaser` reads `from scans s`**, and `scans` is
 * the table `account_id` is a column of. Every rule above stops at the edge of
 * the `.sql` files, which is this repo's most-paid denominator failure - the
 * same edge `citations.test.mts` was standing on until `aadfd06`, and the same
 * shape as `spend-gates` claiming "every door in this tree" while walking
 * `src/app/api` for `route.ts`.
 *
 * ## Why the SQL side is the more exposed one, not the lesser one
 *
 * Measured off the migrations rather than remembered: of the six live
 * functions, **`scan_teaser` is the only one granted to `anon`**, and it is
 * `security definer`, so it runs with the owner's rights and ignores RLS. The
 * other five are `service_role` only and are reachable from this tree alone.
 * The grants themselves are held by `function-grants.test.mts`; what matters
 * here is the consequence - `scan_teaser` is the function behind the public
 * scan report, callable by anybody holding a public token, and it selects from
 * the account-bearing table.
 *
 * So the one-character edit rule 1 exists to refuse has an exact counterpart
 * here, and it is *cheaper* to make. The TypeScript version is
 * `.select("*")`. The SQL versions are two:
 *
 *  - `select c.*` inside one of the six `jsonb_agg(t)` sub-selects. Those
 *    aggregate a whole derived row by alias, so widening the sub-select's
 *    column list widens the published JSON with no other edit.
 *  - `to_jsonb(s)` or `row_to_json(s)` in place of the twenty-key
 *    `jsonb_build_object`. That reads as a simplification, shortens the
 *    function by ninety lines, and publishes every column of `scans` -
 *    `account_id`, `ip_hash` and `client_domain_id` included - to an
 *    anonymous caller.
 *
 * Neither fails a build, neither moves a TypeScript type, and rules 1 to 5
 * cannot see either.
 *
 * ## What these three rules are, and what they are not
 *
 * They are keyed on the shape of the query, the way the TypeScript rules are
 * keyed on the shape of the select. They cannot tell you a function is
 * *correct*; they refuse the two constructions that publish a column nobody
 * chose to publish, and they pin the denominator so the next function joins
 * loudly.
 *
 * `jsonb_agg(t)` is deliberately NOT forbidden. It is a whole-row
 * serialisation of a derived alias and the tree has six of them, every one
 * legitimate because the sub-select under it names its columns. Forbidding it
 * would fail on a clean tree, which is a rule written to be exempted rather
 * than heeded. The star rule below is what actually guards those six, and it
 * guards them at the only place the widening can happen.
 *
 * The star pattern is anchored at the column-list position - `select *` and
 * `select c.*`, never `count(*)`, which appears fourteen times in
 * `scan_teaser` alone and is not a whole-row read. That narrowing is the one
 * thing here most likely to be wrong in the flattering direction, so
 * `docs/inject-account-sql.mjs` proves it from both sides: a real `select c.*`
 * must be caught, and the existing `count(*)` must not be.
 */

/**
 * The tables a read of which can put the column, or the identity behind it, in
 * a function's hands.
 *
 * **Derived, because the first draft of this rule typed them.** That draft
 * listed `scans`, `leads`, `client_domains` and `accounts` from the four
 * `account_id` lines in front of whoever wrote it - which is the typed
 * denominator inside a sweep, the species this repo has paid for three times
 * in one sitting, arriving in the file written to close a denominator gap.
 * A table added tomorrow with an `account_id` on it would have been outside
 * it, and the rule would have stayed green while reporting on the tree.
 *
 * Two kinds of table qualify and the second is why `accounts` is here at all:
 * a table carrying the column, and the table the column points *at*, since
 * publishing `accounts.id` is the same disclosure spelled the other way.
 */
function bearerTables(): string[] {
  const sql = migrationSources().join("\n");
  const found = new Set<string>();
  for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\)\s*;/gi)) {
    if (new RegExp(`\\b${COLUMN}\\b`).test(m[2]!)) found.add(m[1]!.toLowerCase());
    // The referenced side, taken from the same declaration rather than assumed.
    for (const r of m[2]!.matchAll(new RegExp(`\\b${COLUMN}\\b[^,]*?references\\s+(?:public\\.)?(\\w+)`, "gi"))) {
      found.add(r[1]!.toLowerCase());
    }
  }
  return [...found].sort();
}

/** Every migration as written, for the table declarations the function walk drops. */
function migrationSources(): string[] {
  const dir = join(ROOT, "supabase", "migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(dir, f), "utf8").replace(/--[^\n]*/g, ""));
}

const BEARERS = bearerTables();

/** A `select` that takes every column, never `count(*)`. */
const SQL_STAR = /\bselect\s+(?:distinct\s+)?(?:\w+\.)?\*/gi;

/** A whole row serialised by alias, never `to_jsonb(s.engines)`. */
const SQL_WHOLE_ROW = /\b(?:to_jsonb|row_to_json)\s*\(\s*([A-Za-z_]\w*)\s*\)/gi;

/**
 * The live SQL functions that read a table carrying the column, and why each
 * cannot publish it.
 *
 * All six of them do, which is the point rather than an accident: every
 * function in this schema either reads or writes `scans` or `leads`. A rule
 * that pinned "the ones that touch it" would therefore pin everything and say
 * nothing, so what each entry records is the thing that actually keeps the
 * column off the wire - the return type, and for the one public function, the
 * fact that it hand-builds its object key by key.
 */
const SQL_READERS: Record<string, string> = {
  scan_teaser:
    "The public scan report. security definer and the only function granted to anon, so " +
    "this is the one place a whole-row read reaches somebody who is not us. Returns jsonb " +
    "built key by key with jsonb_build_object; the outer row `s` is never serialised whole.",
  scan_source_coverage:
    "The admin source counts. service_role only, and `returns table (scan_id, " +
    "cited_domains, classified_domains)` - a named three-column shape a widened select " +
    "cannot leak through.",
  note_scan_spend:
    "The spend accumulator. service_role only, `returns table` with its columns named.",
  note_preview_call:
    "The per-scan call reservation. service_role only, returns integer.",
  note_preview_calls:
    "The same reservation in bulk. service_role only, returns void.",
  note_verify_send:
    "The verify-send ceiling on leads. service_role only, returns integer - and the one " +
    "whose own migration records being security definer with no revoke as the defect it " +
    "was written to fix.",
};

test("the SQL walk can see the functions it is sweeping", () => {
  const live = liveSqlFunctions(ROOT);
  // A parse that found no bodies is the same green as a clean schema.
  assert.ok(live.size >= 6, `expected 6+ live SQL functions, parsed ${live.size}`);
  // And it has to have taken the LAST definition. scan_teaser is written five
  // times; the live one is the only one carrying google_rank.
  assert.match(
    live.get("scan_teaser")!.body,
    /google_rank/,
    "liveSqlFunctions returned a superseded scan_teaser - apply order has stopped working",
  );
  // And the derived table list, which every rule below is scoped by. A parse
  // that found no tables makes the reader rule vacuous, and a derivation is
  // exactly the thing that can go quiet without anybody editing it.
  assert.deepEqual(
    BEARERS,
    ["accounts", "client_domains", "leads", "scans"],
    `the tables carrying ${COLUMN} have changed, or bearerTables has stopped parsing them`,
  );
});

test(`every live SQL function that reads a table carrying ${COLUMN} is recorded`, () => {
  const found = [...liveSqlFunctions(ROOT)]
    .filter(([, { body }]) =>
      BEARERS.some((t) => new RegExp(`\\b(?:from|join|update|into)\\s+(?:public\\.)?${t}\\b`, "i").test(body)),
    )
    .map(([fn]) => fn)
    .sort();

  assert.deepEqual(
    found,
    Object.keys(SQL_READERS).sort(),
    `a SQL function reads a table carrying ${COLUMN} and is on no list. Classify it here ` +
      "with what stops it returning the column - its return type, or its grants. As with " +
      "rule 2, the failure is meant to be a question rather than a bug report.",
  );
});

test("no live SQL function takes a whole row", () => {
  const offenders: string[] = [];

  for (const [fn, { file, body }] of liveSqlFunctions(ROOT)) {
    for (const m of body.matchAll(SQL_STAR)) {
      offenders.push(`${file} ${fn}: ${m[0].replace(/\s+/g, " ")}`);
    }
    for (const m of body.matchAll(SQL_WHOLE_ROW)) {
      offenders.push(`${file} ${fn}: ${m[0].replace(/\s+/g, " ")}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `a SQL function takes every column of a row. scan_teaser is security definer and ` +
      `granted to anon, so on that function this publishes ${COLUMN} to anybody holding a ` +
      "public token - the SQL spelling of the select(*) rule 1 refuses:\n  " +
      offenders.join("\n  "),
  );
});

test(`no live SQL function names ${COLUMN}`, () => {
  const offenders = [...liveSqlFunctions(ROOT)]
    .filter(([, { body }]) => new RegExp(`\\b${COLUMN}\\b`).test(body))
    .map(([fn, { file }]) => `${file} ${fn}`);

  assert.deepEqual(
    offenders,
    [],
    `a SQL function names ${COLUMN}. Filtering on it is legitimate and returning it is ` +
      "not, and the difference is not readable from the query text - so this fails either " +
      "way and wants a decision here, the way rule 3 does for a file that mentions it:\n  " +
      offenders.join("\n  "),
  );
});
