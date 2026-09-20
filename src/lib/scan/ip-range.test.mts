import assert from "node:assert/strict";
import { test } from "node:test";

import { isPublicAddress, v4ToInt, v6ToBigInt } from "./ip-range.ts";

/**
 * The SSRF boundary, which until now was the only thing in `src/lib/scan` with
 * no check on it.
 *
 * It could not have one where it was. `address.ts` opens with
 * `import "server-only"` because it resolves hostnames through `node:dns`, and
 * that makes the whole module unloadable under `node --test` - so the purest
 * code in the tree, string in and boolean out, was untestable for a reason that
 * had nothing to do with it. The arithmetic now lives in `ip-range.ts` and
 * `address.ts` re-exports it, which is the same split `opportunities.ts` got
 * out of `unlock.ts` and for the same reason.
 *
 * What this protects. The domain is typed by whoever is asking, `readSite`
 * fetches it server side, and the prose comes back to them through
 * `brand_name` and `positioning`. A hostname whose A record points at
 * 169.254.169.254 costs an attacker one DNS record; a public site that answers
 * 302 into a private range costs them not even that. Every one of those paths
 * ends at `isPublicAddress`, so a regression here is not a wrong number on a
 * report - it is the function reading an internal endpoint and handing back
 * what it found.
 *
 * The cases are written as addresses rather than as ranges on purpose. A test
 * that rebuilds the block table is a second copy of the thing under test and
 * agrees with it by construction; these are the addresses themselves, with the
 * ones immediately outside each block beside them, because an off-by-one in a
 * prefix mask is the failure this shape catches and a restatement of the table
 * is the failure it does not.
 */

// --------------------------------------------------------------- parsing

test("a dotted quad is read as the number it is", () => {
  assert.equal(v4ToInt("0.0.0.0"), 0);
  assert.equal(v4ToInt("127.0.0.1"), 2130706433);
  assert.equal(v4ToInt("255.255.255.255"), 4294967295);
  assert.equal(v4ToInt("8.8.8.8"), 134744072);
});

test("anything that is not a dotted quad is refused rather than guessed at", () => {
  for (const bad of ["", "1.2.3", "1.2.3.4.5", "256.0.0.1", "1.2.3.256", "a.b.c.d", "1.2.3.-1", "1.2.3.4 ", "1..2.3"]) {
    assert.equal(v4ToInt(bad), null, bad);
  }
});

test("the compressed, mapped and zoned forms of one address read as one number", () => {
  // Every one of these is ::ffff:127.0.0.1 written a different way.
  const canonical = v6ToBigInt("0:0:0:0:0:ffff:7f00:1");
  assert.notEqual(canonical, null);
  assert.equal(v6ToBigInt("::ffff:7f00:1"), canonical);
  assert.equal(v6ToBigInt("::ffff:127.0.0.1"), canonical);
  assert.equal(v6ToBigInt("::FFFF:127.0.0.1"), canonical);
  assert.equal(v6ToBigInt("::ffff:127.0.0.1%eth0"), canonical);
});

test("a malformed v6 literal is refused rather than half-read", () => {
  for (const bad of ["", "1.2.3.4", "1::2::3", "1:2:3:4:5:6:7:8:9", ":", "::ffff:999.0.0.1", "12345::1", "::ffff:zz"]) {
    assert.equal(v6ToBigInt(bad), null, bad);
  }
});

// ------------------------------------------------------------------ v4

test("a public v4 address is public", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "216.58.204.14", "51.140.0.1"]) {
    assert.equal(isPublicAddress(ip), true, ip);
  }
});

/**
 * Each private block with the addresses either side of it, so a prefix length
 * that is wrong by one fails here rather than in production.
 */
test("every reserved v4 block is refused, and the addresses beside it are not", () => {
  const blocked = [
    "0.0.0.0", "0.255.255.255",
    "10.0.0.0", "10.255.255.255",
    "100.64.0.0", "100.127.255.255",
    "127.0.0.0", "127.0.0.1", "127.255.255.255",
    "169.254.0.0", "169.254.169.254", "169.254.255.255",
    "172.16.0.0", "172.31.255.255",
    "192.0.0.0", "192.0.0.255",
    "192.0.2.0", "192.0.2.255",
    "192.88.99.0", "192.88.99.255",
    "192.168.0.0", "192.168.255.255",
    "198.18.0.0", "198.19.255.255",
    "198.51.100.0", "198.51.100.255",
    "203.0.113.0", "203.0.113.255",
    "224.0.0.0", "239.255.255.255",
    "240.0.0.0", "255.255.255.255",
  ];
  for (const ip of blocked) assert.equal(isPublicAddress(ip), false, ip);

  const justOutside = [
    "1.0.0.0",
    "9.255.255.255", "11.0.0.0",
    "100.63.255.255", "100.128.0.0",
    "126.255.255.255", "128.0.0.0",
    "169.253.255.255", "169.255.0.0",
    "172.15.255.255", "172.32.0.0",
    "192.0.1.0",
    "192.0.3.0",
    "192.88.98.255", "192.88.100.0",
    "192.167.255.255", "192.169.0.0",
    "198.17.255.255", "198.20.0.0",
    "198.51.99.255", "198.51.101.0",
    "203.0.112.255", "203.0.114.0",
    "223.255.255.255",
  ];
  for (const ip of justOutside) assert.equal(isPublicAddress(ip), true, ip);
});

