import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { constantTimeEqual, decodeBasicAuth } from "./constant-time.ts";

/**
 * The comparison behind every secret check on this site, which nothing had
 * ever executed.
 *
 * Found by asking a sharper question than the source-file census does. That
 * census asks whether a filename appears in any test, and the inbox already
 * warns it is satisfiable by typing the name into a comment. Following
 * imports transitively from all 45 tests instead: 29 of 132 source files are
 * actually loaded, and `constant-time.ts` is not merely unimported - it is not
 * named anywhere either. It is invisible to both measurements.
 *
 * It has four call sites and they are all of the authentication in this
 * repository: `proxy.ts` compares the admin user AND password, and both cron
 * routes compare their bearer. There is no `server-only` here and no JSX, so
 * the obstacle that justified splitting six other modules does not apply -
 * this one was simply never pointed at.
 *
 * The case that makes it worth a test rather than a reading is the length
 * guard. Delete `if (a.length !== b.length) return false` and the function
 * does NOT start returning true for everything, which is what makes it
 * survive a reading: `charCodeAt` past the end is `NaN`, `x ^ NaN` is `x`, so
 * a longer offered value still differs and still fails. What passes is the
 * other order - a value SHORTER than the secret, where the loop runs over the
 * offered length only and every character matches. **Any prefix of the admin
 * password would authenticate, and a one-character bearer would pass if the
 * real one began with it.** The function reads as fine and the injection
 * proves the test is not decoration.
 */

test("constantTimeEqual accepts only an exact match", () => {
  assert.equal(constantTimeEqual("", ""), true);
  assert.equal(constantTimeEqual("Bearer s3cret", "Bearer s3cret"), true);
  assert.equal(constantTimeEqual("Bearer s3cret", "Bearer s3crey"), false);

  // Case is a difference, not a near-miss.
  assert.equal(constantTimeEqual("bearer s3cret", "Bearer s3cret"), false);
});

test("a prefix of the secret is not the secret", () => {
  // The direction the length guard actually protects. Without it these pass.
  assert.equal(constantTimeEqual("", "Bearer s3cret"), false);
  assert.equal(constantTimeEqual("B", "Bearer s3cret"), false);
  assert.equal(constantTimeEqual("Bearer s3cre", "Bearer s3cret"), false);

  // And the other order, which fails even without the guard - asserted so the
  // pair above is visibly the one carrying the weight.
  assert.equal(constantTimeEqual("Bearer s3crett", "Bearer s3cret"), false);
});

test("constantTimeEqual compares every character, not the first difference", () => {
  // A difference in the last position is as detectable as one in the first.
  assert.equal(constantTimeEqual("aaaaaaab", "aaaaaaaa"), false);
  assert.equal(constantTimeEqual("baaaaaaa", "aaaaaaaa"), false);
  // Non-ASCII compares by code unit and must not throw.
  assert.equal(constantTimeEqual("pässwörd", "pässwörd"), true);
  assert.equal(constantTimeEqual("pässwörd", "password"), false);
});

test("the comparison has no early exit, which no return value can show", () => {
  /**
   * The one property this module is named for, and the one an assertion on
   * return values cannot reach.
   *
   * Rewriting the loop to `if (a.charCodeAt(i) !== b.charCodeAt(i)) return
   * false` gives **the same answer for every input**. Every behavioural test
   * above still passes. What changes is how long a wrong secret takes to be
   * refused, and a timing assertion is flaky by construction and would be the
   * wrong thing to put in a push gate.
   *
   * So the check matches the kind of property: it is structural, and it is
   * read out of the source. Found by injection - this was the one MISSED case
   * of nine, and the miss was the test rather than the injection.
   *
   * Two returns, no more: the length guard and the accumulated result. A
   * third inside the loop is the early exit.
   */
  const src = readFileSync(join(import.meta.dirname, "constant-time.ts"), "utf8");

  const start = src.indexOf("export function constantTimeEqual");
  assert.notEqual(start, -1, "constantTimeEqual has been renamed - this check is now blind");
  const body = src.slice(start, src.indexOf("\n}", start));

  // Counter-guard: a body that failed to slice would have no returns at all
  // and the count assertion would read as a different failure.
  assert.ok(body.includes("for ("), "no loop found in constantTimeEqual - the slice has drifted");

  const returns = [...body.matchAll(/\breturn\b/g)].length;
  assert.equal(
    returns,
    2,
    `constantTimeEqual has ${returns} returns, expected 2 (the length guard and the result). ` +
      "A return inside the loop exits on the first differing character, which is the one thing " +
      "this function exists not to do - and every other test in this file passes with it there.",
  );

  assert.ok(
    /diff \|=/.test(body),
    "the difference is no longer accumulated - without `|=` the comparison cannot be branchless",
  );
  assert.ok(
    /return diff === 0;/.test(body),
    "the result is no longer the accumulated difference compared to zero",
  );
});

