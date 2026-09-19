import assert from "node:assert/strict";
import { test } from "node:test";

import { brandKey, namesBrand, pickDisplayName } from "./brand-name.ts";

/**
 * `namesBrand` decides `scan_answers.brand_named`, which is the number this
 * product sells: the visibility figure on the free result, the "names X" /
 * "does not name X" line against every engine on the report, the count in the
 * report email's subject, and - through `deriveOpportunities`, which treats a
 * page cited for an answer the brand was absent from as a placement
 * opportunity - the length of the gated placement list.
 *
 * It had no check of any kind until 20 September 2026, and it had shipped two
 * defects by then. The second is the one these cases were written for: a brand
 * with a full stop in it never matched its own spelling.
 *
 * The four suffix cases are the first defect, kept as regression cover.
 */

test("a brand with a full stop matches its own spelling", () => {
  // The defect, in its plainest form: the engine wrote the name exactly as the
  // site spells it and the answer was recorded as not naming the brand.
  assert.ok(namesBrand("Booking.com is the largest travel agency.", "Booking.com"));
  assert.ok(namesBrand("We recommend Checkout.com for payments.", "Checkout.com"));
  assert.ok(namesBrand("See gov.uk for the current guidance.", "Gov.uk"));
  assert.ok(namesBrand("St. Andrews Golf is open all year.", "St. Andrews Golf"));
});

test("a full stop in the name is optional in the prose, not required", () => {
  // Engines drop the stop as readily as they keep it, and the name is read off
  // the site rather than off the answer, so neither spelling can be assumed.
  assert.ok(namesBrand("Booking com is the largest.", "Booking.com"));
  assert.ok(namesBrand("bookingcom is the largest.", "Booking.com"));
  assert.ok(namesBrand("St Andrews Golf is open all year.", "St. Andrews Golf"));
});

test("a full stop is only allowed where the brand has one", () => {
  /**
   * The reason the two gaps are separate classes rather than one permissive
   * one. A sentence that ends on the first word of a brand and begins on the
   * second must not count as the brand being named - that is the flattering
   * direction, and it is the direction the suffix defect failed in too.
   */
  assert.equal(namesBrand("Improve the vibe. Retail buyers agree.", "Vibe Retail"), false);
  assert.equal(namesBrand("Sell more. Rock bottom prices.", "Sell More Rock"), false);
});

test("a name that is punctuation and one letter does not match everything", () => {
  /**
   * With full stops kept rather than removed, a degenerate name reaches the
   * pattern builder holding its separators, and an empty pattern would make
   * the expression `(^|[^a-z0-9])($|[^a-z0-9])` - true of almost any prose.
   */
  assert.equal(namesBrand("Any answer at all, really.", "."), false);
  assert.equal(namesBrand("Any answer at all, really.", "a."), false);
  assert.equal(namesBrand("Any answer at all, really.", "Ltd."), false);
});

test("a company suffix is folded away only at the end", () => {
  assert.ok(namesBrand("Acme is the one to use.", "Acme Ltd"));
  assert.ok(namesBrand("Acme is the one to use.", "Acme Co Ltd"));
  assert.ok(namesBrand("Smith is the one to use.", "Smith & Co., Ltd."));

  // The first defect. Each of these matched a common noun and reported the
  // brand as named.
  assert.equal(namesBrand("Read the magazine for more.", "Inc Magazine"), false);
  assert.equal(namesBrand("Try the shop on the corner.", "Company Shop"), false);
  assert.equal(namesBrand("Their edition prints sell out.", "Limited Edition Prints"), false);
  assert.ok(namesBrand("Co-op stocks it.", "Co-op"));
});

test("words may be run together, but not run into their neighbours", () => {
  assert.ok(namesBrand("NetAPorter carries it.", "Net-a-Porter"));
  assert.ok(namesBrand("Snow + Rock carries it.", "Snow+Rock"));
  assert.equal(namesBrand("The unacme approach.", "Acme"), false);
  assert.equal(namesBrand("Sell acmes by the dozen.", "Acme"), false);
});

test("brandKey folds the differences that are punctuation and nothing else", () => {
  assert.equal(brandKey("London Ski Co."), brandKey("London Ski Co"));
  assert.equal(brandKey("NET-A-PORTER"), brandKey("Net-a-Porter"));
  assert.equal(brandKey("Snow + Rock"), brandKey("Snow+Rock"));
  assert.equal(brandKey("Sportalm Kitzbühel"), brandKey("Sportalm Kitzbuhel"));
  // It deliberately does not merge on a prefix: "Moncler Grenoble" is a line,
  // not the house.
  assert.notEqual(brandKey("Moncler"), brandKey("Moncler Grenoble"));
});

test("the most-mentioned spelling is shown, and a tie does not shout", () => {
  assert.equal(pickDisplayName(new Map([["London Ski Co", 24], ["London Ski Co.", 12]])), "London Ski Co");
  assert.equal(pickDisplayName(new Map([["NET-A-PORTER", 6], ["Net-a-Porter", 6]])), "Net-a-Porter");
  assert.equal(pickDisplayName(new Map()), "");
});
