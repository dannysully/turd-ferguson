import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { SETTINGS_FALLBACK } from "../lib/scan/settings-merge.ts";

/**
 * The other four facts /legal says it "checked in the code".
 *
 * That page's own header lists five, and names the file each was checked
 * against. `analytics-claim.test.mts` took one of them on 20 September 2026 and
 * found the sentence was true by a single `Array.isArray` that nothing held.
 * These are the four it left:
 *
 *   - raw IPs are never stored, they are salted SHA-256;
 *   - the app sets no cookies of its own;
 *   - an unclaimed scan loses only its transcript, after seven days, and keeps
 *     its measured facts;
 *   - the one third-party script the page loads is Cloudflare Turnstile.
 *
 * All three were true when typed and none was falsifiable afterwards, which is
 * the species this queue keeps paying for. A privacy policy is the one page
 * where AGENTS.md's "ship it rough" explicitly does not reach: a wrong number
 * on a pricing card costs a correction, a wrong sentence here is a statement
 * about what we do with somebody's data.
 *
 * ## What writing it found, which reading it twice had not
 *
 * "Who else sees it" named DataForSEO, Anthropic, Resend, Vercel and Supabase.
 * It did not name Cloudflare - and `verifyTurnstile` posts `remoteip: ip` to
 * Cloudflare's siteverify endpoint on all three scan doors. So the raw address
 * that "What we collect" promises is never written down was being handed to a
 * processor the page did not list.
 *
 * Nothing in the code was wrong. **Never stored and never disclosed are
 * different promises**, `hashIp` keeps the first, and the page was written as
 * though keeping the first kept both. That is why rule A4 below exists: the
 * allowed recipients of the raw address are a list with a reason each, and any
 * recipient that is off-origin has to be named on the page.
 *
 * ## What this file cannot see, stated rather than implied
 *
 *   - `response_retention_days` is a live `app_settings` row. C4 joins the page
 *     to the *default*; an override in production moves the promise and no
 *     agent here can read that table. blocked.md carries it.
 *   - a cookie set at runtime by a dependency rather than by this tree. The
 *     rules read source. The live `set-cookie` read is a one-off in the
 *     worklog, not a gate - it is a point in time and this file is a push gate.
 */

const HERE = fileURLToPath(import.meta.url);
const ROOT = join(HERE, "..", "..", "..");
const SRC = join(ROOT, "src");
const MIGRATIONS = join(ROOT, "supabase", "migrations");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) walk(child, out);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")) out.push(child);
  }
  return out;
}

const posix = (f: string) => relative(ROOT, f).split(sep).join("/");

/** Comments stripped, the way every sweep in this tree does it. */
const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Comments *and* string contents stripped, for the rules that ask whether the
 * code does a thing rather than whether a word appears in it. `/legal` is a
 * page about cookies and IP addresses, so every rule below would report the
 * page it is defending if it did not strip both.
 */
const bare = (src: string) => code(src).replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');

const FILES = [
  ...walk(SRC).map((f) => ({ file: posix(f), source: readFileSync(f, "utf8") })),
  // next.config.ts sets every response header this site serves and is outside
  // src. A cookie rule that walks src alone is a claim wider than its own walk.
  { file: "next.config.ts", source: readFileSync(join(ROOT, "next.config.ts"), "utf8") },
  // vercel.json carries no headers today and can. It is in the walk so that
  // the day it does, the rule below is already pointed at it.
  { file: "vercel.json", source: readFileSync(join(ROOT, "vercel.json"), "utf8") },
];

const SQL = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => ({ file: f, source: readFileSync(join(MIGRATIONS, f), "utf8") }));

const LEGAL = code(readFileSync(join(SRC, "app/legal/page.tsx"), "utf8")).replace(/\s+/g, " ");

test("the walk read the tree and the schema, so a zero below cannot pass as a clean sweep", () => {
  assert.ok(FILES.length >= 100, `the walk found only ${FILES.length} source files`);
  for (const f of ["src/lib/scan/ip.ts", "src/lib/scan/turnstile.ts", "next.config.ts"]) {
    assert.ok(FILES.some((x) => x.file === f), `the walk cannot see ${f}, which the rules below are about`);
  }
  assert.ok(SQL.length >= 5, `the migration walk found only ${SQL.length} files`);
});

