import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * The base a relative link is resolved against.
 *
 * `crawl.ts` imports `server-only`, so it cannot be imported under
 * `node --test` and this is a source check rather than a behaviour one - the
 * same idiom as `stall.test.mts` and the two supabase sweeps, and for the same
 * reason: what has to stay true is a property of how the code is written, not
 * a value it returns.
 *
 * The defect. `getText` follows the redirect chain by hand, one hop at a time,
 * and used to return only the prose it ended up with. `readSite` therefore set
 * `base` to the URL it had *requested* - `https://<domain>/` - and handed that
 * to `sameHostLinks` as the thing relative hrefs resolve against. On a homepage
 * that redirects into a subdirectory, which is how most locale-split sites are
 * built (`/en/`, `/uk/`, `/en-gb/`), the page that answered lives a directory
 * down and `href="about"` in it means `/en/about`. Resolved against the apex it
 * became `/about`, which is a 404 - and the five extra reads are gathered with
 * `Promise.allSettled` and tested for `ok`, so every one of them was dropped
 * without a word.
 *
 * Why it is worth a test rather than a comment: the prose from those pages is
 * the only thing the model is given to name the company and its category from,
 * and the category is what every question in the scan is built on. A silent
 * loss there is a worse scan, not a broken one, so nothing downstream reports
 * it. It is also the exact shape of the `@`-in-the-query-string fault that
 * `normalizeDomain` carries a comment about - a URL assembled in steps, where
 * a later step invalidates a value an earlier one produced - which is the class
 * this checks a second member of.
 */

const read = (p: string) => readFileSync(new URL("../../../" + p, import.meta.url), "utf8");

const SRC = read("src/lib/scan/crawl.ts");

test("a successful fetch reports the address that answered", () => {
  // The success variant has to carry it. Without a `url` on the type there is
  // nothing for the caller to prefer, and the bug is unfixable rather than
  // merely unfixed.
  assert.match(
    SRC,
    /\{\s*ok:\s*true;\s*html:\s*string;\s*url:\s*string\s*\}/,
    "the ok variant of Fetched must carry the url that answered",
  );

  /**
   * And every construction of it has to fill that in from the hop the loop is
   * actually on, not from the argument getText was called with. `current` is
   * the variable the redirect loop reassigns; `url` is the parameter, which is
   * the value that was wrong in the first place.
   *
   * There are two success returns - a 200 with no body, and the decoded one -
   * and the empty-body branch is the one most likely to be missed, because it
   * is a single short line three branches up from the interesting code.
   */
  const built = [...SRC.matchAll(/\{\s*ok:\s*true,[^}]*\}/g)].map((m) => m[0]);
  assert.ok(built.length >= 2, "expected both success returns in getText, found " + built.length);
  for (const site of built) {
    assert.match(site, /url:\s*current\b/, "a success must report `current`, the hop that answered: " + site);
  }
});

test("readSite resolves links against what answered, not against what it asked for", () => {
  /**
   * The assignment itself. `base = url` is the defect verbatim - `url` is the
   * `${scheme}://${domain}/` built one line above the call, before any redirect
   * has been followed.
   */
  assert.doesNotMatch(SRC, /\bbase\s*=\s*url\s*;/, "base must not be the requested URL");
  assert.match(SRC, /\bbase\s*=\s*got\.url\s*;/, "base must be the URL the fetch reported");

  // And it has to still be the thing handed to the link resolver, so that a
  // later edit cannot quietly reintroduce the apex by passing something else.
  assert.match(
    SRC,
    /sameHostLinks\(\s*html\s*,\s*domain\s*,\s*base\s*\)/,
    "sameHostLinks must resolve against base",
  );
});

test("an interesting link is recognised by its resolved path, not by its raw href", () => {
  /**
   * The other half of the same defect, and the half that made the two comments
   * about it untrue.
   *
   * INTERESTING is `/\/(about|services|...)/i` - it wants a slash before the
   * word. Tested against the raw href, `href="about"` has no slash anywhere in
   * it, so it was dropped here, one step before the base resolution that the
   * `Fetched` comment and the header of this file both use it as the example
   * for. Resolving first is what makes the bare relative form reach the same
   * place `./about` and `en/about` already did.
   *
   * Checked as source text for the reason at the top of this file: crawl.ts
   * imports `server-only`, so there is no way to call the function from here.
   * What has to stay true is which value the test is applied to.
   */
  assert.doesNotMatch(
    SRC,
    /INTERESTING\.test\(\s*href\s*\)/,
    "INTERESTING must not be tested against the raw href - a bare relative link carries no slash",
  );
  assert.match(
    SRC,
    /INTERESTING\.test\(\s*url\.pathname\s*\)/,
    "INTERESTING must be tested against the resolved pathname",
  );
});
