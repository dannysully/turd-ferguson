import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { COVERAGE_LIMITS, SCAN_LIMITS, WAITLIST_LIMITS } from "./contact.ts";

/**
 * Every `<input>` in the tree, and whether anything bounds what can be typed
 * into it.
 *
 * `scan-form.test.mts` is the same question asked of a denominator one form
 * wide: `<form action="/scan" method="get">`. It is correct about all five of
 * those and could not see any of these, which is the defect this queue keeps
 * naming arriving for the sixth time. Widening the denominator from "the /scan
 * GET forms" to "every input" found six unbounded fields in three files:
 *
 *   - four on `CoverageForm`, the form that spends money, whose route had its
 *     own table of limits typed inline - the fourth table `contact.ts` predicted
 *     in as many words;
 *   - the category field on `ConfirmScreen`, which is where a question is
 *     edited before it is billed, while its own question rows one screen down
 *     were bounded;
 *   - the email field on `ScanFlow`, while the same field on `RequestScanForm`
 *     was bounded.
 *
 * None of the six was a hole: every route already refused an over-length value.
 * What each one was is a refusal the visitor cannot act on, because `text()`
 * and its callers return the same message for too-short and too-long, and the
 * message describes the short case. The bound on the input is what makes that
 * branch unreachable from the form.
 *
 * The count is asserted, not the files. A census that silently narrows reads
 * exactly like a clean sweep - see the four blind tests in the queue.
 */

const SRC = new URL("..", import.meta.url).pathname;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const SOURCES = walk(SRC).filter((f) => /\.tsx$/.test(f));

type Field = { file: string; line: number; tag: string; id: string };

/**
 * Every `<input>` tag in the tree.
 *
 * Scanned brace-aware rather than with `/<input[^>]*>/`, because a JSX prop can
 * hold a `>` inside an expression - `onChange={(e) => ...}` is on most of these
 * inputs - and a regex that stops at the first `>` truncates the tag before its
 * maxLength, reading a bounded field as an unbounded one.
 */
function inputs(): Field[] {
  const out: Field[] = [];
  for (const file of SOURCES) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/<input\b/g)) {
      const start = m.index;
      let depth = 0;
      let end = -1;
      for (let i = start; i < text.length; i++) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") depth--;
        else if (text[i] === ">" && depth === 0) {
          end = i + 1;
          break;
        }
      }
      assert.notEqual(end, -1, `${file}: an <input> with no closing bracket`);
      const tag = text.slice(start, end);
      out.push({
        file: file.slice(SRC.length),
        line: text.slice(0, start).split("\n").length,
        tag,
        id: tag.match(/id="([^"]+)"/)?.[1] ?? tag.match(/id=\{`([^`]+)`\}/)?.[1] ?? "",
      });
    }
  }
  return out;
}

/**
 * The two inputs that are deliberately unbounded, each with the thing that
 * bounds it instead. Earned in the test rather than assumed: the check below
 * fails if one of these stops being unbounded, so the list cannot quietly grow
 * into a blanket pass.
 */
const EXEMPT: Record<string, string> = {
  "c-website": [
    "the contact honeypot. A bot does not honour maxLength, so a bound here buys",
    "nothing, and a real visitor never reaches the field - it is tabIndex={-1}.",
    "What protects the log is the server: contact/actions.ts slices it to",
    "CONTACT_LIMITS.website before writing it.",
  ].join(" "),
  "cc-coverage": [
    "type=file, which maxLength does not apply to at all. It is bounded by bytes",
    "in onFile against MAX_COVERAGE_BYTES, and again by the route before it",
    "parses.",
  ].join(" "),
};

test("the census still sees every input - a shrinking count is a blind probe", () => {
  const found = inputs();
  const files = new Set(found.map((f) => f.file));
  assert.ok(
    found.length >= 21,
    `only ${found.length} inputs were found across the tree, and there were 21 when this was written - a falling count means the scanner broke, not that fields were deleted`,
  );
  assert.ok(files.size >= 11, `only ${files.size} files carry an input, and 11 did`);
});

