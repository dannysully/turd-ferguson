import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { classifySourceDomains } from "./anthropic";
import { normalizeDomain } from "./domain";

/**
 * What kind of site a cited source is. This is the actionable half of the
 * report: a competitor's site and a trade publication call for different work,
 * and a review site for different work again.
 */
export type SourceKind = "own" | "competitor" | "review" | "placement" | "other";

/**
 * Review and directory sites. A brand gets onto these through reviews and
 * listings, which is a different job from placing an article, so the report
 * says so rather than lumping them in with publications.
 */
const REVIEW_SITES: Record<string, string> = {
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
const OTHER_SITES: Record<string, string> = {
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

function matchKnown(domain: string, table: Record<string, string>): string | null {
  for (const [site, note] of Object.entries(table)) {
    if (domain === site || domain.endsWith(`.${site}`)) return note;
  }
  return null;
}

/** Settles a domain without a model call, or returns null to ask the model. */
function knownKind(domain: string): { kind: SourceKind; note: string } | null {
  const review = matchKnown(domain, REVIEW_SITES);
  if (review) return { kind: "review", note: review };
  const other = matchKnown(domain, OTHER_SITES);
  if (other) return { kind: "other", note: other };
  if (/\.gov(\.[a-z]{2})?$/.test(domain)) return { kind: "other", note: "Government site" };
  if (domain.endsWith(".ac.uk") || domain.endsWith(".edu")) return { kind: "other", note: "Academic site" };
  return null;
}

/**
 * Labels every cited source the scan has not labelled yet. Idempotent: the
 * free pass calls it once, the gated pass calls it again for whatever
 * Perplexity and Claude added, and neither pays for a domain twice.
 *
 * Own domain, review sites and the obvious "other" sites are settled here.
 * Everything else goes to one model call with the leaderboard as context, so
 * a competitor's site is recognised as one even when its name is not in the
 * domain.
 */
export async function classifySources(scanId: string): Promise<{ anthropicCalls: number; classified: number }> {
  const db = supabaseAdmin();

  const [{ data: scan }, { data: cited }, { data: done }, { data: brands }] = await Promise.all([
    db.from("scans").select("domain, brand_name, topic").eq("id", scanId).single(),
    db.from("scan_citations").select("source_domain, url, title").eq("scan_id", scanId),
    db.from("scan_sources").select("domain").eq("scan_id", scanId),
    db.from("scan_brands").select("brand, is_subject").eq("scan_id", scanId),
  ]);
  if (!scan) throw new Error(`scan ${scanId} not found`);

  const already = new Set((done ?? []).map((r) => r.domain as string));
  const domains = [...new Set((cited ?? []).map((r) => r.source_domain as string))].filter(
    (d) => d && !already.has(d),
  );
  if (!domains.length) return { anthropicCalls: 0, classified: 0 };

  const own = normalizeDomain(scan.domain as string);
  // The pages behind each domain, so the classifier can tell a ski feature
  // from a company filing on the same masthead.
  const pagesBy = new Map<string, { url: string | null; title: string | null }[]>();
  for (const c of (cited ?? []) as Array<{ source_domain: string; url: string | null; title: string | null }>) {
    const list = pagesBy.get(c.source_domain) ?? [];
    if (list.length < 3 && !list.some((p) => p.url === c.url)) {
      list.push({ url: c.url, title: c.title });
    }
    pagesBy.set(c.source_domain, list);
  }

  const rows: {
    scan_id: string;
    domain: string;
    kind: SourceKind;
    note: string | null;
    on_topic: boolean | null;
  }[] = [];
  const unknown: string[] = [];

  for (const d of domains) {
    if (d === own || d.endsWith(`.${own}`)) {
      rows.push({ scan_id: scanId, domain: d, kind: "own", note: "Your own site", on_topic: true });
      continue;
    }
    const known = knownKind(d);
    if (known) {
      rows.push({ scan_id: scanId, domain: d, ...known, on_topic: true });
      continue;
    }
    unknown.push(d);
  }

  let anthropicCalls = 0;
  if (unknown.length) {
    const competitors = [...new Set((brands ?? []).filter((b) => !b.is_subject).map((b) => b.brand as string))];
    const judged = await classifySourceDomains({
      topic: (scan.topic as string | null) ?? "",
      brand: (scan.brand_name as string | null) ?? (scan.domain as string),
      competitors,
      domains: unknown.map((d) => ({ domain: d, pages: pagesBy.get(d) ?? [] })),
    });
    anthropicCalls = 1;
    const byDomain = new Map(judged.map((j) => [j.domain, j]));
    for (const d of unknown) {
      const j = byDomain.get(d);
      // A domain the model dropped is "other" with no note, never a crash.
      // on_topic defaults to false for a dropped row: an unassessed domain
      // should not reach an opportunity list by accident.
      rows.push({
        scan_id: scanId,
        domain: d,
        kind: j?.kind ?? "other",
        note: j?.note ?? null,
        on_topic: j?.on_topic ?? false,
      });
    }
  }

  const { error } = await db.from("scan_sources").upsert(rows, { onConflict: "scan_id,domain" });
  if (error) throw new Error(`could not store the source kinds: ${error.message}`);
  return { anthropicCalls, classified: rows.length };
}
