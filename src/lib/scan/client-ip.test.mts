import assert from "node:assert/strict";
import { test } from "node:test";

import { UNKNOWN_IP, clientIp } from "./client-ip.ts";

/**
 * The per-caller identity, executed.
 *
 * `ceilings.test.mts` proves `ip_scans_per_day` refuses at the right number.
 * That is only a limit if the key it counts under is the same one twice, and
 * nothing had ever run the function that produces the key. It was `server-only`
 * and so unloadable by Node's runner; it is split now, and this is what the
 * split was for.
 *
 * The property that matters is not "it returns an address". It is **which**
 * address, out of up to three headers that can all be present at once. Getting
 * that wrong does not throw, does not fail a build, and does not look wrong on
 * any page: it silently gives one caller several buckets, or several callers
 * one, and the only symptom is a rate limit that does not hold.
 *
 * Everything below drives a real `Request`, so header lookup is the platform's
 * own case-insensitive one rather than a stub that agrees with the test.
 */

function req(headers: Record<string, string>): Request {
  return new Request("https://alwayscited.com/api/scan/start", { method: "POST", headers });
}

test("the three headers are preferred in specificity order", () => {
  const all = {
    "x-vercel-forwarded-for": "1.1.1.1",
    "x-real-ip": "2.2.2.2",
    "x-forwarded-for": "3.3.3.3",
  };
  assert.equal(clientIp(req(all)), "1.1.1.1");

  const { "x-vercel-forwarded-for": _v, ...noVercel } = all;
  assert.equal(clientIp(req(noVercel)), "2.2.2.2");

  assert.equal(clientIp(req({ "x-forwarded-for": "3.3.3.3" })), "3.3.3.3");
});

test("the platform header is read from the FIRST hop and x-forwarded-for from the LAST", () => {
  // The asymmetry is deliberate and documented in client-ip.ts. It is also the
  // single most "tidyable" thing in that file - the two lines look like they
  // disagree by accident - so both directions are pinned here. Making them
  // agree fails this test, which is the point.
  assert.equal(clientIp(req({ "x-vercel-forwarded-for": "1.1.1.1, 9.9.9.9" })), "1.1.1.1");
  assert.equal(clientIp(req({ "x-forwarded-for": "1.1.1.1, 9.9.9.9" })), "9.9.9.9");
});

test("an empty or blank header falls through instead of becoming the answer", () => {
  // The bug this forecloses: `""` and `"   "` are both falsy-after-trim, and a
  // check written as `!== null` rather than on the trimmed value would return
  // an empty string - which hashes fine, buckets every such caller together
  // with no per-address limit between them, and looks like a working key.
  assert.equal(clientIp(req({ "x-vercel-forwarded-for": "", "x-real-ip": "2.2.2.2" })), "2.2.2.2");
  assert.equal(clientIp(req({ "x-vercel-forwarded-for": "   ", "x-real-ip": "2.2.2.2" })), "2.2.2.2");
  assert.equal(clientIp(req({ "x-real-ip": "  ", "x-forwarded-for": "3.3.3.3" })), "3.3.3.3");
  assert.equal(
    clientIp(req({ "x-vercel-forwarded-for": ", 8.8.8.8", "x-real-ip": "2.2.2.2" })),
    "2.2.2.2",
    "a leading comma made the first hop empty and it was returned as an address",
  );
});

test("surrounding whitespace never reaches the key", () => {
  // Two spellings of one address are two buckets and half a limit. Nothing
  // downstream trims: clientIp feeds hashIp directly on all three routes.
  for (const header of ["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"]) {
    assert.equal(clientIp(req({ [header]: "  4.4.4.4  " })), "4.4.4.4", `${header} kept its padding`);
  }
  assert.equal(clientIp(req({ "x-forwarded-for": "1.1.1.1 ,  9.9.9.9 " })), "9.9.9.9");
});

test("Headers trims a value but not around its commas, which is why one trim was dead", () => {
  /**
   * This is a fact about the platform, asserted here because `clientIp` now
   * depends on it: the `x-real-ip` branch has no `.trim()` because `Headers`
   * has already done it, and the other two keep theirs because it has not.
   *
   * The assertion above cannot tell you that. It passes whether or not
   * `x-real-ip` is trimmed, which is exactly what the injection harness showed
   * - a MISSED case that was the test being decoration rather than the
   * injection being wrong. Rather than delete an assertion that reads as if it
   * holds something, the thing it actually rests on is pinned here, so the day
   * a runtime stops trimming, this fails and names the reason.
   */
  const r = req({ "x-real-ip": "  4.4.4.4  ", "x-forwarded-for": " 1.1.1.1 ,  9.9.9.9 " });
  assert.equal(r.headers.get("x-real-ip"), "4.4.4.4", "Headers no longer trims a value");
  assert.equal(
    r.headers.get("x-forwarded-for"),
    "1.1.1.1 ,  9.9.9.9",
    "Headers now trims around commas too, so the two remaining trims may be dead as well",
  );
});

test("a request with none of the three is one shared bucket, not a crash", () => {
  // A throw here takes down the scan form on every request, which is strictly
  // worse than one coarse bucket - and the bucket is still a limit, because
  // everything landing in it counts against the same allowance.
  assert.equal(clientIp(req({})), UNKNOWN_IP);
  assert.equal(clientIp(req({ "x-forwarded-for": "" })), UNKNOWN_IP);
  assert.equal(clientIp(req({ "x-forwarded-for": " , , " })), UNKNOWN_IP);
  assert.equal(clientIp(req({ "x-vercel-forwarded-for": "", "x-real-ip": "" })), UNKNOWN_IP);
});

test("header names are matched however the caller cased them", () => {
  // Free from the Headers spec rather than from this code, which is exactly
  // why it is worth one assertion: a future rewrite onto a plain object would
  // lose it silently, and every request would fall to the shared bucket.
  assert.equal(clientIp(req({ "X-Vercel-Forwarded-For": "1.1.1.1" })), "1.1.1.1");
  assert.equal(clientIp(req({ "X-REAL-IP": "2.2.2.2" })), "2.2.2.2");
});

test("IPv6 survives intact, commas and colons not confused", () => {
  // The hop separator is a comma and an IPv6 address is full of colons, so a
  // splitter written on the wrong character truncates every v6 caller to "2001"
  // - one bucket for a very large number of people.
  const v6 = "2001:db8:85a3::8a2e:370:7334";
  assert.equal(clientIp(req({ "x-vercel-forwarded-for": v6 })), v6);
  assert.equal(clientIp(req({ "x-real-ip": v6 })), v6);
  assert.equal(clientIp(req({ "x-forwarded-for": `${v6}, ${v6}` })), v6);
});