test("every input is bounded, or is on the exemption list with its reason", () => {
  const unbounded = inputs()
    .filter((f) => !/maxLength=/.test(f.tag))
    .filter((f) => !(f.id in EXEMPT))
    .map((f) => `${f.file}:${f.line} ${f.id || "(no id)"}`);
  assert.deepEqual(
    unbounded,
    [],
    "these accept unbounded typed input. Bound them from a constant in config/contact.ts, or add an id to EXEMPT with what bounds it instead",
  );
});

test("no exemption is stale - each one is still an input, and still unbounded", () => {
  const found = inputs();
  for (const [id, reason] of Object.entries(EXEMPT)) {
    const field = found.find((f) => f.id === id);
    assert.ok(field, `EXEMPT lists "${id}", which is no longer an input in the tree - drop it`);
    assert.ok(
      !/maxLength=/.test(field.tag),
      `EXEMPT lists "${id}" as deliberately unbounded, but it now carries a maxLength - drop it from the list`,
    );
    assert.ok(reason.length > 40, `EXEMPT["${id}"] needs a reason, not a placeholder`);
  }
});

/**
 * A typed `maxLength={120}` passes the check above while being exactly the
 * defect it exists to catch: `ConfirmScreen`'s question rows carried
 * `maxLength={200}`, which matched the confirm route's own 200 by coincidence
 * and would not have followed it anywhere.
 */
