import { after } from "next/server";

import { describeAnthropicError, QUESTION_COUNT, readBrand } from "@/lib/scan/anthropic";
import { type ReadFailure, readSite, UnreachableDomain } from "@/lib/scan/crawl";
import { isMarket, isPlausibleDomain, normalizeDomain } from "@/lib/scan/domain";
import { estimateScanCost } from "@/lib/scan/engine-costs";
import { clientIp, hashIp } from "@/lib/scan/ip";
import { getSettings } from "@/lib/scan/settings";
import { anthropicCallsSince, recordModelCallDebit, spentSince } from "@/lib/scan/spend";
import { verifyTurnstile } from "@/lib/scan/turnstile";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function fail(status: number, code: string, message: string) {
  return Response.json({ error: code, message }, { status });
}

/**
 * What a visitor is told when we could not read their site.
 *
 * The 422 and 502 line is the same one the brand read already draws, and it is
 * the only distinction that matters to the person reading it: 422 means the
 * address is the thing to change, 502 means it is not. Only `dns` and
 * `not_html` are the visitor to fix. For the other three, "check the address"
 * is advice with nothing behind it - their address is right, and they are
 * being sent to look at the one thing that is not wrong.
 */
const SITE_READ_FAILURE: Record<
  ReadFailure,
  (domain: string, status?: number) => { http: number; code: string; message: string }
