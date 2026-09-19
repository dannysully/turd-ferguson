import { after } from "next/server";

import { describeAnthropicError, readBrand } from "@/lib/scan/anthropic";
import { readSite, UnreachableDomain } from "@/lib/scan/crawl";
import { isMarket, isPlausibleDomain, normalizeDomain } from "@/lib/scan/domain";
import { estimateScanCost } from "@/lib/scan/engine-costs";
import { clientIp, hashIp } from "@/lib/scan/ip";
import { getSettings } from "@/lib/scan/settings";
import { spentSince } from "@/lib/scan/spend";
import { verifyTurnstile } from "@/lib/scan/turnstile";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function fail(status: number, code: string, message: string) {
  return Response.json({ error: code, message }, { status });
}

export async function POST(req: Request) {
  let body: { domain?: string; turnstileToken?: string; market?: string };
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_request", "Send a JSON body with a domain.");
  }

  const ip = clientIp(req);

  // 1. Bot filter first: everything below this line costs money or database work.
  if (!(await verifyTurnstile(body.turnstileToken, ip))) {
    return fail(403, "turnstile_failed", "We could not verify that request. Please reload and try again.");
  }

  // 2. Normalise and validate the domain.
  const domain = normalizeDomain(body.domain ?? "");
  if (!isPlausibleDomain(domain)) {
    return fail(400, "bad_domain", "That does not look like a website address. Try example.com.");
  }
  const market = isMarket(body.market) ? body.market : "UK";

  const db = supabaseAdmin();
  const ipHash = hashIp(ip);

  // 3. Caches and limits, cheapest first, failing fast.
  const settings = await getSettings();
  if (!settings.scans_enabled) {
    return fail(503, "paused", "Scans are paused right now. We will be back shortly.");
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count: todayCount } = await db
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("is_tracking_run", false)
    .gte("created_at", since);
  if ((todayCount ?? 0) >= settings.daily_scan_cap) {
    return fail(503, "capped", "We have hit today's scan limit. We will be back shortly.");
  }

  // Spend is capped as well as volume: adding engines changes the cost of a
  // scan by an order of magnitude, so a count alone is no longer a safe limit.
  const spentToday = await spentSince(since, { excludeTrackingRuns: true });
  if (spentToday >= settings.daily_cost_cap_usd) {
    return fail(503, "capped", "We have hit today's scan limit. We will be back shortly.");
  }

  const { count: ipCount } = await db
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if ((ipCount ?? 0) >= settings.ip_scans_per_day) {
    return fail(429, "rate_limited", "You have used today's free scans. Try again tomorrow.");
  }

  // A complete scan for this domain inside the cache window is returned as is.
  // Repeat visits are instant and spend on a given domain is capped.
  //
  // Unlocked scans are excluded, and that single condition is load-bearing.
  // This cache is keyed on (domain, market) and nothing else - it does not know
  // or check who is asking - so without the filter the token handed back is
  // whichever scan ran most recently, including one somebody else opened with
  // their email. The full report gates on unlocked_at alone and treats the
  // public token as the credential, and the result screen fetches it
  // unconditionally on arrival. So the visitor would land on the unlocked
  // report having given no address: the placement list, every source and the
  // detailed question table, which is the one thing the funnel asks for an
  // email to see.
  //
  // Tracking runs are excluded for the same reason the daily cap above excludes
  // them: they are a paying client's scheduled re-read of their own domain, not
  // a free scan anyone may be handed. Without this a visitor who typed a
  // client's domain would be served that client's tracking run as their own
  // result.
  //
  // The filter costs one extra scan per unlocked domain, not one per visitor.
  // The fresh scan is itself locked, so it becomes the entry the next visitor
  // hits, and the caps above bound it either way.
  const cacheSince = new Date(Date.now() - settings.domain_cache_days * 86_400_000).toISOString();
  const { data: cached } = await db
    .from("scans")
    .select("public_token, brand_name, topic, topic_variants, market, status, engines")
    .eq("domain", domain)
    .eq("market", market)
    .eq("status", "complete")
    .eq("is_tracking_run", false)
    .is("unlocked_at", null)
    .gte("completed_at", cacheSince)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached?.public_token) {
    return Response.json({
      token: cached.public_token,
      brand_name: cached.brand_name,
      suggested_topic: cached.topic,
      topic_variants: cached.topic_variants ?? [],
      market: cached.market,
      // The stored scan's own engine set, not today's: the result on screen
      // must describe the run that produced it.
      engines: cached.engines ?? [],
      cached: true,
      status: "complete",
    });
  }

  // 4 and 5. Read the site, then one language model call to name the brand.
  let read;
  try {
    const siteText = await readSite(domain);
    read = await readBrand(siteText);
  } catch (err) {
    if (err instanceof UnreachableDomain) {
      return fail(422, "unreachable", `We could not read ${domain}. Check the address and try again.`);
    }
    // Logged rather than swallowed. These two failures look identical to a
    // visitor and are nothing alike: 422 is a site we could not fetch, and
    // this is a site we fetched and then could not read. One of those is ours.
    // nomadadigital.co.uk produced this on 19 Sep and it was the language
    // model returning 529, not the site - which is unreadable from the
    // response alone unless the reason is written down.
    console.warn(`[scan] read failed for ${domain}: ${describeAnthropicError(err)}`);
    return fail(502, "read_failed", "We could not read that site just now. Please try again.");
  }

  // 6. Insert, awaiting the topic the visitor confirms.
  const { data: scan, error } = await db
    .from("scans")
    .insert({
      domain,
      brand_name: read.brand_name,
      positioning: read.positioning,
      topic: read.confidence === "high" ? read.suggested_topic : null,
      topic_variants: read.topic_variants ?? [],
      market,
      status: "pending_topic",
      ip_hash: ipHash,
      // Both sets are frozen onto the row at start, so a settings change
      // mid-scan cannot leave a result claiming engines it never read.
      engines: settings.scan_engines_free,
      gated_engines: settings.scan_engines_gated,
      anthropic_calls: 1,
    })
    .select("public_token")
    .single();

  if (error || !scan) {
    return fail(500, "store_failed", "We could not start that scan. Please try again.");
  }

  after(() => {
    // Our cost basis stays server side: it is in the log and the admin page,
    // never in a response a visitor can read.
    const free = estimateScanCost(settings.scan_engines_free, 14).toFixed(3);
    const gated = estimateScanCost(settings.scan_engines_gated, 14).toFixed(3);
    console.log(
      `[scan] started ${domain} (${market}) free=${settings.scan_engines_free.join(",")} ($${free}) ` +
        `gated=${settings.scan_engines_gated.join(",")} ($${gated} on unlock)`,
    );
  });

  return Response.json({
    token: scan.public_token,
    engines: settings.scan_engines_free,
    // Named so the gate can say what the email actually buys.
    gated_engines: settings.scan_engines_gated,
    brand_name: read.brand_name,
    // A low-confidence guess is withheld: the field opens empty rather than
    // pre-filled with something wrong.
    suggested_topic: read.confidence === "high" ? read.suggested_topic : null,
    // Shown at step 2 so the agency can see how the site narrowed the category,
    // and correct it before fourteen questions are built on top of it.
    topic_variants: read.topic_variants ?? [],
    positioning: read.positioning,
    confidence: read.confidence,
    market,
    cached: false,
    status: "pending_topic",
  });
}
