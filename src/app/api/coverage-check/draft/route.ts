import { COVERAGE_LIMITS } from "@/config/contact";
import { MAX_COVERAGE_BYTES, MAX_COVERAGE_ROWS, parseCoverageCsv } from "@/lib/coverage/csv";
import { recentReadingRefusal } from "@/lib/coverage/domain-ceiling";
import { clientDomainFrom, draftMarket, draftMarketLine, pretick, REPORT_LIMIT_LINE, tickedRows } from "@/lib/coverage/draft";
import { describeAnthropicError, readCoverage, type CoverageDraftRead } from "@/lib/scan/anthropic";
import { checkCeilings } from "@/lib/scan/ceilings";
import { readPieces } from "@/lib/scan/crawl";
import { clientIp, hashIp } from "@/lib/scan/ip";
import { getSettings } from "@/lib/scan/settings";
import { recordModelCallDebit } from "@/lib/scan/spend";
import { verifyTurnstile } from "@/lib/scan/turnstile";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Step 2 of /coverage-check: a draft built from the coverage (R140, Danny,
 * 30 Sep 2026, danny.md lines 128-133).
 *
 * Step 1 posts the coverage and nothing else. This reads the ticked pieces
 * through the crawl's guarded fetch and makes one model call over their text
 * for the brand, the claim, who it is for and five prompts. Nothing here asks
 * an engine anything; the reading starts only when step 2 posts to
 * /api/coverage-check with the same fields it always took.
 *
 * A paid door - one model call - so it stands behind Turnstile, the day's
 * ceilings (checkCeilings, which is also the kill switch) and its own per-IP
 * cap, DRAFTS_PER_IP_PER_DAY, counted off the model_call_debits rows each
 * draft writes. A draft that read no page makes no call and writes no row.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Drafts one hashed address may build in a rolling day. */
export const DRAFTS_PER_IP_PER_DAY = 10;

/** The debit reason the per-IP cap counts on. */
const DEBIT_REASON = "coverage_draft";

function fail(status: number, code: string, message: string) {
  return Response.json({ error: code, message }, { status });
}

export async function POST(req: Request) {
  let body: { coverageCsv?: unknown; coverageLinks?: unknown; turnstileToken?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_request", "Send a JSON body with the coverage.");
  }

  const ip = clientIp(req);
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : undefined;
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return fail(403, "turnstile_failed", "We could not verify that request. Please reload and try again.");
  }

  // The same bounds, in the same order, as the run route: the paste by the
  // textarea's constant, the file by bytes, then one parse of both.
  const links = typeof body.coverageLinks === "string" ? body.coverageLinks : "";
  if (links.length > COVERAGE_LIMITS.links.max) {
    return fail(413, "links_too_long", "That is more coverage than we take here. Upload it as a file instead.");
  }
  const file = typeof body.coverageCsv === "string" ? body.coverageCsv : "";
  if (Buffer.byteLength(file, "utf8") > MAX_COVERAGE_BYTES) {
    return fail(413, "coverage_too_large", `That file is larger than we accept. Send up to ${MAX_COVERAGE_ROWS} URLs.`);
  }
  const parsed = parseCoverageCsv([links, file].filter((t) => t.trim()).join("\n"));
  if (!parsed.rows.length) {
    return fail(400, "no_coverage", "We found no links in that. Paste the URLs of the pieces you placed, one per line.");
  }

  const ipHash = hashIp(ip);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin()
    .from("model_call_debits")
    .select("id", { count: "exact", head: true })
    .eq("reason", DEBIT_REASON)
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (error) {
    // Unlike the domain ceiling this one fails closed: it is the only bound
    // on this door that is about this caller.
    console.warn("[coverage] could not count drafts: " + error.message);
    return fail(503, "draft_unavailable", "We could not build a draft just now. Please try again in a moment.");
  }
  if ((count ?? 0) >= DRAFTS_PER_IP_PER_DAY) {
    return fail(429, "draft_limit", "You have built today's drafts. Try again tomorrow.");
  }

  const refusal = await checkCeilings({ settings: await getSettings(), since, ipHash, countCampaigns: true, subject: "benchmark" });
  if (refusal) return fail(refusal.http, refusal.code, refusal.message);

  const rows = pretick(parsed.rows);
  const pieces = await readPieces(tickedRows(rows).map((r) => r.url));
  const read = pieces.filter((p) => p.ok);
  const text = read.map((p) => `Piece: ${p.url}\n${p.text}`).join("\n\n").slice(0, 40_000);

  // Market before the call, from what needs no model: the publications and the
  // currency. The client domain's own ending is folded in once it is known.
  const publications = rows.map((r) => r.source_domain);
  const early = draftMarket({ clientDomain: null, rows: tickedRows(rows), text });

  let draft: CoverageDraftRead = { brand: "", claim: "", segment: "", prompts: [] };
  if (read.length) {
    const billed = { calls: 0 };
    try {
      draft = await readCoverage({ text, market: early.market }, billed);
    } catch (err) {
      // Never fatal: an empty draft is still step 2, every field editable.
      console.warn("[coverage] draft read failed: " + describeAnthropicError(err));
    } finally {
      await recordModelCallDebit({ calls: billed.calls, reason: DEBIT_REASON, ipHash });
    }
  }

  const clientDomain = draft.brand
    ? clientDomainFrom({ brand: draft.brand, links: read.flatMap((p) => p.links), publications })
    : null;
  const market = draftMarket({ clientDomain, rows: tickedRows(rows), text });

  return Response.json({
    brand: draft.brand,
    clientDomain: clientDomain ?? "",
    topic: draft.claim,
    segment: draft.segment,
    prompts: draft.prompts.map((p) => p.prompt),
    market: market.market,
    marketLine: draftMarketLine(market, clientDomain),
    rows,
    reportLimit: rows.length > tickedRows(rows).length ? REPORT_LIMIT_LINE : null,
    unread: pieces.filter((p) => !p.ok).map((p) => p.url),
    domainRefusal: clientDomain ? await recentReadingRefusal(clientDomain) : null,
  });
}
