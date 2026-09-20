import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

/**
 * Every database function has its default PUBLIC execute revoked, is granted
 * to a role by name, and every revoke and grant names the signature it means.
 *
 * **This rule is already written down. It is written down as prose, in a
 * comment, in the migration that exists because nobody was enforcing it.**
 * `20260919161000_note_verify_send_grants.sql` opens with:
 *
 *   > Every other function here is followed by
 *   >   revoke all on function ... from public;
 *   >   grant execute on function ... to <the roles that need it>;
 *   > and 20260919160000 had neither.
 *
 * That is a claim about this directory sitting in a comment, which is the
 * species this tree keeps paying for - `schema.ts` omitted `logo` because a
 * comment said there was no logo file, and `readiness.ts` was correct about
 * every key it named. A stated reason for a safety property is a claim about
 * the tree, and it costs a `holds`.
 *
 * **What the miss was worth, in that migration's own words.** Postgres grants
 * EXECUTE on a new function to PUBLIC by default and PostgREST exposes what
 * `anon` may execute, so `note_verify_send` - the counter behind the
 * verification resend ceiling, shipped `security definer` - was callable from
 * the open internet, with definer rights over the row-level security on
 * `leads`. It was a door left unlocked rather than open only because a lead id
 * is a uuid4. It was caught by a person reading one migration beside the
 * others, an hour after it shipped. Nothing would catch the next one.
 *
 * **Why it is not decoration.** All six functions are correct in the tree as it
 * stands, because 161000 fixed the one that was not. But these rules run
 * against the directory at whatever commit they are on, and at 20260919160000
 * `note_verify_send` was the last definition with no revoke anywhere - so this
 * file fails on that commit. It would have caught the defect it is written for,
 * which is the test `copy.test.mts` records failing.
 *
 * **The third rule is a different failure and a quieter one.** `create or
 * replace function` can only replace a function with the *same argument types*;
 * give it different ones and Postgres creates an **overload** instead, leaving
 * the old function in place with its old grants and its old body, and
 * PostgREST then has two candidates. A `revoke`/`grant` naming types that match
 * no function does not silently do nothing either - it raises, and these
 * migrations are applied by hand from this session with no CI in front of them,
 * so a mistyped signature is a migration that half-applies.
 */

const ROOT = path.resolve(import.meta.dirname, "../../..");
const MIGRATIONS = path.join(ROOT, "supabase/migrations");

const stripSql = (sql: string) => sql.replace(/--[^\n]*/g, "");

function balanced(src: string, open: number): string {
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "(") depth += 1;
    else if (src[i] === ")") {
      depth -= 1;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  throw new Error("unbalanced parentheses in a migration");
}

function topLevelItems(body: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of body) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      items.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) items.push(cur);
  return items.map((s) => s.trim()).filter(Boolean);
}

/** `p_dfs_cost numeric` -> `numeric`; `p_scans uuid[]` -> `uuid[]`. */
function paramType(param: string): string {
  const m = /^(?:in|out|inout|variadic\s)?\s*[a-z_][a-z_0-9]*\s+(.+?)(?:\s+default\b.*)?$/i.exec(param.trim());
  return (m ? m[1] : param).trim().toLowerCase().replace(/\s+/g, " ");
}

const sigKey = (types: string[]) => types.map((t) => t.trim().toLowerCase()).join(", ");

type Declaration = { file: string; types: string[]; definer: boolean };
type Privilege = { file: string; types: string[] };

const DECLS = new Map<string, Declaration[]>();
const REVOKED = new Map<string, Privilege[]>();
const GRANTED = new Map<string, { roles: string[]; types: string[]; file: string }[]>();

const push = <T,>(m: Map<string, T[]>, k: string, v: T) => m.set(k, [...(m.get(k) ?? []), v]);

