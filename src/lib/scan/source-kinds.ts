/**
 * What kind of site a cited source is, as a decision.
 *
 * This is the half of `sources.ts` that decides. It lived inside that module
 * beside four Supabase reads and a model call, which meant nothing could
 * execute it: `sources.ts` is `server-only` and imports
 * `@/lib/supabase/admin`, so Node's own runner cannot load it. The
 * executed-file census on 20 September 2026 found it invisible to all 49
 * tests.
 *
 * Same move `ceilings-decide.ts` made out of `ceilings.ts` and
 * `client-ip.ts` out of `ip.ts`, for the same reason and with the same shape:
 * the network half stays behind, everything that decides moves here.
 *
 * ## What this decides, and why it is worth executing
 *
 * `sortSource` is the gate in front of the model. Anything it settles is never
 * shown to the classifier, so a wrong verdict here is not a verdict the model
 * had a chance to correct - and anything it declines to settle costs a model
 * call and takes whatever the model says.
 *
 * That matters because of what is downstream. `deriveOpportunities` treats
 * `review` and `placement` as placeable and everything else as not, so the
 * kind decided here is what puts a domain on - or keeps it off - the
 * placement list, which is the part a visitor trades an email address for.
 * The `other` bucket exists to hold "the engine's own property, gov.uk,
 * marketplaces": on the first real scan the model put google.com on the
 * opportunity list, and a list is judged by its worst row.
 */

/**
 * The five kinds, matching the `check` constraint on `scan_sources.kind` in
 * `20260918000000_scan_phase3_rank_and_source_kinds.sql`. That migration's
 * comment is the definition of each: `other` is "community, encyclopaedia,
 * government, marketplace, the engine's own property".
 */
export type SourceKind = "own" | "competitor" | "review" | "placement" | "other";

/**
 * Review and directory sites. A brand gets onto these through reviews and
 * listings, which is a different job from placing an article, so the report
 * says so rather than lumping them in with publications.
 */
export const REVIEW_SITES: Record<string, string> = {
  "g2.com": "Software review site",
  "capterra.com": "Software review site",
  "getapp.com": "Software review site",
  "softwareadvice.com": "Software review site",
  "trustradius.com": "Software review site",
  "crozdesk.com": "Software review site",
  "saasworthy.com": "Software review site",
  "alternativeto.net": "Software directory",
  "producthunt.com": "Product launch directory",
  "trustpilot.com": "Consumer review site",
  "reviews.io": "Consumer review site",
  "feefo.com": "Consumer review site",
  "clutch.co": "Agency review and directory site",
  "goodfirms.co": "Agency review and directory site",
  "designrush.com": "Agency directory",
  "gartner.com": "Analyst reviews and rankings",
  "yelp.com": "Local business reviews",
  "tripadvisor.com": "Travel reviews",
  "tripadvisor.co.uk": "Travel reviews",
  "checkatrade.com": "Trade reviews and directory",
  "glassdoor.com": "Employer reviews",
  "glassdoor.co.uk": "Employer reviews",
  "crunchbase.com": "Company directory",
};

/** Neither a competitor nor anywhere an article can be placed. */
export const OTHER_SITES: Record<string, string> = {
  "wikipedia.org": "Reference site",
  "youtube.com": "Video platform",
  "reddit.com": "Community - earned through participation, not placement",
  "quora.com": "Community - earned through participation, not placement",
  "linkedin.com": "Social network",
  "facebook.com": "Social network",
  "instagram.com": "Social network",
  "x.com": "Social network",
  "twitter.com": "Social network",
  "tiktok.com": "Social network",
  "amazon.com": "Marketplace",
  "amazon.co.uk": "Marketplace",
  "google.com": "The engine's own property",
  "bing.com": "The engine's own property",
};

/**
 * A listed site matches itself and anything under it, and nothing else.
 *
 * The `.` in the suffix test is load-bearing in the direction nobody checks:
 * without it `endsWith("x.com")` would swallow every domain ending in those
 * characters, and `x.com` is in the table above.
 */
export function matchKnown(domain: string, table: Record<string, string>): string | null {
  for (const [site, note] of Object.entries(table)) {
    if (domain === site || domain.endsWith(`.${site}`)) return note;
  }
  return null;
}

/**
 * Government, at the registry domain as well as under it.
 *
 * This used to be `/\.gov(\.[a-z]{2})?$/`, which requires a label before
 * `gov` and so did not match the bare string `gov.uk`. `normalizeDomain`
 * strips `www.`, so every citation of `https://www.gov.uk/guidance/...` -
 * the single most cited government host in this product's home market -
 * arrived here as exactly `gov.uk` and fell through. `hmrc.gov.uk` matched
 * and `gov.uk` did not.
 *
 * Falling through is not a neutral outcome. It sends the domain to the
 * classifier, where it costs a model call and takes whatever verdict comes
 * back - and `placement` is a plausible one for a host that publishes
 * guidance articles. That verdict puts "place an article on gov.uk" on a
 * client's opportunity list, which is the google.com failure the `other`
 * bucket exists to prevent.
 *
 * The anchor is `(^|\.)` rather than an optional dot so that a domain merely
 * ending in those three letters is still not government: `notgov` and
 * `gov.com` both fail, because `[a-z]{2}` is exactly two.
 */
const GOV = /(^|\.)gov(\.[a-z]{2})?$/;

/** Settles a domain without a model call, or returns null to ask the model. */
export function knownKind(domain: string): { kind: SourceKind; note: string } | null {
  const review = matchKnown(domain, REVIEW_SITES);
  if (review) return { kind: "review", note: review };
  const other = matchKnown(domain, OTHER_SITES);
  if (other) return { kind: "other", note: other };
  if (GOV.test(domain)) return { kind: "other", note: "Government site" };
  if (domain.endsWith(".ac.uk") || domain.endsWith(".edu")) return { kind: "other", note: "Academic site" };
  return null;
}

/** A settled row, in the shape `scan_sources` stores. */
export type SortedSource = { kind: SourceKind; note: string; on_topic: boolean };

/**
 * The whole gate in front of the classifier: the subject's own domain first,
 * then the known tables, then null for "ask the model".
 *
 * **The order is load-bearing.** The own check must come first or a subject
 * who is themselves a review site is reported as a review site rather than as
 * their own domain, and `own` is the one kind that means "you are already
 * here".
 *
 * `own` is passed in already normalised - it comes from
 * `normalizeDomain(scan.domain)` - and so are the domains, which come off
 * `scan_citations` where `engines.ts` wrote them through the same function.
 * Nothing here normalises again, and nothing here should: a second
 * normalisation would hide a caller that skipped the first.
 */
export function sortSource(domain: string, own: string): SortedSource | null {
  if (domain === own || domain.endsWith(`.${own}`)) {
    return { kind: "own", note: "Your own site", on_topic: true };
  }
  const known = knownKind(domain);
  if (known) return { ...known, on_topic: true };
  return null;
}
