import { after } from "next/server";

import { addReading, BenchmarkStoreError } from "@/lib/coverage/campaign";
import { checkCeilings } from "@/lib/scan/ceilings";
import { isMarket } from "@/lib/scan/domain";
import { isEngine } from "@/lib/scan/engines";
import { clientIp, hashIp } from "@/lib/scan/ip";
import { runScan } from "@/lib/scan/pipeline";
import { getSettings } from "@/lib/scan/settings";
import { isFreePassDead } from "@/lib/scan/stall";
import { verifyTurnstile } from "@/lib/scan/turnstile";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Ask the same five questions again.
 *
 * This is what the first reading was for. Everything else the benchmark does is
 * a snapshot somebody could have taken another way; the comparison is the thing
 * that needs a dated starting line, and until this existed the page promised
 * "the same five will be asked again" with nothing behind it.
 *
 * ## Why the token, and not what was typed
 *
 * `campaigns_lookup_idx` is on `(domain, topic, market, created_at desc)` and
 * the migration says a re-run is "found by what was typed, not by asking the
 * visitor to keep a token". That lookup is not used here, deliberately, and the
 * reason is a hazard the migration did not have in front of it: two agencies
 * benchmarking the same client on the same announcement is an ordinary thing to
 * happen, and it is exactly what that key collides on. The second one's reading
 * would attach to the first one's campaign - and the reading page shows the
 * campaign's uploaded coverage list. That is one agency's placement list handed
 * to another, from a form that asks for no credential at all.
 *
 * The token has no such case. Holding it is already proof of access to the
 * reading, because it is the only way to see one. Whether an unauthenticated
 * (domain, topic, market) re-run is wanted on top of that is Danny's call, and
 * it is in docs/blocked.md rather than decided here.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** The pass continues in after(), so this covers the run rather than the round trip. */
export const maxDuration = 300;

function fail(status: number, code: string, message: string) {
  return Response.json({ error: code, message }, { status });
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  let body: { turnstileToken?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // A re-run needs nothing but the token in the path, so an absent body is
    // not an error - it only means no Turnstile token, which the check below
    // refuses on its own in production.
  }

  const ip = clientIp(req);
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : undefined;
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return fail(403, "turnstile_failed", "We could not verify that request. Please reload and try again.");
  }

  const db = supabaseAdmin();

  // A read that failed is not a token that matches nothing. 404 tells somebody
  // their benchmark link is wrong, which is the one message that makes a person
  // close the tab, and it is the wrong one when the database did not answer.
  const { data: campaign, error: campaignErr } = await db
    .from("campaigns")
    .select("id, brand, domain, topic, segment, market")
    .eq("public_token", token)
    .maybeSingle();
  if (campaignErr) {
    console.warn("[coverage] could not read the campaign to re-run it: " + campaignErr.message);
    return fail(502, "read_failed", "We could not reach the benchmark. Try again.");
  }
  if (!campaign) return fail(404, "not_found", "That benchmark link does not match anything.");

  /**
   * A pass already in flight is not re-run, and a pass the platform killed does
   * not block one for ever.
   *
   * Without the first test a double-clicked button is two full readings of the
   * same campaign, billed twice and both landing in the history as separate
   * measurements taken seconds apart. Without the second, a row the platform
   * killed at `running` would refuse every re-run from then on, because nothing
   * server-side moves that row - which is the loop the confirm route had to be
   * fixed for.
   */
  const { data: latest, error: latestErr } = await db
    .from("scans")
    .select("id, status, started_at, queued_at")
    .eq("campaign_id", campaign.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestErr) {
    console.warn("[coverage] could not read the last reading before a re-run: " + latestErr.message);
    return fail(502, "read_failed", "We could not reach the benchmark. Try again.");
  }
  if (latest && (latest.status === "queued" || latest.status === "running") && !isFreePassDead(latest)) {
    return fail(409, "already_running", "That reading is still being taken. It will appear on its own.");
  }

  const ipHash = hashIp(ip);
  const settings = await getSettings();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  /**
   * The same ceilings a first reading passes, and `countCampaigns` off because
   * this writes no campaign row - the scans count below covers it, which is the
   * whole reason a reading is a scans row.
   */
  const refusal = await checkCeilings({ settings, since, ipHash, subject: "benchmark" });
  if (refusal) return fail(refusal.http, refusal.code, refusal.message);

  let scanId: string;
  try {
    scanId = await addReading({
      campaignId: campaign.id as string,
      brand: campaign.brand as string,
      domain: campaign.domain as string,
      topic: campaign.topic as string,
      segment: (campaign.segment as string | null) ?? null,
      market: isMarket(campaign.market) ? campaign.market : "UK",
      ipHash,
      /**
       * Today's free set, frozen onto this reading - not the previous one's.
       *
       * Two readings of one campaign can legitimately have been taken on
       * different engine sets, because the set has moved once already. The page
       * reports each reading against its own frozen list and its own
       * denominator, so a comparison stays honest about what changed; copying
       * the old set forward would instead make the product quietly stop reading
       * an engine it now offers, for ever, on every campaign started before the
       * change.
       */
      engines: settings.scan_engines_free,
    });
  } catch (err) {
    const step = err instanceof BenchmarkStoreError ? err.step : "unknown";
    console.error(
      `[coverage] could not re-run ${token} at the ${step} step: ` +
        (err instanceof Error ? err.message : String(err)),
    );
    return fail(500, "store_failed", "We could not start that reading. Please try again.");
  }

  after(async () => {
    console.log(
      `[coverage] re-reading ${token} for ${campaign.domain}: ` +
        settings.scan_engines_free.filter(isEngine).join(","),
    );
    await runScan(scanId);
  });

  return Response.json({ ok: true });
}
