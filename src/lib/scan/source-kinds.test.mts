import assert from "node:assert/strict";
import { test } from "node:test";

import {
  OTHER_SITES,
  REVIEW_SITES,
  knownKind,
  matchKnown,
  sortSource,
} from "./source-kinds.ts";

/**
 * The gate in front of the classifier, executed.
 *
 * Nothing had ever run this. It was inside `sources.ts`, which is
 * `server-only` and imports `@/lib/supabase/admin`, so Node's runner could not
 * load it; the executed-file census found it among the invisible 31. It is
 * split now and this is what the split was for.
 *
 * **The property under test is not "it returns a kind".** It is *which* kind,
 * and in particular which side of `deriveOpportunities`' PLACEABLE set a
 * domain lands on - `review` and `placement` reach the placement list, every
 * other kind is excluded. A wrong verdict here does not throw, does not fail
 * a build, and looks like an ordinary row on the page. It either puts a
 * domain a client cannot be placed on in front of them, or silently removes
 * one they could have been.
 *
 * The second property is **what this gate refuses to settle**, which is just
 * as load-bearing and has no visible symptom at all: a `null` return is a
 * model call spent and a verdict taken from the model. That is how `gov.uk`
 * was reaching the classifier.
 */

/* ------------------------------------------------------------------ *
 * The tables
 * ------------------------------------------------------------------ */

test("a listed site matches itself, not only its subdomains", () => {
  // The bug this is pointed at: `endsWith("." + site)` alone would miss the
  // bare registered domain, which is the form a citation most often takes.
  for (const site of Object.keys(REVIEW_SITES)) {
    assert.equal(knownKind(site)?.kind, "review", `${site} should settle as review`);
  }
  for (const site of Object.keys(OTHER_SITES)) {
    assert.equal(knownKind(site)?.kind, "other", `${site} should settle as other`);
  }
});

test("a listed site matches under itself and carries the same note", () => {
  assert.equal(matchKnown("uk.trustpilot.com", REVIEW_SITES), REVIEW_SITES["trustpilot.com"]);
  assert.equal(matchKnown("en.wikipedia.org", OTHER_SITES), OTHER_SITES["wikipedia.org"]);
  assert.equal(knownKind("www.g2.com")?.note, "Software review site");
});

test("the dot in the suffix test is load-bearing", () => {
  /**
   * `x.com` is in OTHER_SITES. Without the `.` a bare `endsWith` would
   * swallow every domain whose name merely ends in those characters, and
   * "social network" is the verdict that keeps a domain off the placement
   * list - so the failure direction is a real publication silently dropped.
   */
  assert.equal(matchKnown("netflix.com", OTHER_SITES), null);
  assert.equal(matchKnown("phx.com", OTHER_SITES), null);
  assert.equal(matchKnown("notg2.com", REVIEW_SITES), null);
  assert.equal(matchKnown("myreviews.io", REVIEW_SITES), null);
});

test("the two tables are disjoint and neither shadows the other", () => {
  /**
   * `knownKind` reads REVIEW first, so a domain in both, or an OTHER entry
   * sitting under a REVIEW entry, would make the order silently decide the
   * kind. Nothing enforces that today except this assertion.
   */
  const review = Object.keys(REVIEW_SITES);
  const other = Object.keys(OTHER_SITES);
  assert.ok(review.length > 15 && other.length > 10, "denominator floor: the tables are populated");

  for (const r of review) {
    assert.ok(!other.includes(r), `${r} is in both tables`);
    for (const o of other) {
      assert.ok(!r.endsWith(`.${o}`), `${r} sits under ${o}`);
      assert.ok(!o.endsWith(`.${r}`), `${o} sits under ${r}`);
    }
  }
});

test("every table entry carries a non-empty note", () => {
  // The note is rendered beside the domain in the report, so an empty one is
  // a blank cell rather than an error.
  for (const [site, note] of [...Object.entries(REVIEW_SITES), ...Object.entries(OTHER_SITES)]) {
    assert.ok(note.trim().length > 0, `${site} has no note`);
  }
});

/* ------------------------------------------------------------------ *
 * Government and academic
 * ------------------------------------------------------------------ */

