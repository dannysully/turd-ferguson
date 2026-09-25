import assert from "node:assert/strict";
import { test } from "node:test";

import { NOT_LISTED_BASIS, bandOf, currentBasis, scoreDifficulty, selfServeCount } from "./placement-difficulty.ts";

test("bands", () => {
  assert.equal(bandOf(0), "Easy");
  assert.equal(bandOf(34), "Easy");
  assert.equal(bandOf(35), "Moderate");
  assert.equal(bandOf(64), "Moderate");
  assert.equal(bandOf(65), "Hard");
  assert.equal(bandOf(100), "Hard");
});

test("listed under $300 is easy, and rises with price", () => {
  const free = scoreDifficulty({ listing: { price: 0, dr: 40 }, kind: "placement" });
  const top = scoreDifficulty({ listing: { price: 300, dr: 40 }, kind: "placement" });
  assert.equal(free.score, 15);
  assert.equal(top.score, 34);
  assert.equal(top.band, "Easy");
  assert.equal(free.basis, "Listed on link marketplaces under $300");
});

test("$300-$1,000 is moderate, over $1,000 is hard", () => {
  const mid = scoreDifficulty({ listing: { price: 301, dr: 50 }, kind: "placement" });
  assert.equal(mid.band, "Moderate");
  assert.ok(mid.score >= 40 && mid.score <= 64);
  assert.equal(scoreDifficulty({ listing: { price: 1000, dr: 50 }, kind: "placement" }).score, 64);
  const dear = scoreDifficulty({ listing: { price: 1001, dr: 50 }, kind: "placement" });
  assert.equal(dear.band, "Hard");
  assert.equal(scoreDifficulty({ listing: { price: 20000, dr: 50 }, kind: "placement" }).score, 85);
});

test("not listed: a review site is organic effort, anything else a pitch", () => {
  assert.deepEqual(scoreDifficulty({ listing: null, kind: "review" }), {
    score: 50,
    band: "Moderate",
    basis: "Earned through reviews and a listing",
  });
  assert.deepEqual(scoreDifficulty({ listing: null, kind: "placement" }), {
    score: 80,
    band: "Hard",
    basis: "Not listed on link marketplaces - an editorial pitch",
  });
  // A listing with no price is not a price.
  assert.equal(scoreDifficulty({ listing: { price: null, dr: 60 }, kind: "placement" }).score, 80);
});

test("DR 80+ adds up to ten, capped at 100", () => {
  assert.equal(scoreDifficulty({ listing: { price: 0, dr: 79 }, kind: "placement" }).score, 15);
  assert.equal(scoreDifficulty({ listing: { price: 0, dr: 90 }, kind: "placement" }).score, 20);
  assert.equal(scoreDifficulty({ listing: { price: 0, dr: 100 }, kind: "placement" }).score, 25);
  assert.equal(scoreDifficulty({ listing: null, kind: "placement" }).score, 80);
  assert.equal(scoreDifficulty({ listing: { price: 20000, dr: 100 }, kind: "placement" }).score, 95);
});

test("the basis is one of five fixed sentences: never a price, never a marketplace", () => {
  const allowed = new Set([
    "Listed on link marketplaces under $300",
    "Listed on link marketplaces, $300-$1,000",
    "Listed on link marketplaces, over $1,000",
    "Earned through reviews and a listing",
    "Not listed on link marketplaces - an editorial pitch",
  ]);
  for (const price of [0, 150, 299, 450, 999, 2500, null]) {
    for (const kind of ["placement", "review"]) {
      const b = scoreDifficulty({ listing: price === null ? null : { price, dr: 50 }, kind }).basis;
      assert.ok(allowed.has(b), b);
    }
  }
});

test("a stored basis from before N8 renders in today's words, and nothing else is touched", () => {
  assert.equal(currentBasis("Not sold" + " anywhere - an editorial pitch"), NOT_LISTED_BASIS);
  assert.equal(currentBasis(NOT_LISTED_BASIS), NOT_LISTED_BASIS);
  assert.equal(currentBasis("Earned through reviews and a listing"), "Earned through reviews and a listing");
  assert.equal(currentBasis(null), null);
});

test("self-serve count is the easy ones of the scored ones", () => {
  assert.deepEqual(selfServeCount([{ difficulty: 20 }, { difficulty: 50 }, { difficulty: 80 }, { difficulty: null }, {}]), {
    easy: 1,
    scored: 3,
  });
});
