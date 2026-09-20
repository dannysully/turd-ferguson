import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { isPlausibleEmail, normalizeEmail } from "./email-address.ts";

/**
 * The shared address check, and - the half that matters - that it is the only
 * one.
 *
 * This is `email-header.test.mts`'s "one validator for a domain, not two" asked
 * of the field beside the domain, and the answer was worse: there were three.
 * `app/contact/actions.ts`, `app/actions/waitlist.ts` and
 * `api/scan/[token]/unlock/route.ts` each carried a private pattern, all three
 * take an address from a stranger, and the last one puts it in the `to:` header
 * of a message we pay to send.
 *
 * Nothing could see that. The domain census in `email-header.test.mts` is
 * `assert.doesNotMatch(WAITLIST, /https\?:\\\/\\\//)` - right about the field it
 * names, one file wide, and about the other field in the same two lines of the
 * same function it says nothing at all. The fix is the one this repo keeps
 * arriving at: derive the set from the tree, then prove the derivation can still
 * see an instance.
 */

// ------------------------------------------------------------- the function

test("an ordinary address is accepted", () => {
  assert.equal(isPlausibleEmail("danny@nomadadigital.co.uk"), true);
  assert.equal(isPlausibleEmail("me@example.com"), true);
  // An underscore is legal in a local part and common. `resolveAccount` has its
  // own note about what one used to do to an `ilike` match; it must not be
  // refused here on the way past.
  assert.equal(isPlausibleEmail("a_b@x.com"), true);
  assert.equal(isPlausibleEmail("first.last+tag@sub.example.com"), true);
});

test("one at sign, by construction", () => {
  assert.equal(isPlausibleEmail("a@b@example.com"), false);
  assert.equal(isPlausibleEmail("example.com"), false);
  assert.equal(isPlausibleEmail("@example.com"), false);
  assert.equal(isPlausibleEmail("me@"), false);
});

/**
 * Whitespace is refused, and this is the half of header safety that is not
 * `headerSafe`. Every caller puts the result in a `to:` or a `replyTo:`, and a
 * newline in either is header injection - so the two guards are independent and
 * neither is the other's excuse.
 */
test("no whitespace of any kind survives, which is what shuts the header", () => {
  const LF = String.fromCharCode(10);
  const CR = String.fromCharCode(13);
  assert.equal(isPlausibleEmail("me@ex ample.com"), false);
  assert.equal(isPlausibleEmail(`me@example.com${CR}${LF}bcc: someone@example.test`), false);
  assert.equal(isPlausibleEmail(`me${LF}@example.com`), false);
  assert.equal(isPlausibleEmail("me@example.com\t"), false);
});

test("a domain with no dot, or an empty label, is refused", () => {
  assert.equal(isPlausibleEmail("me@localhost"), false);
  assert.equal(isPlausibleEmail("me@example..com"), false);
  assert.equal(isPlausibleEmail("me@.example.com"), false);
  assert.equal(isPlausibleEmail("me@example.com."), false);
});

/**
 * The four inputs that split the three old copies, pinned in both directions.
 *
 * Measured before the merge was written, not after: the contact form took all
 * four and the two funnel doors refused all four. Two of them are real
 * addresses and two are typos, which is why the merge went the way it did - it
 * takes the funnel's rule about what a TLD may be and drops the funnel's
 * accident that a TLD is ASCII.
 */
test("a TLD may not be a typo", () => {
  // Digits in a TLD. Accepted by the old contact pattern.
  assert.equal(isPlausibleEmail("me@example.c0m"), false);
  // One character. No TLD has ever been one.
  assert.equal(isPlausibleEmail("me@example.x"), false);
  // Punctuation.
  assert.equal(isPlausibleEmail("me@example.---"), false);
});

test("a TLD that is not ASCII is still a TLD", () => {
  // The same TLD written the two ways it is written. Refused by both funnel
  // doors before the merge, on the door where an address buys the product.
  assert.equal(isPlausibleEmail("me@example.xn--p1ai"), true);
  assert.equal(isPlausibleEmail("юзер@сайт.рф"), true);
  // And the punycode prefix is not a blanket pass for anything after it.
  assert.equal(isPlausibleEmail("me@example.xn--"), false);
});

/**
 * `\p{L}` needs the `u` flag or it is a syntax error, so the pattern cannot
 * silently degrade - but a future edit dropping the flag and the escape together
 * would degrade quietly. This is the assertion that says so: if the TLD rule
 * ever narrows back to ASCII, the case above fails and this one explains why.
 */
