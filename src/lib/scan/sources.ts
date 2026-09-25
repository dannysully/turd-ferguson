import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { selectAll } from "@/lib/supabase/page";

import { classifySourceDomains } from "./anthropic";
import { normalizeDomain } from "./domain";
import { type SourceKind, sortSource } from "./source-kinds";

/**
 * What kind of site a cited source is. This is the actionable half of the
 * report: a competitor's site and a trade publication call for different work,
 * and a review site for different work again.
 *
 * The type and the whole decision in front of the classifier now live in
 * `source-kinds.ts`, which carries no `server-only` and no database, so a test
 * can execute them. Re-exported here because this is where the rest of the
 * tree imports it from.
 */
export type { SourceKind };

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
export async function classifySources(
  scanId: string,
  /**
   * Where the model calls are billed, as they are made rather than on the way
   * out.
   *
   * This function can throw after it has paid: storing the rows is the last
   * thing it does, and a failed upsert used to take the whole count with it.
   * The pipeline wraps both of its calls in never-fatal, so those calls were
   * made, swallowed and billed to nothing, and the day ceiling counted them as
   * zero - the same defect 20f8a84 closed on the start route.
   *
   * Still returned as anthropicCalls, so the ordinary path reads as it did.
   */
  billed: { calls: number } = { calls: 0 },
  /**
   * The names this pass's brand chain judged to be suppliers - the "who is
   * being named instead" list - resolved once `classifyBrands` has ruled.
   *
   * This function is started the moment the citations are stored, which is
   * before the brand chain has written `scan_brands`. So on a first pass the
   * read below found no competitors at all, the prompt said "none
   * identified", and category vendors cited for their own blog posts went on
   * the placement list (N9, 25 Sep 2026, scan 28a07760). The reads still
   * start early; only the model call waits for this.
   */
  leaderboard: Promise<string[]> = Promise.resolve([]),
): Promise<{ anthropicCalls: number; classified: number; unassessed: number }> {
  const db = supabaseAdmin();

  type CitedRow = { source_domain: string; url: string | null; title: string | null };

  /**
   * Paged, all three of them. Citations are the one per-scan table with no
   * small bound - questions x engines x however many sources each answer
   * cited - and a domain that falls off the end of an unpaged read is never
   * classified, so it never reaches the placement list and nothing says so.
   */
  const [{ data: scan, error: scanErr }, cited, done, brands] = await Promise.all([
    db.from("scans").select("domain, brand_name, topic").eq("id", scanId).single(),
    selectAll<CitedRow>((from, to) =>
      db
        .from("scan_citations")
        .select("source_domain, url, title")
        .eq("scan_id", scanId)
        .order("id", { ascending: true })
        .range(from, to),
    ),
    selectAll<{ domain: string }>((from, to) =>
      db
        .from("scan_sources")
        .select("domain")
        .eq("scan_id", scanId)
        .order("id", { ascending: true })
        .range(from, to),
    ),
    selectAll<{ brand: string; is_subject: boolean }>((from, to) =>
      db
        .from("scan_brands")
        .select("brand, is_subject")
        .eq("scan_id", scanId)
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);
  /**
   * Both ends are fatal, and they are not the same sentence.
   *
   * The error was discarded, so a read that did not answer arrived here as
   * `scan` being null and was reported as `scan <id> not found`. The pipeline
   * catches this and logs it as "source kinds skipped", which is the line
   * somebody reads when a report comes back with nothing sorted - and it named
   * the wrong cause. The behaviour is unchanged on purpose: the topic and the
   * brand steer the classifier, so guessing at them would spend a model call to
   * produce verdicts judged against the wrong category.
   */
  if (scanErr) throw new Error(`could not read scan ${scanId} to classify its sources: ${scanErr.message}`);
  if (!scan) throw new Error(`scan ${scanId} not found`);

  const already = new Set(done.map((r) => r.domain));
  const domains = [...new Set(cited.map((r) => r.source_domain))].filter(
    (d) => d && !already.has(d),
  );
  if (!domains.length) return { anthropicCalls: billed.calls, classified: 0, unassessed: 0 };

  const own = normalizeDomain(scan.domain as string);
  // The pages behind each domain, so the classifier can tell a ski feature
  // from a company filing on the same masthead.
  const pagesBy = new Map<string, { url: string | null; title: string | null }[]>();
  for (const c of cited) {
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
    const settled = sortSource(d, own);
    if (settled) {
      rows.push({ scan_id: scanId, domain: d, ...settled });
      continue;
    }
    unknown.push(d);
  }

  let unassessed = 0;
  if (unknown.length) {
    const competitors = [
      ...new Set([...brands.filter((b) => !b.is_subject).map((b) => b.brand), ...(await leaderboard)]),
    ];
    const judged = await classifySourceDomains(
      {
        topic: (scan.topic as string | null) ?? "",
        brand: (scan.brand_name as string | null) ?? (scan.domain as string),
        competitors,
        domains: unknown.map((d) => ({ domain: d, pages: pagesBy.get(d) ?? [] })),
      },
      billed,
    );
    // One call per batch, not one per scan, and counted on the accumulator as
    // each request goes out. The cost cap reads this, so an undercount here
    // would let a large scan spend more than the cap allows.
    /**
     * Keyed through normalizeDomain rather than on the string the model
     * returned, for the reason pipeline.ts keys the brand verdicts through
     * brandKey: the prompt asks for each domain back exactly as given, and a
     * prompt is not a guarantee.
     *
     * A miss here does not drop the domain, which would at least be visible.
     * It falls to the default a few lines below - other, on_topic false, no
     * note - which is a verdict nobody made, written for a domain the model in
     * fact read and placed. That verdict then keeps the domain off the
     * placement list, and because the row lands in scan_sources the gated pass
     * finds it in `already` and never asks again. One capital letter, and a
     * page a client could have been placed into is gone for the life of the
     * scan with nothing anywhere saying so.
     *
     * normalizeDomain folds exactly the differences that are case, a www.
     * prefix, a trailing dot or a scheme somebody pasted back in. The lookup
     * side is already normalised: these domains come off scan_citations, which
     * engines.ts wrote through the same function.
     */
    const byDomain = new Map(judged.sources.map((j) => [normalizeDomain(j.domain), j]));
    /**
     * Domains whose batch never came back get no row at all.
     *
     * Writing the default verdict for these was the defect. other with
     * on_topic false is what the classifier says about a domain it read and
     * could not place, so a failed batch stored fifty settled judgements
     * nobody had made. Two things followed: the placement list, which is the
     * part a visitor trades an email for, lost those domains and nothing said
     * so; and the rows landed in already, so the second pass skipped them and
     * the invented verdict stuck for the life of the scan.
     *
     * No row keeps every invariant. deriveOpportunities drops a domain with
     * no kind, so an unassessed one still cannot reach the list by accident.
     * The free source table renders it with a null kind, which is true. And
     * the second pass finds it missing from already and tries again.
     */
    const lost = new Set(judged.unassessed);
    unassessed = lost.size;
    for (const d of unknown) {
      if (lost.has(d)) continue;
      const j = byDomain.get(d);
      // A domain the model dropped from a batch that did come back is other
      // with no note, never a crash: the classifier read it and placed
      // nothing. That is a verdict, and on_topic false keeps it off the
      // opportunity list the way it always did.
      rows.push({
        scan_id: scanId,
        domain: d,
        kind: j?.kind ?? "other",
        note: j?.note ?? null,
        on_topic: j?.on_topic ?? false,
      });
    }
  }

  if (unassessed) {
    console.warn(
      "[scan] " + scanId + " sources: " + unassessed +
        " domain(s) went unassessed and were left for the next pass",
    );
  }

  if (!rows.length) return { anthropicCalls: billed.calls, classified: 0, unassessed };
  const { error } = await db.from("scan_sources").upsert(rows, { onConflict: "scan_id,domain" });
  if (error) throw new Error(`could not store the source kinds: ${error.message}`);
  return { anthropicCalls: billed.calls, classified: rows.length, unassessed };
}