> = {
  dns: (d) => ({
    http: 422,
    code: "unreachable",
    message: `Nothing answered at ${d}. Check the address and try again.`,
  }),
  not_html: (d) => ({
    http: 422,
    code: "not_a_page",
    message: `${d} answered, but did not return a web page. Check the address and try again.`,
  }),
  blocked: (d, status) => ({
    http: 502,
    code: "site_blocked",
    // The status is in the sentence on purpose. This is the one failure a
    // visitor can act on without us - a 403 to a named crawler is an allowlist
    // entry on their side - and it is the one they would otherwise have to ask
    // us to look up.
    message:
      `${d} is up, but it would not serve the page to our reader` +
      `${status ? ` (HTTP ${status})` : ""}. ` +
      `That is usually a bot filter or a firewall rather than anything wrong with your address.`,
  }),
  timeout: (d) => ({
    http: 502,
    code: "site_slow",
    message: `${d} took too long to answer. Please try again in a moment.`,
  }),
  // Deliberately says nothing about what it resolved to. A visitor who has
  // pointed us at their own internal host needs to know we will not read it;
  // somebody sweeping for one does not need our resolver as an oracle.
  private: (d) => ({
    http: 422,
    code: "not_public",
    message: `${d} does not resolve to a public web server, so there is nothing for us to read.`,
  }),
  too_thin: (d) => ({
    http: 502,
    code: "too_little_text",
    message: `We reached ${d} but found too little text to read. If the page loads its words with JavaScript, that is the likely cause.`,
  }),
};

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

  /**
   * A ceiling that could not be read has not been cleared.
   *
   * The error was discarded here, and a failed count comes back null, so
   * `?? 0` stated "nothing has run today" as a fact whenever the read did not
   * answer - and the cap it guards was simply off for as long as that lasted.
   * The direction matters: the hour this fails in is an hour the database is
   * unwell, which is the same hour every request below still pays Anthropic for
   * a site read before reaching an insert that will fail. So the ceiling went
   * blind exactly when it was the only thing left, which is the shape
   * `anthropicCallsSince` was already fixed for.
   *
   * Refused rather than allowed, and it is not a new trade for this route: the
   * three ceilings around it - getSettings, spentSince, anthropicCallsSince -
   * all throw on a read that fails and so already refuse the scan. These two
   * were the outliers, with nothing written down to say why.
   *
   * Its own code, not "capped". The cap was not hit; we could not find out
   * whether it was, and a log that cannot tell those apart sends whoever reads
   * it to the wrong question.
   */
  const { count: todayCount, error: todayErr } = await db
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("is_tracking_run", false)
    .gte("created_at", since);
  if (todayErr) {
    console.warn("[scan] could not count today's scans, so the daily cap is unverified: " + todayErr.message);
    return fail(503, "cap_unreadable", "We could not start that scan just now. Please try again in a moment.");
  }
  if ((todayCount ?? 0) >= settings.daily_scan_cap) {
    return fail(503, "capped", "We have hit today's scan limit. We will be back shortly.");
  }

  // Spend is capped as well as volume: adding engines changes the cost of a
  // scan by an order of magnitude, so a count alone is no longer a safe limit.
  const spentToday = await spentSince(since, { excludeTrackingRuns: true });
  if (spentToday >= settings.daily_cost_cap_usd) {
    return fail(503, "capped", "We have hit today's scan limit. We will be back shortly.");
  }

  /**
   * The model bill, which the dollar cap above cannot see.
   *
   * daily_cost_cap_usd sums dfs_cost, and the call this route is about to
   * make - reading the site and naming the brand - costs nothing at
   * DataForSEO. So did the question set, the brand extraction, the
   * leaderboard judgement and the source classification. Every per-scan
   * ceiling in this codebase bounds one scan; nothing bounded a day.
   *
   * Checked here rather than inside the Anthropic client because this is the
   * first door and the cheapest place to refuse: every model call downstream
   * belongs to a scan that started here.
   *
   * A request that fails before the insert a few lines below has no row to
   * bill, and those calls used to be invisible here - the gap that mattered,
   * because the failure that produces them repeats. They now go to
   * model_call_debits and anthropicCallsSince adds them, so this reads the
   * whole day rather than the part of it that completed.
   */
  const callsToday = await anthropicCallsSince(since);
  if (callsToday >= settings.anthropic_calls_per_day) {
    console.warn(
      `[scan] model call cap reached: ${callsToday} of ${settings.anthropic_calls_per_day} in 24h`,
    );
    return fail(503, "capped", "We have hit today's scan limit. We will be back shortly.");
  }

  /**
   * The per-IP limit, refused rather than waved through when it cannot be read.
   *
   * Same defect as the daily cap above and the same fix, with one difference in
   * what the visitor is told: 429 "you have used today's free scans" would be a
   * statement about them that we have no basis for. We do not know how many
   * they have used - that is the whole failure - so this answers the same 503 as
   * the cap above rather than accusing them of something unmeasured.
   *
   * Scans that failed are not counted, decided by Danny on 20 September 2026:
   * "If our pass failed, that is ours. Do not charge a retry against their
   * allowance." A row only reaches status 'failed' once the pipeline has
   * started and died - a domain we cannot reach is refused with a 422 before
   * any row is inserted - so every row this excludes is one of ours, not a
   * scan the visitor got the benefit of.
   *
   * Deliberately narrower than it looks, and the narrowness is the point. This
   * is the per-IP ALLOWANCE, which is about what is fair to one visitor. The
   * daily scan cap, the dollar cap and the model call ceiling above all still
   * count failures, because those are about spend, and a pass that died still
   * spent. So a visitor cannot lose a scan to our bug, and we cannot lose a
   * day's budget to a loop of them: the two concerns are held by different
   * ceilings rather than one ceiling being asked to do both jobs badly.
   */
  const { count: ipCount, error: ipErr } = await db
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .neq("status", "failed")
    .gte("created_at", since);
  if (ipErr) {
    console.warn("[scan] could not count scans for this address, so the per-IP limit is unverified: " + ipErr.message);
    return fail(503, "cap_unreadable", "We could not start that scan just now. Please try again in a moment.");
  }
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
  //
  // The error is bound and logged rather than discarded. It is the one read in
  // this route whose failure is not refused, and that is deliberate: a cache
  // miss runs a real scan, which is correct data at the cost of a scan we did
  // not need to pay for. Refusing instead would turn a blip on an optimisation
  // into a visitor turned away. But it is spend, on the free tool the two
  // ceilings above exist to bound, and unlogged it looked exactly like a domain
  // nobody had scanned before.
  const { data: cached, error: cacheErr } = await db
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

  if (cacheErr) {
    console.warn(
      `[scan] could not read the domain cache for ${domain} (${market}), so this scan runs and is paid for ` +
        `whether or not a fresh one already existed: ${cacheErr.message}`,
    );
  }

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

  // What the brand read actually billed, rather than a flat one. withRetry
  // makes up to three requests and Anthropic bills each; the rewrite ceiling
  // in /questions is counted off this column and so is the admin cost figure,
  // so a scan that retried here used to get two free rewrites it had paid for.
  //
  // A read that throws has no scan row to be billed onto, because the row does
  // not exist until below. It is not lost any more: both failing exits record
  // what was spent to model_call_debits, which the daily ceiling above sums.
  const billed = { calls: 0 };
  // 4 and 5. Read the site, then one language model call to name the brand.
  let read;
  try {
    const siteText = await readSite(domain);
    read = await readBrand(siteText, billed);
  } catch (err) {
    if (err instanceof UnreachableDomain) {
      // Logged with its reason. Every one of these used to print nothing at
      // all and return the same sentence, so a whole class of site failing on
      // step one - anything behind a WAF, anything slower than the budget -
      // was indistinguishable in the log from people mistyping a domain.
      console.warn(
        `[scan] site read failed for ${domain}: ${err.reason}${err.status ? ` ${err.status}` : ""}`,
      );
      const told = SITE_READ_FAILURE[err.reason](domain, err.status);
      return fail(told.http, told.code, told.message);
    }
    // Logged rather than swallowed. These two failures look identical to a
    // visitor and are nothing alike: 422 is a site we could not fetch, and
    // this is a site we fetched and then could not read. One of those is ours.
    // nomadadigital.co.uk produced this on 19 Sep and it was the language
    // model returning 529, not the site - which is unreadable from the
    // response alone unless the reason is written down.
    console.warn(`[scan] read failed for ${domain}: ${describeAnthropicError(err)}`);
    // Paid for and unattributable. withRetry makes up to three requests before
    // it throws, and a 529 stretch is answered by visitors trying again - so
    // this is the exit where uncounted spend accumulates fastest.
    await recordModelCallDebit({
      calls: billed.calls,
      reason: "read_failed",
      domain,
      ipHash,
    });
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
      anthropic_calls: billed.calls,
    })
    .select("public_token")
    .single();

  if (error || !scan) {
    // The read succeeded and was billed; the row that would have carried the
    // cost is the thing that failed. Same debit, different reason, so the log
    // can tell a bad hour at Anthropic from a bad hour at our database.
    await recordModelCallDebit({
      calls: billed.calls,
      reason: "store_failed",
      domain,
      ipHash,
    });
    return fail(500, "store_failed", "We could not start that scan. Please try again.");
  }

  after(() => {
    // Our cost basis stays server side: it is in the log and the admin page,
    // never in a response a visitor can read.
    // QUESTION_COUNT, not a typed 14. This is the figure the daily dollar cap
    // is reasoned about against, so a question-count change that left it at 14
    // would understate or overstate every scan in the log while the cap itself
    // moved - the one place a stale copy of this number is hard to notice,
    // because nothing on screen contradicts it.
    const free = estimateScanCost(settings.scan_engines_free, QUESTION_COUNT).toFixed(3);
    const gated = estimateScanCost(settings.scan_engines_gated, QUESTION_COUNT).toFixed(3);
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