test("decodeBasicAuth reads a well-formed credential", () => {
  const header = "Basic " + Buffer.from("admin:hunter2", "utf8").toString("base64");
  assert.deepEqual(decodeBasicAuth(header), { user: "admin", password: "hunter2" });
});

test("the scheme is matched case-insensitively and the payload is not", () => {
  const payload = Buffer.from("admin:hunter2", "utf8").toString("base64");
  // Browsers and curl do not agree on the capitalisation of the scheme.
  for (const scheme of ["Basic", "basic", "BASIC", "BaSiC"]) {
    assert.deepEqual(
      decodeBasicAuth(`${scheme} ${payload}`),
      { user: "admin", password: "hunter2" },
      `${scheme} should be accepted`,
    );
  }
  // `toLowerCase` is for the scheme test only. If it ever reached the payload,
  // base64 is case-sensitive and every credential with an upper-case letter
  // would decode to something else.
  assert.notEqual(payload, payload.toLowerCase(), "pick a payload that proves the point");
});

test("a password holding a non-ASCII character survives the decode", () => {
  /**
   * The bug this module's comment says was fixed, held so it cannot come back.
   * `atob` returns one character per BYTE - a latin1 string - and the bytes a
   * browser sends are UTF-8. Reading that as text turns `é` into two
   * characters where the environment variable holds one, so the comparison can
   * never match and the failure is a login that is simply impossible rather
   * than an error anybody can read.
   */
  const header = "Basic " + Buffer.from("admin:pässwörd", "utf8").toString("base64");
  assert.deepEqual(decodeBasicAuth(header), { user: "admin", password: "pässwörd" });

  // An emoji is four bytes and two UTF-16 code units - the case that also
  // breaks a naive byte-per-character read.
  const wide = "Basic " + Buffer.from("admin:pw🔑", "utf8").toString("base64");
  assert.deepEqual(decodeBasicAuth(wide), { user: "admin", password: "pw🔑" });
});

test("the first colon splits, because a colon is legal in a password", () => {
  const header = "Basic " + Buffer.from("admin:a:b:c", "utf8").toString("base64");
  assert.deepEqual(decodeBasicAuth(header), { user: "admin", password: "a:b:c" });
});

test("anything that is not a well-formed credential is null, not a throw", () => {
  assert.equal(decodeBasicAuth(""), null, "no header at all");
  assert.equal(decodeBasicAuth("Bearer abc"), null, "the wrong scheme");
  assert.equal(decodeBasicAuth("Basicabc"), null, "the scheme needs its space");
  assert.equal(decodeBasicAuth("Basic !!!not base64!!!"), null, "undecodable payload");

  // Base64 that decodes but carries no colon. This is the one that would throw
  // or return a nonsense pair if the separator were not checked.
  const noColon = "Basic " + Buffer.from("adminhunter2", "utf8").toString("base64");
  assert.equal(decodeBasicAuth(noColon), null);

  // An empty payload decodes to an empty string, which has no colon either.
  assert.equal(decodeBasicAuth("Basic "), null);
});

test("an empty user or an empty password is a credential, not a refusal", () => {
  /**
   * Deliberate, and the reason it is worth pinning: returning null here would
   * be a *different* answer from the proxy than "wrong credential", and the
   * proxy's own comment says the distinction is not the caller's business.
   * Both fail the comparison in `proxy.ts` a moment later, which is where a
   * blank belongs - and the empty-string cases in `constantTimeEqual` above
   * are what make that safe.
   */
  const noUser = "Basic " + Buffer.from(":hunter2", "utf8").toString("base64");
  assert.deepEqual(decodeBasicAuth(noUser), { user: "", password: "hunter2" });

  const noPassword = "Basic " + Buffer.from("admin:", "utf8").toString("base64");
  assert.deepEqual(decodeBasicAuth(noPassword), { user: "admin", password: "" });
});