for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
  const sql = stripSql(readFileSync(path.join(MIGRATIONS, file), "utf8"));

  for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\w+)\s*\(/gi)) {
    const open = m.index + m[0].length - 1;
    const params = topLevelItems(balanced(sql, open));
    // Everything between the close of the argument list and the body opener is
    // where `security definer` lives. Searching the whole file would read one
    // function's definer as every function's.
    const close = sql.indexOf(")", open + balanced(sql, open).length);
    const head = sql.slice(close, sql.indexOf("$$", close) + 1 || undefined);
    push(DECLS, m[1].toLowerCase(), {
      file,
      types: params.map(paramType),
      definer: /\bsecurity\s+definer\b/i.test(head),
    });
  }

  for (const m of sql.matchAll(/revoke\s+[\w\s,]+?\s+on\s+function\s+(?:public\.)?(\w+)\s*\(/gi)) {
    const body = balanced(sql, m.index + m[0].length - 1);
    const after = sql.slice(m.index + m[0].length + body.length);
    if (!/^\s*\)\s*from\s+public\b/i.test(after)) continue;
    push(REVOKED, m[1].toLowerCase(), { file, types: topLevelItems(body) });
  }

  for (const m of sql.matchAll(/grant\s+execute\s+on\s+function\s+(?:public\.)?(\w+)\s*\(/gi)) {
    const body = balanced(sql, m.index + m[0].length - 1);
    const to = /^\s*\)\s*to\s+([^;]+);/i.exec(sql.slice(m.index + m[0].length + body.length));
    if (!to) continue;
    push(GRANTED, m[1].toLowerCase(), {
      file,
      types: topLevelItems(body),
      roles: to[1].split(",").map((r) => r.trim().toLowerCase()),
    });
  }
}

/** The roles this project has. Anything else is a typo that grants nothing. */
const ROLES = new Set(["anon", "authenticated", "service_role", "postgres"]);

test("the sweep can see all three statement kinds", () => {
  // A parse that found no revokes passes "every function is revoked" only if it
  // also found no functions, and one that found no functions passes everything.
  // Both floors, and a known-good spot check on each map.
  assert.ok(DECLS.size >= 6, `expected 6+ functions, parsed ${DECLS.size}`);
  assert.ok(REVOKED.size >= 6, `expected revokes for 6+ functions, parsed ${REVOKED.size}`);
  assert.ok(GRANTED.size >= 6, `expected grants for 6+ functions, parsed ${GRANTED.size}`);
  assert.deepEqual(DECLS.get("note_scan_spend")?.[0]?.types, ["uuid", "integer", "numeric", "integer"]);
  assert.deepEqual(GRANTED.get("scan_teaser")?.[0]?.roles, ["anon", "authenticated"]);
  assert.ok(DECLS.get("scan_teaser")?.some((d) => d.definer), "scan_teaser is security definer");
});

test("every function has its default PUBLIC execute revoked", () => {
  /**
   * The rule 20260919160000 broke. Postgres grants EXECUTE to PUBLIC on
   * creation, so a function with no revoke is reachable by `anon` through
   * PostgREST whatever the row-level security on the tables under it says.
   *
   * Checked over the directory rather than per file on purpose: the fix for
   * `note_verify_send` landed in the migration *after* the one that declared
   * it, which is a legitimate shape and must stay one. What it may not do is
   * never land at all.
   */
  const open = [...DECLS.keys()].filter((fn) => !REVOKED.has(fn));
  assert.deepEqual(
    open,
    [],
    "these functions are executable by PUBLIC, so PostgREST exposes them to anon:\n" +
      open.map((fn) => `  ${fn} - declared in ${DECLS.get(fn)!.map((d) => d.file).join(", ")}`).join("\n") +
      "\nAdd: revoke all on function public.<fn>(<types>) from public;",
  );
});