/* ------------------------------------------------------------------ *
 * A. "the address itself is never written down, and the hash cannot be
 *    turned back into it"
 * ------------------------------------------------------------------ */

/**
 * Where the raw address enters the application. Derived, not typed: a typed
 * list cannot report an ABSENT reader, which is the rule `input-bounds`
 * records about itself. A fourth door calling `clientIp` joins this set on its
 * own and then has to satisfy A2.
 */
const IP_CALLERS = FILES.filter(({ source }) =>
  // The declaration is not a caller. `client-ip.ts` defines it and `ip.ts`
  // re-exports it; neither takes an address, and leaving them in would make
  // the list look like five doors when there are three.
  /\bclientIp\s*\(/.test(bare(source).replace(/function\s+clientIp\s*\(/g, "function DECLARATION(")),
).map((f) => f.file);

test("every door that takes a caller's address is in this file's denominator", () => {
  assert.deepEqual(
    IP_CALLERS.sort(),
    [
      "src/app/api/coverage-check/[token]/rerun/route.ts",
      "src/app/api/coverage-check/route.ts",
      "src/app/api/scan/start/route.ts",
    ],
    "a door reads the caller's raw IP address that this file did not know about. Add it here once A2 passes for it - do not exempt it.",
  );
});

/**
 * The headers a caller's address actually arrives in, read out of `clientIp`
 * itself rather than typed here. Derived because a typed list of three would
 * go stale the moment the platform adds a fourth, and because the rule below
 * is only worth anything if it names the same set the code reads.
 */
const ADDRESS_HEADERS = [
  ...code(readFileSync(join(SRC, "lib/scan/client-ip.ts"), "utf8")).matchAll(
    /headers\.get\(\s*["']([a-z-]*(?:forwarded-for|real-ip))["']\s*\)/gi,
  ),
].map((m) => m[1].toLowerCase());

test("the address arrives through one door, so A1's denominator is the whole set", () => {
  // The hole this closes: A1 walks for `clientIp`, which is only the complete
  // list of doors while `clientIp` is the only thing that reads the headers an
  // address comes in. A route calling `req.headers.get("x-forwarded-for")`
  // directly has the raw address in hand and is invisible to every rule above.
  assert.ok(ADDRESS_HEADERS.length >= 3, `only ${ADDRESS_HEADERS.length} address headers found in client-ip.ts`);
  const hits: string[] = [];
  for (const { file, source } of FILES) {
    if (file === "src/lib/scan/client-ip.ts") continue;
    for (const m of code(source).matchAll(/headers\.get\(\s*["']([a-z-]+)["']\s*\)/gi)) {
      if (ADDRESS_HEADERS.includes(m[1].toLowerCase())) hits.push(`${file}  ${m[1]}`);
    }
  }
  assert.deepEqual(
    hits,
    [],
    "something other than clientIp() reads the header a caller's address arrives in. It then holds the raw address without passing through hashIp, and none of the rules above can see it.",
  );
});

/**
 * What the raw address is allowed to be handed to, with the argument for each.
 * `spend-gates.test.mts` is the shape being copied: an exemption is a sweep
 * switched off, and the sentence beside it is the only argument for switching
 * it off, so it is a field rather than a comment.
 */
const RAW_IP_SINKS: { fn: string; why: string; vendor: string | null }[] = [
  {
    fn: "hashIp",
    why: "salted SHA-256, and the only form of the address that reaches a column. lib/scan/ip.ts throws without IP_HASH_SALT rather than hashing unsalted.",
    vendor: null,
  },
  {
    fn: "verifyTurnstile",
    why: "posts remoteip to Cloudflare's siteverify endpoint. Cloudflare needs the address to score the challenge; it is not stored by us.",
    vendor: "Cloudflare",
  },
];

/** The callee wrapping a position, found by walking back over balanced parens. */
function enclosingCall(src: string, at: number): string | null {
  let depth = 0;
  for (let i = at - 1; i >= 0; i--) {
    const ch = src[i];
    if (ch === ")") depth++;
    else if (ch === "(") {
      if (depth === 0) return src.slice(0, i).match(/([A-Za-z_$][\w$]*)\s*$/)?.[1] ?? "";
      depth--;
    }
  }
  return null;
}

/** Every use of the raw address in one file, excluding its own declaration. */
function rawIpSinks(source: string): string[] {
  const src = bare(source);
  const sinks: string[] = [];
  for (const decl of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*clientIp\s*\(/g)) {
    const name = decl[1];
    for (const use of src.matchAll(new RegExp(`\\b${name}\\b`, "g"))) {
      if (use.index! <= decl.index! + decl[0].length) continue;
      sinks.push(enclosingCall(src, use.index!) ?? `<not an argument to anything>`);
    }
  }
  return sinks;
}

test("the raw address is only ever passed to a function on the argued list", () => {
  const allowed = new Set(RAW_IP_SINKS.map((s) => s.fn));
  const stray: string[] = [];
  for (const { file, source } of FILES) {
    for (const sink of rawIpSinks(source)) if (!allowed.has(sink)) stray.push(`${file}  ->  ${sink}`);
  }
  assert.deepEqual(
    stray,
    [],
    '/legal tells a visitor "the address itself is never written down". These hand the unhashed address to something that is not on the argued list - `ip_hash: ip` in an insert payload, or a log line, reads exactly like this.',
  );
});

test("the raw address does reach both of the two things it is allowed to reach", () => {
  // The green-expected half. A rule that forbids everything passes on a tree
  // where nothing happens, and `mail-doors` earned its comment strip this way.
  const reached = new Set(FILES.flatMap((f) => rawIpSinks(f.source)));
  for (const { fn } of RAW_IP_SINKS) {
    assert.ok(reached.has(fn), `nothing passes the raw address to ${fn} any more. If that is deliberate, take it off RAW_IP_SINKS - a stale allowance is a hole waiting for a name.`);
  }
});

/**
 * Every column the schema declares, as (name, type).
 *
 * Two shapes, and the second one is the point. The first draft read
 * `create table` bodies alone - a line of the column list, anchored to the
 * start of a line. That is a denominator that cannot contain the defect:
 * AGENTS.md's carve-out makes `alter table ... add column` the *sanctioned*
 * way to add a column here, so the one route by which a column actually
 * arrives was the one route the rule could not see. Found by asking the
 * refill question of this file while writing it, not by a failing test.
 */
function columns(sql: string): { name: string; type: string }[] {
  const body = sql.replace(/--.*$/gm, " ");
  const out: { name: string; type: string }[] = [];
  for (const m of body.matchAll(/^\s*"?([a-z_]+)"?\s+([a-z]+)/gim)) out.push({ name: m[1], type: m[2] });
  for (const m of body.matchAll(/\badd\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z_]+)"?\s+([a-z]+)/gim)) {
    out.push({ name: m[1], type: m[2] });
  }
  return out;
}

/** The only column allowed to carry anything derived from a caller's address. */
const HASHED_COLUMN = "ip_hash";

test("no column in the schema stores an address", () => {
  const offenders: string[] = [];
  for (const { file, source } of SQL) {
    for (const { name, type } of columns(source)) {
      const named = /(^|_)ip($|_)/.test(name) && name !== HASHED_COLUMN;
      const typed = type === "inet" || type === "cidr";
      if (named || typed) offenders.push(`${file}  ${name} ${type}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "a column that holds an address. The policy's claim is about storage, and the schema is what storage is - `ip_hash` is the only column allowed to carry anything derived from a caller's address.",
  );
});

test("the schema walk found the hashed column it is the exception for", () => {
  // Otherwise "no offenders" is equally true of a walk that reads nothing, and
  // the `alter table` half above was exactly that for one draft.
  const all = SQL.flatMap(({ source }) => columns(source));
  assert.ok(all.length >= 50, `the column walk found only ${all.length} columns across ${SQL.length} migrations`);
  assert.ok(
    all.some((c) => c.name === HASHED_COLUMN),
    `the walk cannot see ${HASHED_COLUMN}, so it cannot see a column beside it either`,
  );
});

test("every off-origin recipient of the raw address is named on the page", () => {
  // The rule that would have caught Cloudflare being absent from "Who else
  // sees it" for as long as Turnstile has been wired up.
  const who = LEGAL.match(/id: "who",[\s\S]*?id: "cookies",/)?.[0];
  assert.ok(who, 'the "Who else sees it" section is not where this rule expected to find it');
  for (const { fn, vendor } of RAW_IP_SINKS) {
    if (!vendor) continue;
    assert.ok(
      who!.includes(vendor),
      `${fn} hands a visitor's IP address to ${vendor}, and /legal's "Who else sees it" does not say so. Never stored and never disclosed are different promises.`,
    );
  }
});

/* ------------------------------------------------------------------ *
 * B. "This site sets no cookies of its own"
 * ------------------------------------------------------------------ */

test("nothing in the tree touches document.cookie", () => {
  const hits = FILES.filter(({ source }) => /\bdocument\s*\.\s*cookie\b/.test(bare(source))).map((f) => f.file);
  assert.deepEqual(hits, [], '/legal says "This site sets no cookies of its own". Reading is forbidden alongside writing on purpose: the page promises the site does not deal in them at all, and a read is one character from a write.');
});

test("nothing reads or writes the request cookie jar", () => {
  const hits = FILES.filter(({ source }) =>
    /import\s*{[^}]*\bcookies\b[^}]*}\s*from\s*["']next\/headers["']/.test(code(source)),
  ).map((f) => f.file);
  assert.deepEqual(hits, [], "next/headers cookies() is imported somewhere. Setting one through it is the server-side half of the sentence on /legal.");
});

test("no response this site serves carries a Set-Cookie header", () => {
  const hits: string[] = [];
  for (const { file, source } of FILES) {
    // Header *names*, so the word in prose is not a hit - matched against the
    // strings, because a header name is a string literal by construction.
    for (const m of code(source).matchAll(/(["'])([Ss]et-[Cc]ookie)\1/g)) hits.push(`${file}  ${m[2]}`);
  }
  assert.deepEqual(hits, [], "a Set-Cookie header is set somewhere in this tree, including next.config.ts, which serves every header on the site.");
});

/* ------------------------------------------------------------------ *
 * C. "The full text of what each engine said is deleted after seven days if
 *    nobody claims the scan - what survives is the measurements"
 * ------------------------------------------------------------------ */

const PURGE = code(readFileSync(join(SRC, "app/api/cron/purge-responses/route.ts"), "utf8"));

test("the purge clears the transcript and nothing else", () => {
  const updates = [...PURGE.matchAll(/\.update\(\s*\{([^}]*)\}/g)].map((m) => m[1].trim());
  assert.deepEqual(
    updates,
    ["response_text: null"],
    "the nightly purge writes something other than `response_text: null`. The page promises a scan keeps its measurements forever and loses only its transcript; every extra key in that payload is a measurement going with it.",
  );
});

test("the purge deletes no rows at all", () => {
  assert.ok(
    !/\.delete\s*\(/.test(PURGE),
    "the purge route deletes rows. It is allowed to blank one column - deleting a scan_answers row takes whether the engine answered and whether it named the brand, which /legal says survives.",
  );
});

test("the purge reaches only scans nobody claimed", () => {
  assert.ok(
    /\.is\(\s*["']unlocked_at["']\s*,\s*null\s*\)/.test(PURGE),
    'the purge no longer filters on unlocked_at being null. /legal promises the transcript goes "if nobody claims the scan"; without that filter it goes for everybody, including the people who gave an email address for it.',
  );
});

/**
 * The number on the page against the number in the code.
 *
 * Only as far as the default reaches: `response_retention_days` is an
 * `app_settings` row and the route reads it at run time, so a production
 * override moves the promise and nothing here can see that. What this closes is
 * the drift that is visible from inside the repo - the fallback, the migration
 * seed and the sentence a visitor reads, all three saying the same number.
 */
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen"];

test("the retention period on the page is the one the code defaults to", () => {
  const days = SETTINGS_FALLBACK.response_retention_days;
  const word = NUMBER_WORDS[days];
  assert.ok(word, `the default retention is ${days} days and this rule only spells out to ${NUMBER_WORDS.length - 1}. Extend the table rather than dropping the check.`);
  assert.ok(
    new RegExp(`deleted after ${word} days`).test(LEGAL),
    `/legal does not say the transcript is "deleted after ${word} days", and that is what SETTINGS_FALLBACK.response_retention_days is set to. One of the two moved without the other.`,
  );
});

test("the migration seed and the code default cannot drift apart", () => {
  const seed = SQL.flatMap(({ source }) => [
    ...source.matchAll(/'response_retention_days'\s*,\s*'(\d+)'::jsonb/g),
  ]).map((m) => Number(m[1]));
  assert.ok(seed.length > 0, "no migration seeds response_retention_days any more, so the page's number rests on the fallback alone");
  for (const v of seed) {
    assert.equal(v, SETTINGS_FALLBACK.response_retention_days, "the seeded retention and the code fallback disagree, so which number the page is telling the truth about depends on which one the row came from");
  }
});

/* ------------------------------------------------------------------ *
 * D. "The one third-party script the page loads is Cloudflare Turnstile"
 * ------------------------------------------------------------------ */

/**
 * What `route-closure.test.mts` already holds, so this does not restate it: the
 * CSP and the off-origin URLs in client code agree, in both directions. Every
 * origin the browser is told to fetch is permitted, and every permitted origin
 * is fetched by something.
 *
 * What agreement cannot tell you is **how many there are and whose they are**,
 * and that is the whole of the sentence on the page. Two third parties, both
 * loaded and both in the CSP, satisfy route-closure completely and make "the
 * one third-party script" false. It is the same shape this queue keeps finding:
 * a check right about everything it names, asked what it is not looking at.
 *
 * The CSP is read from `next.config.ts` rather than from the build, so this
 * runs without one. route-closure reads the shipped manifest and is the half
 * that proves the header is actually served.
 */
const THIRD_PARTIES: { origin: string; vendor: string; why: string }[] = [
  {
    origin: "https://challenges.cloudflare.com",
    vendor: "Cloudflare",
    why: "Turnstile: the api.js script, the widget's iframe, and the connection it makes to score the challenge. The only origin on this site that is not ours.",
  },
];

/** Source expressions that are not a third party: us, or no fetch at all. */
const FIRST_PARTY = /^(?:'self'|'none'|'unsafe-inline'|'unsafe-eval'|blob:|data:|ws:)$/;

/**
 * The CSP as directives, read out of the config's own array.
 *
 * Line-wise rather than by one regex over the block, and that is not tidiness.
 * A source expression is itself quoted - `"default-src 'self'"` - so a naive
 * "text between two quote characters" match stops at the inner `'` and reads
 * `default-src` as having no sources at all. A policy parsed that way looks
 * maximally strict no matter what it permits, which is the flattering
 * direction of harness failure this repo has now paid for twice.
 *
 * `${...}` holes are replaced by the string literals inside them, so the
 * dev-only sources are read too: a third party smuggled in behind `isDev`
 * would otherwise be invisible here and still shipped to anyone running the
 * dev server.
 */
function directives(): { name: string; sources: string[] }[] {
  const config = readFileSync(join(ROOT, "next.config.ts"), "utf8");
  const block = config.match(/const CSP = \[([\s\S]*?)\]\.join\(/)?.[1];
  assert.ok(block, "the CSP array is not where this rule expected to find it in next.config.ts");

  const out: { name: string; sources: string[] }[] = [];
  for (const raw of block!.split("\n")) {
    // `[^:]` and not a bare `//`, which is the guard `code()` above carries for
    // the same reason: the one line this parse exists to read ends in
    // `https://challenges.cloudflare.com`, and a bare comment strip eats the
    // origin, closes no quote, and drops script-src from the policy silently.
    const line = raw.replace(/(^|[^:])\/\/.*$/, "$1");
    const open = line.search(/["`]/);
    if (open === -1) continue;
    const quote = line[open];
    const close = line.lastIndexOf(quote);
    if (close <= open) continue;
    const entry = line
      .slice(open + 1, close)
      .replace(/\$\{([^}]*)\}/g, (_, hole: string) =>
        ` ${[...hole.matchAll(/(["'])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2]).join(" ")} `,
      )
      .trim();
    if (!entry) continue;
    const [name, ...sources] = entry.split(/\s+/).filter(Boolean);
    out.push({ name, sources });
  }
  return out;
}

test("the CSP parse read the real policy, so an empty set cannot pass as a strict one", () => {
  const ds = directives();
  assert.ok(ds.length >= 10, `the CSP parse found only ${ds.length} directives`);
  for (const name of ["default-src", "script-src", "img-src", "font-src", "frame-src", "connect-src"]) {
    assert.ok(ds.some((d) => d.name === name), `the CSP parse cannot see ${name}`);
  }
});

test("the browser may reach exactly one third party, and it is the one on the page", () => {
  const found = new Set<string>();
  for (const { name, sources } of directives()) {
    for (const src of sources) {
      if (FIRST_PARTY.test(src)) continue;
      if (!/^https?:\/\//.test(src)) continue; // 'unsafe-eval' and friends behind a template hole
      const origin = new URL(src).origin;
      assert.ok(
        THIRD_PARTIES.some((t) => t.origin === origin),
        `${name} permits ${origin}, which is not on the argued list. /legal tells a visitor the one third-party script the page loads is Cloudflare Turnstile - a second origin makes that sentence false, and route-closure passes on it the moment something in src/ loads it.`,
      );
      found.add(origin);
    }
  }
  assert.deepEqual(
    [...found].sort(),
    THIRD_PARTIES.map((t) => t.origin).sort(),
    "an argued third party is allowed by no directive. A stale entry here is an allowance nobody is watching.",
  );
});

test("no directive smuggles a third party in through a source that is not a URL", () => {
  // The sources that are neither first-party nor an absolute URL: a bare
  // hostname, a scheme like https:, or a wildcard. Every one of those admits
  // an origin the rule above cannot name.
  const loose: string[] = [];
  for (const { name, sources } of directives()) {
    if (name === "upgrade-insecure-requests") continue;
    for (const src of sources) {
      if (FIRST_PARTY.test(src) || /^https?:\/\/[a-z0-9.-]+$/i.test(src)) continue;
      loose.push(`${name} ${src}`);
    }
  }
  assert.deepEqual(loose, [], "a CSP source that is a wildcard, a bare scheme or a hostname without an origin. The rule above reads origins, so anything in this list is a third party it cannot see.");
});

test("the page still claims the number this file just checked", () => {
  assert.equal(THIRD_PARTIES.length, 1, "there is more than one third party now, so the sentence below has to change before this test can be made to pass");
  assert.ok(
    /The one third-party script the page loads is Cloudflare Turnstile/.test(LEGAL),
    '/legal no longer says "The one third-party script the page loads is Cloudflare Turnstile". The rules above hold that sentence; if it was reworded, reword them with it rather than deleting them.',
  );
  for (const { vendor } of THIRD_PARTIES) {
    assert.ok(LEGAL.includes(vendor), `${vendor} is a third party this site reaches and /legal does not name it`);
  }
});

/* ------------------------------------------------------------------ *
 * The rules, proven both ways against written instances.
 * ------------------------------------------------------------------ */

test("the raw-address rule tells an argued sink from an unargued one", () => {
  const sinks = (src: string) => rawIpSinks(src);
  assert.deepEqual(sinks("const ip = clientIp(req); const h = hashIp(ip);"), ["hashIp"]);
  assert.deepEqual(sinks("const ip = clientIp(req); await verifyTurnstile(t, ip);"), ["verifyTurnstile"]);
  assert.deepEqual(sinks("const ip = clientIp(req); db.from('scans').insert({ ip_hash: ip });"), ["insert"], "an insert payload is a sink");
  assert.deepEqual(sinks("const ip = clientIp(req); db.from('scans').insert({ ip });"), ["insert"], "shorthand is a sink");
  assert.deepEqual(sinks("const ip = clientIp(req); console.log(ip);"), ["log"]);
  assert.deepEqual(sinks("const ip = clientIp(req); const copy = ip;"), ["<not an argument to anything>"]);
  // Names that merely start with the identifier are not uses of it - the live
  // code puts `ipHash` and `ip_hash` within two lines of `ip` on all three doors.
  assert.deepEqual(sinks("const ip = clientIp(req); const ipHash = h(); x.insert({ ip_hash: ipHash });"), []);
  // And a comment describing the defect is not the defect. `0a3aa9e` was a
  // component's own doc comment satisfying the check that its code was there.
  assert.deepEqual(sinks("const ip = clientIp(req); // never do insert({ ip })\nconst h = hashIp(ip);"), ["hashIp"]);
});

test("the schema rule sees a column added the way this repo adds columns", () => {
  const flagged = (sql: string) =>
    columns(sql)
      .filter((c) => (/(^|_)ip($|_)/.test(c.name) && c.name !== HASHED_COLUMN) || c.type === "inet" || c.type === "cidr")
      .map((c) => c.name);
  assert.deepEqual(flagged("create table x (\n  ip_hash text\n);"), [], "the hashed column is the allowed one");
  assert.deepEqual(flagged("create table x (\n  visitor_ip text\n);"), ["visitor_ip"]);
  assert.deepEqual(flagged("alter table public.scans add column visitor_ip text;"), ["visitor_ip"], "the additive shape AGENTS.md sanctions");
  assert.deepEqual(flagged("alter table public.scans add column if not exists caller inet;"), ["caller"], "typed rather than named");
  assert.deepEqual(flagged("create table x (\n  zip text,\n  description text\n);"), [], "a word containing the letters is not an address column");
  assert.deepEqual(flagged("-- add column raw_ip inet, which we do not do\ncreate table x (id uuid);"), [], "a comment describing it is not it");
});

test("the cookie rules tell a cookie from a page about cookies", () => {
  const sets = (src: string) => /\bdocument\s*\.\s*cookie\b/.test(bare(src));
  assert.equal(sets('document.cookie = "seen=1";'), true);
  assert.equal(sets("<p>This site sets no cookies of its own</p>"), false, "copy about cookies is not a cookie");
  assert.equal(sets('const note = "no document.cookie anywhere";'), false, "a string naming it is not a write");
  assert.equal(sets("/** no document.cookie, no cookies() */"), false, "the /legal header says exactly this");

  const jar = (src: string) => /import\s*{[^}]*\bcookies\b[^}]*}\s*from\s*["']next\/headers["']/.test(code(src));
  assert.equal(jar('import { cookies } from "next/headers";'), true);
  assert.equal(jar('import { headers, cookies } from "next/headers";'), true, "second in the clause still counts");
  assert.equal(jar('import { headers } from "next/headers";'), false);

  const hdr = (src: string) => /(["'])([Ss]et-[Cc]ookie)\1/.test(code(src));
  assert.equal(hdr('{ key: "Set-Cookie", value: "a=b" }'), true);
  assert.equal(hdr("<p>we set no cookie here</p>"), false);
});

test("the purge rules tell the promised write from a wider one", () => {
  const cleared = (src: string) => [...src.matchAll(/\.update\(\s*\{([^}]*)\}/g)].map((m) => m[1].trim());
  assert.deepEqual(cleared('.update({ response_text: null }, { count: "exact" })'), ["response_text: null"]);
  assert.deepEqual(
    cleared(".update({ response_text: null, cited_domains: null })"),
    ["response_text: null, cited_domains: null"],
    "a second key is a measurement going with the transcript, and must not read as the promised write",
  );
  const unclaimed = (src: string) => /\.is\(\s*["']unlocked_at["']\s*,\s*null\s*\)/.test(src);
  assert.equal(unclaimed('.is("unlocked_at", null)'), true);
  assert.equal(unclaimed('.not("unlocked_at", "is", null)'), false, "the inverted filter purges exactly the claimed scans");
});
