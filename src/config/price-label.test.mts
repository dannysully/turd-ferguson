import assert from "node:assert/strict";
import { test } from "node:test";

import { isPriceLabel, splitPriceLabel } from "./price-label.ts";

/**
 * The one piece of string handling on this site that decides what size a
 * number is printed at, and the one whose failure has a direction.
 *
 * `c2bf546` and the deleted `priceFor` were the same bug made twice: a floor
 * rendered as a flat price. "from $99/mo" shown as "$99/mo" is a number an
 * agency quotes their client before finding out it moves. So most of what is
 * asserted here is that a qualifier survives - including through the cases
 * that would tempt the parser to trim it away.
 *
 * The prices themselves are NOT retyped here. `pricing.test.mts` territory is
 * what a tier costs; this is only whether a label survives being split into
 * three pieces and put back together.
 */

/** Split and rejoin. Nothing may be lost between the two. */
function roundTrip(label: string): string {
  const p = splitPriceLabel(label);
  return p.prefix + p.figure + p.suffix;
}

test("a floor keeps its from, which is the bug this exists for", () => {
  const p = splitPriceLabel("from $99/mo");
  assert.equal(p.prefix, "from ");
  assert.equal(p.figure, "$99");
  assert.equal(p.suffix, "/mo");
  assert.ok(p.prefix, "the floor rendered as a flat price");
});

test("a flat price has no prefix to lose", () => {
  assert.deepEqual(splitPriceLabel("$995/mo"), { prefix: "", figure: "$995", suffix: "/mo" });
  assert.deepEqual(splitPriceLabel("$2,495/mo"), { prefix: "", figure: "$2,495", suffix: "/mo" });
});

test("a label that is not a price is rendered as it is", () => {
  assert.equal(isPriceLabel("Book a call"), false);
  assert.deepEqual(splitPriceLabel("Book a call"), { prefix: "", figure: "Book a call", suffix: "" });
  // "2 seats included" holds a digit and is not a price. Keying on the digit
  // would set it in 36px type.
  assert.equal(isPriceLabel("2 seats included"), false);
  assert.deepEqual(splitPriceLabel("2 seats included").figure, "2 seats included");
});

test("nothing is ever lost between splitting and rejoining", () => {
  for (const label of [
    "from $99/mo",
    "$995/mo",
    "$2,495/mo",
    "$99",
    "from $99",
    "$99/month",
    "From $99/mo",
    "Book a call",
    "",
    "$",
    "from $",
    "from ",
    "/mo",
  ]) {
    assert.equal(roundTrip(label), label, "a qualifier was dropped from: " + JSON.stringify(label));
  }
});

test("the label's own capitalisation survives", () => {
  // Rebuilding the prefix from the table rather than slicing it off the label
  // renders "From $99/mo" as "from $99/mo", which is a silent edit to copy.
  const p = splitPriceLabel("From $99/mo");
  assert.equal(p.prefix, "From ");
  assert.equal(p.figure, "$99");
  assert.equal(p.suffix, "/mo");
});

test("a suffix the board also uses is recognised", () => {
  assert.deepEqual(splitPriceLabel("$99/month"), { prefix: "", figure: "$99", suffix: "/month" });
  // "/month" must not be matched as "/mo" plus a stray "nth".
  assert.equal(splitPriceLabel("$99/month").figure, "$99");
});

test("a price with no period is all figure", () => {
  assert.deepEqual(splitPriceLabel("$99"), { prefix: "", figure: "$99", suffix: "" });
  assert.deepEqual(splitPriceLabel("from $99"), { prefix: "from ", figure: "$99", suffix: "" });
});

test("the figure is never empty, because the currency mark cannot be split away", () => {
  for (const label of ["from $", "$", "$/mo", "from $/mo"]) {
    const p = splitPriceLabel(label);
    assert.ok(p.figure.includes("$"), "an empty figure was returned for: " + JSON.stringify(label));
    assert.equal(roundTrip(label), label);
  }
});

test("only a price has its qualifiers de-emphasised", () => {
  /**
   * The early return is the whole of this: a label that merely *starts* with
   * "from" or ends in "/mo" and states no price must not have those words set
   * smaller than the rest, because there is no figure for them to qualify.
   */
  assert.deepEqual(splitPriceLabel("from the team"), { prefix: "", figure: "from the team", suffix: "" });
  assert.deepEqual(splitPriceLabel("billed /mo"), { prefix: "", figure: "billed /mo", suffix: "" });
});

test("surrounding whitespace is not silently eaten", () => {
  assert.equal(roundTrip(" $99/mo "), " $99/mo ");
});