test("gov.uk is government at the registry domain, not only under it", () => {
  /**
   * The defect this was written for. The pattern was `/\.gov(\.[a-z]{2})?$/`,
   * which needs a label before `gov`, so `hmrc.gov.uk` matched and the bare
   * `gov.uk` did not - and `normalizeDomain` strips `www.`, so every citation
   * of `https://www.gov.uk/...` arrives here as exactly `gov.uk`.
   */
  assert.deepEqual(knownKind("gov.uk"), { kind: "other", note: "Government site" });
  assert.deepEqual(knownKind("hmrc.gov.uk"), { kind: "other", note: "Government site" });
  assert.deepEqual(knownKind("companieshouse.gov.uk"), { kind: "other", note: "Government site" });
  assert.deepEqual(knownKind("whitehouse.gov"), { kind: "other", note: "Government site" });
  assert.deepEqual(knownKind("gov.au"), { kind: "other", note: "Government site" });
});

test("a domain merely ending in those letters is not government", () => {
  // The widening above must not have widened past the anchor.
  assert.equal(knownKind("notgov"), null);
  assert.equal(knownKind("thegov.com"), null);
  assert.equal(knownKind("gov.com"), null, "[a-z]{2} is exactly two, so .com is not a country");
  assert.equal(knownKind("governance.org"), null);
});

test("academic is .ac.uk and .edu, and those are the only two", () => {
  assert.deepEqual(knownKind("ox.ac.uk"), { kind: "other", note: "Academic site" });
  assert.deepEqual(knownKind("mit.edu"), { kind: "other", note: "Academic site" });
  /**
   * Pinned as it stands rather than as it ought to be. `.edu.au` and `.ac.jp`
   * are universities and are not covered, so they go to the model - which is
   * a coverage call, not a defect, and is Danny's to widen. The assertion is
   * here so that widening it is a deliberate edit and not a surprise.
   */
  assert.equal(knownKind("unimelb.edu.au"), null);
  assert.equal(knownKind("u-tokyo.ac.jp"), null);
});

/* ------------------------------------------------------------------ *
 * sortSource: the order, and what reaches the model
 * ------------------------------------------------------------------ */

test("the subject's own domain wins over every table", () => {
  /**
   * The order is load-bearing and was held by nothing but the order of the
   * lines. A subject who is themselves a review site must be reported as
   * their own domain: `own` means "you are already here", `review` means "go
   * get listed", and they are opposite instructions.
   */
  assert.deepEqual(sortSource("g2.com", "g2.com"), {
    kind: "own",
    note: "Your own site",
    on_topic: true,
  });
  assert.equal(sortSource("blog.g2.com", "g2.com")?.kind, "own");
  assert.equal(sortSource("gov.uk", "gov.uk")?.kind, "own");
});

test("own matches under the subject's domain and not across it", () => {
  assert.equal(sortSource("shop.example.com", "example.com")?.kind, "own");
  assert.equal(sortSource("notexample.com", "example.com"), null, "no dot, no match");
  assert.equal(sortSource("example.com.evil.net", "example.com"), null, "suffix, not prefix");
});

test("a settled row is always on_topic true, and that is what keeps review placeable", () => {
  /**
   * `deriveOpportunities` excludes `on_topic === false` as a separate test
   * from kind, so a review site written false would be silently dropped from
   * the placement list while still looking correctly classified in the source
   * table. Pinned in both directions.
   */
  assert.equal(sortSource("capterra.com", "example.com")?.on_topic, true);
  assert.equal(sortSource("reddit.com", "example.com")?.on_topic, true);
  assert.equal(sortSource("example.com", "example.com")?.on_topic, true);
});

test("the kinds this gate can emit are exactly own, review and other", () => {
  /**
   * The denominator, and the reason this gate is safe to run before the
   * model: it can never emit `competitor` or `placement`. Those are the two
   * verdicts that need to know who the subject competes with and what the
   * scan is about, which is precisely what the classifier is given and this
   * function is not. If a later edit lets a table entry emit `placement`,
   * a domain reaches the placement list without anyone having judged it
   * against the topic.
   */
  const emitted = new Set<string>();
  for (const site of [...Object.keys(REVIEW_SITES), ...Object.keys(OTHER_SITES)]) {
    emitted.add(sortSource(site, "example.com")!.kind);
  }
  emitted.add(sortSource("gov.uk", "example.com")!.kind);
  emitted.add(sortSource("ox.ac.uk", "example.com")!.kind);
  emitted.add(sortSource("example.com", "example.com")!.kind);
  assert.deepEqual([...emitted].sort(), ["other", "own", "review"]);
});

test("an ordinary publication is not settled here and goes to the model", () => {
  /**
   * The other half of the gate, and the one with no visible symptom: null is
   * a model call spent. A table that grew to swallow these would quietly stop
   * asking the classifier whether a publication is on topic.
   */
  for (const d of ["techcrunch.com", "ft.com", "theguardian.com", "smashingmagazine.com"]) {
    assert.equal(sortSource(d, "example.com"), null, `${d} should reach the classifier`);
  }
});