test("the letter class is Unicode-aware, not ASCII with a flag on it", () => {
  const source = readFileSync(new URL("./email-address.ts", import.meta.url), "utf8");
  assert.match(source, /\\p\{L\}/, "the TLD rule should use a Unicode letter class");
  assert.match(source, /\/u;?$/m, "the TLD pattern needs the u flag for \\p{L} to mean anything");
});

test("normalizeEmail trims and lowercases, and does nothing else", () => {
  assert.equal(normalizeEmail("  Me@Example.COM  "), "me@example.com");
  // Not a validator. A caller checks the shape separately, and one function
  // doing both is how the stored form and the compared form drift.
  assert.equal(normalizeEmail("nonsense"), "nonsense");
});

// --------------------------------------------------------------- the census

/**
 * Every regex literal in the tree that looks like an address check.
 *
 * Keyed on the `[^\s@]` idiom rather than on a bare `@`, because a bare `@`
 * appears in `domain.ts`'s credential strip (`/^[^/@]*@/`, which removes a
 * `user:pass@` authority and is not an address check at all) and in prose. The
 * idiom is what all three copies were written with and what a fourth would be
 * written with.
 *
 * Comments stripped first. Three of this repo's harnesses have now been fooled
 * by prose in a comment - the last one this run - and this file's own header
 * quotes a pattern inside a doc comment two screens up, which would otherwise
 * read as a fourth copy of itself.
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

function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const OWNER = "lib/email-address.ts";

const SOURCES = walk(SRC)
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f))
  .map((f) => ({ file: f.slice(SRC.length), source: code(readFileSync(f, "utf8")) }));

function addressPatterns(): string[] {
  return SOURCES.filter(({ source }) => /\[\^\\s@\]/.test(source)).map(({ file }) => file);
}

test("the census reads the tree it thinks it does", () => {
  // The floor. A walk that stops walking reports zero private patterns, which is
  // the same reading as a clean tree - and four of this repo's tripwires have
  // passed for exactly that reason.
  assert.ok(SOURCES.length >= 100, `only ${SOURCES.length} sources were walked`);
  assert.ok(
    SOURCES.some(({ file }) => file === OWNER),
    "the census cannot see the module it is about, so it is walking the wrong tree",
  );
});

test("the matcher can still recognise an address pattern", () => {
  // Proven against a written instance before it is trusted on the tree. Each of
  // these is one of the three copies exactly as it was shipped.
  const copies = [
    String.raw`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`,
    String.raw`/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i`,
  ];
  for (const c of copies) {
    assert.match(c, /\[\^\\s@\]/, `the matcher no longer recognises ${c}`);
  }
  // And that it does not fire on the domain module's credential strip, which is
  // a different job and must not be swept into this one.
  assert.doesNotMatch(String.raw`/^[^/@]*@/`, /\[\^\\s@\]/);
});

/**
 * The rule.
 *
 * One module owns the pattern. Anywhere else that writes one is a copy that will
 * drift, and the drift is not hypothetical - it is the four split inputs pinned
 * above, which ran in production in three places that disagreed.
 */
test("only one module in the tree carries an address pattern", () => {
  assert.deepEqual(
    addressPatterns(),
    [OWNER],
    "import isPlausibleEmail from @/lib/email-address instead of writing a second pattern - three copies of this disagreed about four inputs, two of which were real addresses",
  );
});

/**
 * And that the three doors call it, which is the other direction.
 *
 * A module nothing imports passes the rule above trivially: deleting every
 * caller leaves exactly one pattern in the tree. The doors are named here
 * because the set is not derivable - "a place that takes an address from a
 * stranger" is not a thing a walk can recognise - and each is re-earned by being
 * read, so a renamed file fails rather than silently leaving the list.
 */
test("every door that takes an address from a stranger calls the shared check", () => {
  const doors = [
    "app/contact/actions.ts",
    "app/actions/waitlist.ts",
    "app/api/scan/[token]/unlock/route.ts",
  ];
  for (const door of doors) {
    const found = SOURCES.find(({ file }) => file === door);
    assert.ok(found, `${door} is not in the tree - this list has gone stale`);
    assert.match(
      found.source,
      /\bisPlausibleEmail\(/,
      `${door} takes an address from a stranger without the shared check`,
    );
  }
});