/**
 * The metadata endpoint gets its own line because it is the one address whose
 * disclosure is a credential rather than a page, and it is the reason the
 * link-local block is in the table at all.
 */
test("the cloud metadata endpoint is refused", () => {
  assert.equal(isPublicAddress("169.254.169.254"), false);
});

/**
 * The top quarter of the address space, which is where a dotted quad stops
 * fitting in a signed 32-bit integer.
 *
 * The `>>> 0` in `inV4Block` reads as though it were what makes this work, and
 * it is not: both operands go through the same ToInt32 conversion, so removing
 * it changes no result - checked by removing it and running this file, which is
 * the only reason that is stated here rather than reasoned about. What the
 * conversion would break is a comparison against a value that had NOT been
 * through it, so what this test pins is the behaviour rather than the idiom.
 */
test("the top of the address space is refused, broadcast included", () => {
  assert.equal(isPublicAddress("240.0.0.1"), false);
  assert.equal(isPublicAddress("250.1.2.3"), false);
  assert.equal(isPublicAddress("255.255.255.255"), false);
});

// ------------------------------------------------------------------ v6

test("a global unicast v6 address is public", () => {
  for (const ip of ["2606:4700:4700::1111", "2a00:1450:4009:81f::200e", "2000::1", "3fff:ffff::1"]) {
    assert.equal(isPublicAddress(ip), true, ip);
  }
});

test("everything outside global unicast is refused without needing to be named", () => {
  const blocked = [
    "::1", // loopback
    "::", // unspecified
    "fe80::1", // link-local
    "fe80::1%eth0", // link-local with a zone id
    "fc00::1", // unique local
    "fd12:3456:789a::1", // unique local
    "ff02::1", // multicast
    "100::1", // discard-only
    "fbff::1", // unallocated, and the reason this is an allow-list
    "1fff:ffff::1", // immediately below global unicast
    "4000::1", // immediately above global unicast
  ];
  for (const ip of blocked) assert.equal(isPublicAddress(ip), false, ip);
});

test("the tunnelling blocks inside global unicast are refused", () => {
  assert.equal(isPublicAddress("2001::1"), false); // Teredo
  assert.equal(isPublicAddress("2001:db8::1"), false); // documentation
  assert.equal(isPublicAddress("2002::1"), false); // 6to4
  assert.equal(isPublicAddress("2002:7f00:1::1"), false); // 6to4 wrapping 127.0.0.1
  // Immediately outside each, so the /32 and /16 are not quietly wider.
  assert.equal(isPublicAddress("2000:ffff::1"), true);
  assert.equal(isPublicAddress("2003::1"), true);
});

/**
 * The forms that carry an IPv4 address in their low 32 bits. These are the
 * ones a block-list written as text misses, because nothing in the string
 * looks like the address it reaches.
 */
test("an IPv4-mapped address is judged as the IPv4 address it reaches", () => {
  assert.equal(isPublicAddress("::ffff:127.0.0.1"), false);
  assert.equal(isPublicAddress("::ffff:7f00:1"), false);
  assert.equal(isPublicAddress("::ffff:10.0.0.1"), false);
  assert.equal(isPublicAddress("::ffff:169.254.169.254"), false);
  assert.equal(isPublicAddress("::ffff:192.168.1.1"), false);
  // The same wrapper around a public address is still public.
  assert.equal(isPublicAddress("::ffff:8.8.8.8"), true);
  assert.equal(isPublicAddress("::ffff:808:808"), true);
});

test("a NAT64 address is judged as the IPv4 address it reaches", () => {
  assert.equal(isPublicAddress("64:ff9b::127.0.0.1"), false);
  assert.equal(isPublicAddress("64:ff9b::7f00:1"), false);
  assert.equal(isPublicAddress("64:ff9b::169.254.169.254"), false);
  assert.equal(isPublicAddress("64:ff9b::8.8.8.8"), true);
});

/**
 * The deprecated IPv4-compatible form, which is NOT one of the two /96s handled
 * above. It falls to the global-unicast test and is refused there - which is
 * the right answer and the one an exclusion list would have got wrong.
 */
test("the deprecated IPv4-compatible form is refused", () => {
  assert.equal(isPublicAddress("::127.0.0.1"), false);
  assert.equal(isPublicAddress("::8.8.8.8"), false);
});

test("an address that parses as neither family is refused rather than allowed", () => {
  for (const bad of ["", "localhost", "example.com", "not an address", "1.2.3", "::ffff:999.0.0.1", "%eth0"]) {
    assert.equal(isPublicAddress(bad), false, bad);
  }
});
