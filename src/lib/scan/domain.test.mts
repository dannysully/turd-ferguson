import assert from "node:assert/strict";
import { test } from "node:test";

import { isPlausibleDomain, normalizeDomain } from "./domain.ts";

/**
 * The first real check in this repo, and it is here rather than anywhere else
 * because `normalizeDomain` is the one function whose failure is silent all
 * the way down.
 *
 * 2ca695a: userinfo was stripped before the path, query and fragment were cut.
 * Userinfo is "everything up to an @ containing no /", and a query string is
 * allowed to contain an @, so `https://example.com?email=me@other.com`
 * normalised to `other.com`. Nothing errored. `isPlausibleDomain` says yes to
 * `other.com`, so the scan ran, was billed, and returned a report headed with
 * a company the visitor never typed - and on the citation path a cited URL
 * with an @ in its query was filed under the wrong host, moving the
 * leaderboard. No test, no log line and no screen would have shown it.
 *
 * That check was originally re-derived under python3 by reading the regexes
 * back out of the source, because no JavaScript runner was reachable. Node 24
 * strips types natively and ships a test runner, so it costs no dependency and
 * no config to leave the real thing behind instead:
 *
 *     npm run check
 *
 * Not wired into a CI gate, because this repo has none and `.github/` is not
 * writable from here. It is one command, it is in package.json next to
 * `lint`, and it runs in under a second.
 *
 * Two notes on the plumbing, both of which cost a wrong turn to find.
 *
 * `.mts` rather than `.ts` makes this file ESM by extension, so Node does not
 * have to sniff it. That is worth having on its own, but it does NOT silence
 * MODULE_TYPELESS_PACKAGE_JSON - the warning is raised for `domain.ts`, the
 * module under test, which is ordinary app source and will always be `.ts`.
 * Renaming the test cannot reach it. Node's own advice is to add
 * `"type": "module"` to package.json; do not take it, because that changes
 * how `next.config`, `postcss.config` and `eslint.config` are loaded - a real
 * risk to the build in exchange for silencing a notice. The npm script names
 * that one warning in `--disable-warning` instead, which leaves every other
 * warning where a check ought to have it: on screen.
 *
 * The import below is "./domain.ts", extension and all, because Node does not
 * resolve extensionless specifiers. `allowImportingTsExtensions` in tsconfig
 * is what lets tsc read that, and it is safe only because `noEmit` is on.
 */

test("strips scheme, www, port, credentials and trailing dot", () => {
  assert.equal(normalizeDomain("https://www.Example.com/about"), "example.com");
  assert.equal(normalizeDomain("  https://WWW.Example.com/about "), "example.com");
  assert.equal(normalizeDomain("http://example.com:8443/x"), "example.com");
  assert.equal(normalizeDomain("example.com."), "example.com");
  assert.equal(normalizeDomain("EXAMPLE.CO.UK"), "example.co.uk");
});

test("real credentials still come off", () => {
  assert.equal(normalizeDomain("https://user:pass@example.com/path"), "example.com");
  assert.equal(normalizeDomain("ftp://anon@files.example.com"), "files.example.com");
});

test("an @ after the authority never renames the host", () => {
  // The regression. Each of these returned the domain in the comment before
  // the two lines in normalizeDomain were reordered.
  assert.equal(normalizeDomain("https://example.com?email=me@other.com"), "example.com"); // other.com
  assert.equal(normalizeDomain("example.com?ref=a@b.co"), "example.com"); // b.co
  assert.equal(normalizeDomain("https://example.com#a@b.com"), "example.com"); // b.com
  assert.equal(normalizeDomain("https://example.com/mailto:me@other.com"), "example.com");
});

test("isPlausibleDomain refuses what is not a hostname", () => {
  assert.equal(isPlausibleDomain("example.com"), true);
  assert.equal(isPlausibleDomain("a.b.example.co.uk"), true);
  // A bare IP has no letters in its last label, which is what keeps the
  // scanner off an address - see lib/scan/address.ts for the rest of it.
  assert.equal(isPlausibleDomain("127.0.0.1"), false);
  assert.equal(isPlausibleDomain("localhost"), false);
  assert.equal(isPlausibleDomain(""), false);
  assert.equal(isPlausibleDomain("example..com"), false);
  assert.equal(isPlausibleDomain("-bad.example.com"), false);
  assert.equal(isPlausibleDomain("bad-.example.com"), false);
  assert.equal(isPlausibleDomain("例え.com"), false);
});