test("every bound is read from a constant, never typed as a number", () => {
  const typed = inputs()
    .filter((f) => /maxLength=\{\s*\d/.test(f.tag))
    .map((f) => `${f.file}:${f.line} ${f.id || "(no id)"}`);
  assert.deepEqual(typed, [], "these type a bound as a literal instead of reading one from config");
});

/**
 * The other half of the same rule, on the side the input cannot see. A bound on
 * the field and a different number in the route is the disagreement the field
 * bound was added to prevent, so the routes are read for a typed comparison the
 * same way the inputs are.
 *
 * **This list is typed, and that is the half that went wrong.** It names three
 * routes and asks whether each reads the right constant. What it cannot ask is
 * whether a constant is read by *anything* - so a bound that exists, is asserted
 * below as a number, and is enforced by no server at all sits outside it. That
 * is what happened to `SCAN_LIMITS.email`; the derived census further down is
 * the denominator this check does not have, and the two are kept apart because
 * they answer different questions: this one is "the right constant", that one is
 * "any server at all".
 */
const ROUTES = walk(new URL("../app/api", import.meta.url).pathname).filter((f) => /route\.ts$/.test(f));

test("the routes behind these fields compare against the same constants", () => {
  const checks: { route: string; typed: RegExp; constant: string }[] = [
    { route: "coverage-check/route.ts", typed: /text\(body\.\w+,\s*\d/, constant: "COVERAGE_LIMITS" },
    { route: "confirm/route.ts", typed: /topic\.length > \d|question\.length > \d/, constant: "SCAN_LIMITS" },
    { route: "questions/route.ts", typed: /topic\.length > \d/, constant: "SCAN_LIMITS" },
  ];
  for (const { route, typed, constant } of checks) {
    const file = ROUTES.find((f) => f.endsWith(route));
    assert.ok(file, `${route} was not found - this check has gone blind`);
    const text = readFileSync(file, "utf8");
    assert.ok(
      text.includes(constant),
      `${route} bounds a field the form also bounds, but does not read ${constant}`,
    );
    assert.ok(!typed.test(text), `${route} still compares a length against a typed number`);
  }
});

/**
 * Asserted as values so the checks above cannot pass over a table that has
 * drifted. 253 is the longest a DNS name may be; 254 the longest an address may
 * be over SMTP; 120 and 200 are what the scan routes have always enforced.
 *
 * The heading on this test was a claim about servers and the body is a claim
 * about numbers, and the gap between the two is where `SCAN_LIMITS.email` sat:
 * asserted here as 254, carried by `ScanFlow` as a `maxLength`, and read by no
 * server anywhere. The claim is executable now - see the census below, which is
 * what actually earns this heading. **A test that duplicates a value to compare
 * against has to say what reads the original**, and until 20 September 2026 the
 * honest answer for one of these five was "nothing".
 */
test("the bounds are the numbers the servers actually enforce", () => {
  assert.equal(WAITLIST_LIMITS.domain, 253);
  assert.equal(SCAN_LIMITS.topic, 120);
  assert.equal(SCAN_LIMITS.question, 200);
  assert.equal(SCAN_LIMITS.email, 254);
  assert.deepEqual(COVERAGE_LIMITS.brand, { min: 2, max: 80 });
  assert.deepEqual(COVERAGE_LIMITS.topic, { min: 2, max: 120 });
  assert.deepEqual(COVERAGE_LIMITS.segment, { min: 2, max: 80 });
});

/**
 * `TopicScreen` posts to the waitlist action, not to a scan route, so its topic
 * bound is the waitlist's 200 and not SCAN_LIMITS.topic. The two are different
 * numbers for different servers and look like a drift that wants tidying; this
 * holds the negative so the next run does not "fix" them into agreement.
 */
test("the waitlist topic bound is not the scan one, deliberately", () => {
  assert.notEqual(WAITLIST_LIMITS.topic, SCAN_LIMITS.topic);
  const screens = readFileSync(join(SRC, "components/scan/screens.tsx"), "utf8");
  assert.ok(
    screens.includes("maxLength={WAITLIST_LIMITS.topic}"),
    "TopicScreen's topic field should read WAITLIST_LIMITS.topic - it posts to the waitlist action",
  );
});

// ------------------------------------------- does any server read this bound?

/**
 * Every bound this file declares, and the server that enforces it.
 *
 * ## The defect this was written for
 *
 * `SCAN_LIMITS.email` is 254. `ScanFlow` carries it as `maxLength`. The test
 * above asserts the number under the heading "the bounds are the numbers the
 * servers actually enforce". All three of those were true and **no server
 * enforced it**: `/api/scan/[token]/unlock` read `body.email` off the request
 * JSON, tested it against `/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i` - two unbounded runs
 * either side of an `@` - and passed it to the `to:` header of a Resend send, to
 * a `leads` insert whose column is `text`, to `resolveAccount`, which creates an
 * `accounts` row from it, and back out in its own response body.
 *
 * Nothing in this tree could see that. The route check above walks a **typed**
 * list of three routes and asks whether each reads the right constant; a bound
 * read by nobody is not a wrong constant, it is an absent one, and absence is
 * what a typed list is structurally unable to report. `contact.test.mts` reads
 * one file. `email-header.test.mts` sweeps every `emails.send` in the tree for a
 * safe subject and then bounds the fields of exactly one action, `waitlist.ts`,
 * named by hand - its own header says "a third form is one entry from being
 * covered by both", which is the admission that the second half is a typed list
 * too. So the bound half of "what a sender owes" had a denominator of one file
 * while the subject half had a denominator of the tree.
 *
 * ## What this walks, and why it is the whole set
 *
 * The tables in this file are the only place a bound is allowed to come from -
 * the check above fails a `maxLength={120}` typed as a literal - so every bound
 * on the site is a key in one of them. That makes the key set the denominator,
 * and it is derived here by parsing this file rather than typed, so a fifth
 * table joins the sweep by existing.
 *
 * A "server" is any `.ts` in the tree that is not a component, not a test and
 * not this file: that covers `route.ts`, both `"use server"` actions and
 * anything under `lib`. `.tsx` is excluded deliberately - a `maxLength` is the
 * bound this census exists to distrust.
 */
const LIMITS_FILE = join(SRC, "config/contact.ts");
const LIMITS_SOURCE = readFileSync(LIMITS_FILE, "utf8");

/**
 * The tables and their top-level keys, sliced by brace depth.
 *
 * Depth-aware rather than `\{([^}]*)\}`, for the reason the input scanner is:
 * `COVERAGE_LIMITS` holds `{ min, max }` objects, and a reader that stops at the
 * first `}` sees one key where there are three and reports two bounds as covered
 * that it never looked at.
 */
function limitTables(source: string): { table: string; keys: string[] }[] {
  const out: { table: string; keys: string[] }[] = [];
  for (const m of source.matchAll(/export const (\w+_LIMITS)\s*=\s*\{/g)) {
    const open = source.indexOf("{", m.index);
    let depth = 0;
    let close = -1;
    for (let i = open; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}" && --depth === 0) {
        close = i;
        break;
      }
    }
    assert.notEqual(close, -1, `${m[1]} is not closed`);
    const body = source.slice(open + 1, close);
    // Top-level keys only: a nested `{ min: 2, max: 80 }` is one bound named by
    // its outer key, and a reader is allowed to reach into it.
    const keys: string[] = [];
    let depthIn = 0;
    for (let i = 0; i < body.length; i++) {
      if (body[i] === "{") depthIn++;
      else if (body[i] === "}") depthIn--;
      else if (depthIn === 0) {
        const rest = body.slice(i);
        const k = /^(\w+)\s*:/.exec(rest);
        if (k && (i === 0 || /[\s,{]/.test(body[i - 1]))) keys.push(k[1]);
      }
    }
    out.push({ table: m[1], keys });
  }
  return out;
}

const TABLES = limitTables(LIMITS_SOURCE);

/**
 * Comments stripped before anything is matched, lifted from `mail-doors.test.mts`.
 *
 * Load-bearing here, and measured rather than assumed: the injection that
 * removes the unlock route's `SCAN_LIMITS.email` came back MISSED against the
 * first draft of this file, because the doc comment the route carries *beside*
 * that check names the constant in prose. So the census read an explanation of
 * a bound as the enforcement of one - the exact failure `config/contact.ts` has
 * now recorded three times about its own comments, arriving a fourth time in
 * the test written to stop it.
 *
 * The `[^:]` guard keeps a `https://` inside a string from eating its line.
 */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const SERVER_FILES = walk(SRC)
  .filter((f) => /\.ts$/.test(f) && !/\.test\.mts$/.test(f) && !/\.tsx$/.test(f))
  .filter((f) => f !== LIMITS_FILE)
  .map((f) => ({ file: f.slice(SRC.length), source: code(readFileSync(f, "utf8")) }))
  // A `.ts` that declares itself a client module is not a server, and a bound
  // it read would be the same `maxLength` promise under another name.
  .filter(({ source }) => !/^\s*["']use client["']/m.test(source));

/**
 * What a file calls a table it imported.
 *
 * Both public actions write `import { CONTACT_LIMITS as LIMITS }` and then
 * `LIMITS.email`, so a census grepping for `CONTACT_LIMITS.email` finds nothing
 * in the one file that enforces it and reports every contact bound as orphaned.
 * That is not hypothetical - it is what the first draft of this did, and the
 * alias test below is what said so.
 */
function localNames(source: string, table: string): string[] {
  const names: string[] = [];
  for (const imp of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'][^"']*config\/contact["']/g)) {
    for (const spec of imp[1].split(",")) {
      const as = new RegExp(`^\\s*${table}\\s+as\\s+(\\w+)\\s*$`).exec(spec);
      if (as) names.push(as[1]);
      else if (spec.trim() === table) names.push(table);
    }
  }
  return names;
}

function serverReaders(table: string, key: string): string[] {
  const out: string[] = [];
  for (const { file, source } of SERVER_FILES) {
    for (const local of localNames(source, table)) {
      if (new RegExp(`\\b${local}\\.${key}\\b`).test(source)) {
        out.push(file);
        break;
      }
    }
  }
  return out;
}

test("the table reader finds the tables and keys this test thinks it does", () => {
  // The floor every sweep in this tree keeps. A parse that stops parsing turns
  // the census into a loop over nothing, which passes, and reads exactly like a
  // tree where every bound is enforced.
  assert.ok(TABLES.length >= 4, `expected 4+ limit tables, found ${TABLES.map((t) => t.table).join(", ")}`);
  const total = TABLES.reduce((n, t) => n + t.keys.length, 0);
  // 15 when this was written: 5 contact, 4 waitlist, 3 coverage, 3 scan.
  assert.ok(total >= 15, `expected 15+ bounds across the tables, found ${total}`);
  // And that the nested table is read as three bounds rather than as one, which
  // is the case a `[^}]*` slice gets wrong.
  const coverage = TABLES.find((t) => t.table === "COVERAGE_LIMITS");
  assert.ok(coverage, "COVERAGE_LIMITS was not parsed");
  assert.deepEqual([...coverage.keys].sort(), ["brand", "segment", "topic"]);
});

/**
 * The alias resolution is load-bearing, proved the way round that can be proved.
 *
 * "Delete the alias handling and this must fail" is the assertion worth having
 * and it is the one written below: `CONTACT_LIMITS` is imported under a
 * different name by the only server that enforces it, so the bare form appears
 * in no server file at all. A census that did not resolve the alias would report
 * all five contact bounds as unenforced - the loud direction, which is the
 * lucky one. The quiet direction is a table somebody later imports unaliased
 * while the resolver has rotted, and the floor above is what holds that.
 */
test("a table imported under another name is still found", () => {
  const bare = SERVER_FILES.filter(({ source }) => /\bCONTACT_LIMITS\.\w/.test(source));
  assert.deepEqual(
    bare.map((f) => f.file),
    [],
    "CONTACT_LIMITS is read through an alias on the server, and this test's premise is that nothing reads it bare",
  );
  const readers = serverReaders("CONTACT_LIMITS", "message");
  assert.ok(
    readers.some((f) => f.includes("contact/actions.ts")),
    `the alias resolver cannot see CONTACT_LIMITS.message in contact/actions.ts - it found ${readers.join(", ") || "nothing"}`,
  );
});

/**
 * The census.
 *
 * Nothing here is exempt and nothing here is expected to be. A bound that no
 * server reads is a promise made to the person who renders the form and to
 * nobody who posts to it, and the whole reason these tables exist - written at
 * the top of `config/contact.ts` in as many words - is that "the form is a
 * public endpoint and nothing stops a post that never rendered the page".
 *
 * If a future bound genuinely belongs to the input alone, this is the right
 * place for the argument, and it wants an exemption list with a reason the way
 * the input census has one - not a deletion.
 *
 * ## What this is blind to, asked of itself while the denominator is fresh
 *
 * It proves a server **reads** the constant. It cannot prove the server **acts**
 * on it: `if (email.length > SCAN_LIMITS.email) { }` reads the bound and
 * enforces nothing, and so does a `>=` where a `>` was meant. Nothing here can
 * see either. The typed route check above is the half that asks the narrower
 * question well, for the three routes on its list, and the two together are
 * still short of "the bound is the one the server applies". That is the next
 * candidate on this file and it is written down rather than left to be
 * rediscovered - though note the shape of it: a reader that is genuinely dead
 * is a guard with no observable effect, and this queue's rule for those is to
 * find the effect first or accept that the new assertion is decoration.
 */
test("every declared bound is enforced by a server, not only by an input", () => {
  const orphans: string[] = [];
  for (const { table, keys } of TABLES) {
    for (const key of keys) {
      if (serverReaders(table, key).length === 0) orphans.push(`${table}.${key}`);
    }
  }
  assert.deepEqual(
    orphans,
    [],
    "these bounds are carried by a maxLength and by nothing on the server, so a post that never rendered the form walks straight past them",
  );
});
