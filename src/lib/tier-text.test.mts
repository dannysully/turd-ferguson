import assert from "node:assert/strict";
import { test } from "node:test";

import { splitTierNames, TIER_PLAIN } from "./tier-text.ts";

/**
 * What these pin, each because it is a decision the four priced pages depend
 * on rather than a property of the regex.
 */

/** Readable shorthand: "a{cited}b" for text, lockup, text. */
function shape(text: string): string {
  return splitTierNames(text)
    .map((s) => ("tier" in s ? "{" + s.tier + "}" : s.text))
    .join("");
}

test("a tier name in prose becomes a lockup", () => {
  assert.equal(
    shape("The scan tells you where a client stands today. alwaystracked keeps reading."),
    "The scan tells you where a client stands today. {tracked} keeps reading.",
  );
});

test("all four names are recognised", () => {
  for (const [key, plain] of Object.entries(TIER_PLAIN)) {
    assert.equal(shape("Everything in " + plain + ", and more"), "Everything in {" + key + "}, and more");
  }
});

test("more than one name in a sentence", () => {
  assert.equal(
    shape("alwaysmentioned places, alwayscited ranks"),
    "{mentioned} places, {cited} ranks",
  );
});

test("a sentence may open and close on a name", () => {
  assert.equal(shape("alwayscited"), "{cited}");
  assert.equal(shape("The one most agencies buy is alwayscited."), "The one most agencies buy is {cited}.");
});

/**
 * The guard that matters most. alwayscited is the company's domain as well as
 * a plan, so a URL must not acquire a purple half.
 */
test("a domain is not a lockup", () => {
  assert.equal(shape("Read it at alwayscited.com/legal"), "Read it at alwayscited.com/legal");
  assert.equal(shape("https://alwayscited.com"), "https://alwayscited.com");
  assert.equal(shape("hello@alwayscited.com"), "hello@alwayscited.com");
});

test("a slug or a path is not a lockup", () => {
  assert.equal(shape("/alwaystracked"), "/alwaystracked");
  assert.equal(shape("See /alwaysmentioned for the price"), "See /alwaysmentioned for the price");
});

test("a name inside a longer word is not a lockup", () => {
  assert.equal(shape("alwayscitedness"), "alwayscitedness");
  assert.equal(shape("pre-alwayscited"), "pre-alwayscited");
  assert.equal(shape("alwayscited-pro"), "alwayscited-pro");
});

/**
 * "pro" is ink, outside the brand word - which is what TierName's own
 * qualifier prop does with it. So it stays in the following text run.
 */
test("a qualifier stays as plain text after the word", () => {
  assert.equal(shape("That is alwaystracked pro, at a tighter cadence"), "That is {tracked} pro, at a tighter cadence");
});

test("text with no tier name is returned whole and unsplit", () => {
  const plain = "Three placements a month in the third-party articles the engines draw on.";
  assert.deepEqual(splitTierNames(plain), [{ text: plain }]);
});

test("an empty string produces no segments rather than an empty run", () => {
  assert.deepEqual(splitTierNames(""), []);
});

/**
 * The regex is module-level and global. matchAll clones it rather than sharing
 * lastIndex, but a switch to exec or test would not - so this pins that calling
 * it twice gives the same answer.
 */
test("the splitter is reusable", () => {
  const s = "Everything in alwaysmentioned";
  assert.equal(shape(s), shape(s));
});