test("every function is granted to a role this project has", () => {
  const bad: string[] = [];
  for (const fn of DECLS.keys()) {
    const grants = GRANTED.get(fn);
    if (!grants?.length) {
      // Revoked from public and granted to nobody is a function only the owner
      // can call, which the app - on the service role key - is not.
      bad.push(`${fn} is revoked from public and granted to no role, so nothing can call it`);
      continue;
    }
    for (const g of grants) {
      for (const role of g.roles) {
        if (!ROLES.has(role)) bad.push(`${g.file} grants ${fn} to "${role}", which is not a role here`);
      }
    }
  }
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("every revoke and grant names a function some migration declares", () => {
  /**
   * The direction the two rules above cannot see, and it was this file's own
   * blind spot before it was written: both of them walk `DECLS` and ask what
   * each declared function has, so a privilege statement naming a function that
   * does not exist is in nobody's loop. Found by injecting one and watching the
   * sweep report the tree clean - the same "of what it walks, what is it not
   * reading" question this file was written by asking of `writes.test.mts`.
   *
   * It is also what makes the `--` strip above load-bearing rather than
   * precautionary. This directory's comments quote `revoke`/`grant` statements
   * while explaining them, and 161000's header is three lines of exactly that.
   * Today those elide the function name to `...` and so match nothing; one
   * written out in full would be read as a real statement. With this rule in
   * place, removing `stripSql` fails - checked, not assumed.
   */
  const orphans = [
    ...[...REVOKED].map(([fn, l]) => ["revoke", fn, l] as const),
    ...[...GRANTED].map(([fn, l]) => ["grant", fn, l] as const),
  ]
    .filter(([, fn]) => !DECLS.has(fn))
    .flatMap(([kind, fn, list]) => list.map((p) => `${p.file}: ${kind} on ${fn}, which no migration declares`));

  assert.deepEqual(
    orphans,
    [],
    "Postgres raises `function ... does not exist` rather than skipping the statement, and these " +
      "migrations are applied by hand from this session with no CI in front of them - so the " +
      "migration stops there, having created the function and not narrowed it.\n" + orphans.join("\n"),
  );
});

test("every revoke and grant names the signature its function actually has", () => {
  /**
   * The same failure one level in: the name resolves and the argument types do
   * not. Postgres raises for this too, so the cost is identical - a migration
   * that stops halfway. That is the 20260919160000 state arrived at a second
   * way.
   */
  const wrong: string[] = [];
  for (const [fn, decls] of DECLS) {
    const declared = new Set(decls.map((d) => sigKey(d.types)));
    for (const [kind, list] of [
      ["revoke", REVOKED.get(fn) ?? []],
      ["grant", GRANTED.get(fn) ?? []],
    ] as const) {
      for (const p of list) {
        if (!declared.has(sigKey(p.types))) {
          wrong.push(
            `${p.file}: ${kind} on ${fn}(${sigKey(p.types)}) names no declared signature - ` +
              `declared: ${[...declared].map((s) => `(${s})`).join(" | ")}`,
          );
        }
      }
    }
  }
  assert.deepEqual(wrong, [], wrong.join("\n"));
});

test("a re-declared function keeps the same argument types", () => {
  /**
   * `create or replace function` with different argument types does not
   * replace anything - Postgres creates an **overload**, so the old function
   * survives with its old body and its old grants and PostgREST gains a second
   * candidate to resolve against. `scan_teaser` is written five times in this
   * directory, which is exactly the file that would pay for it.
   *
   * It is also what makes `rpc-signatures.test.mts` next door answerable: that
   * sweep takes the last definition as the signature, the way the database
   * does. An overload makes "the signature" a lie in both files at once.
   */
  const forked: string[] = [];
  for (const [fn, decls] of DECLS) {
    const sigs = new Set(decls.map((d) => sigKey(d.types)));
    if (sigs.size > 1) {
      forked.push(
        `${fn} is declared with ${sigs.size} different argument lists - ` +
          decls.map((d) => `${d.file} (${sigKey(d.types)})`).join(", "),
      );
    }
  }
  assert.deepEqual(forked, [], forked.join("\n"));
});

test("the security definer functions are the ones we mean, with a reason each", () => {
  /**
   * A list of kinds with a reason each, not a count - a count cannot notice one
   * whole kind going missing, and here it could not notice a kind arriving.
   * Definer is the modifier that turns a loose grant into an escalation, so it
   * is the one thing in this directory worth naming rather than deriving.
   *
   * 161000's narrowing is the argument for the shape: `note_verify_send` was
   * definer and did not need to be, because its only caller holds the service
   * role key and the service role bypasses row-level security on its own.
   * Definer bought nothing there and cost the property that a future loosening
   * of the grant cannot escalate.
   */
  const definer = [...DECLS]
    .filter(([, decls]) => decls.at(-1)!.definer)
    .map(([fn]) => fn)
    .sort();
  assert.deepEqual(definer, ["scan_teaser"], "the only definer is the public teaser read");

  // And the one that is definer is deliberately the one exposed to anon: it is
  // the public scan result, read by token, and it needs to see rows the anon
  // role may not select directly. Everything else runs on the service role and
  // so gains nothing from definer - which is the whole of 161000's argument.
  assert.deepEqual(GRANTED.get("scan_teaser")!.at(-1)!.roles, ["anon", "authenticated"]);
  for (const fn of [...DECLS.keys()].filter((f) => f !== "scan_teaser")) {
    assert.deepEqual(
      GRANTED.get(fn)!.at(-1)!.roles,
      ["service_role"],
      `${fn} is not definer and is called on the service role key - it must be granted to nothing else`,
    );
  }
});
