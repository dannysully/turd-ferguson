import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import { siteUrl } from "@/lib/scan/verify-email";
import { sendOrderEmail } from "@/lib/checkout/order-mail";
import { orderEmailText, orderRow, packsOn, subscriptionScanToken, type CompletedOrder } from "@/lib/checkout/webhook";
import { dayAfter, slugFor, trackingDay } from "@/lib/tracking/decide";
import { angleFor, clusterLimitFor, insertCluster, insertKeyword, insertPrompts, PROMPTS_PER_CLUSTER } from "@/lib/tracking/limits";
import { sendLoginLink } from "@/lib/tracking/login-mail";
import { LOGIN_TTL_MS, hashToken, newToken } from "@/lib/tracking/session";

/**
 * What the Stripe webhook writes (BRIEF-3 C4, 30 Sep 2026). Each returns
 * false only when Stripe should retry; the route then forgets the event id.
 *
 * checkout.session.completed with a scan token: the account by email, the
 * client from the scan at the tier bought, the first cluster from the scan's
 * keyword and its first five prompts (or "Needs a keyword" when the scan chose
 * none, R117), the buyer as owner, and a login link. Without a scan there is
 * no domain to track, so nothing is created and the order email says so.
 * One public.orders row per Session either way, keyed on its id so a replay
 * writes nothing; a refused row is logged and named in the order email, never
 * a retry, because the client above is already made. The order email goes to
 * Danny either way (pricing spec section 5).
 */

export const NEEDS_A_KEYWORD = "Needs a keyword";
const TIERS = ["tracked", "mentioned", "cited"];

async function clientFromScan(db: SupabaseClient, o: CompletedOrder): Promise<{ ok: boolean; outcome: string; clientId?: string }> {
  if (!o.scanToken) return { ok: true, outcome: "no scan on the order, so no client was created" };
  if (!o.email) return { ok: true, outcome: "no buyer email on the Session, so no client was created" };
  const tier = TIERS.includes(o.tier) ? o.tier : "tracked";

  const { data: scan, error: sErr } = await db
    .from("scans")
    .select("id, domain, brand_name, topic, market, status, cluster_keyword, cluster_keyword_volume, cluster_keyword_intent, cluster_keyword_status")
    .eq("public_token", o.scanToken)
    .maybeSingle();
  if (sErr) return { ok: false, outcome: `could not read the scan: ${sErr.message}` };
  if (!scan || scan.status !== "complete" || (scan.market !== "UK" && scan.market !== "US")) {
    return { ok: true, outcome: "the scan on the order is missing, unfinished or has no market, so no client was created" };
  }

  const { data: found, error: aErr } = await db.from("accounts").select("id").ilike("email", o.email).maybeSingle();
  if (aErr) return { ok: false, outcome: `could not read accounts: ${aErr.message}` };
  let accountId = found?.id as string | undefined;
  if (!accountId) {
    const { data: made, error: mErr } = await db.from("accounts").insert({ email: o.email }).select("id").single();
    if (mErr) return { ok: false, outcome: `could not create the account: ${mErr.message}` };
    accountId = made.id as string;
  }

  const startedOn = dayAfter(trackingDay());
  const { data: client, error: cErr } = await db
    .from("client_domains")
    .upsert(
      {
        account_id: accountId,
        domain: scan.domain as string,
        brand_name: scan.brand_name as string | null,
        topic: scan.topic as string | null,
        market: scan.market as string,
        slug: slugFor(scan.domain as string),
        status: "active",
        tier,
        started_on: startedOn,
        source_scan_id: scan.id as string,
      },
      { onConflict: "account_id,domain,topic,market" },
    )
    .select("id")
    .single();
  if (cErr) return { ok: false, outcome: `could not create the client: ${cErr.message}` };
  const clientId = client.id as string;

  const chosen = scan.cluster_keyword_status === "chosen" && typeof scan.cluster_keyword === "string" && scan.cluster_keyword.trim();
  const cluster = await insertCluster(db, clientId, { name: chosen ? (scan.cluster_keyword as string).trim() : NEEDS_A_KEYWORD, tier, started_on: startedOn });
  if (!cluster.ok) return { ok: false, outcome: `client made, cluster refused: ${cluster.message}`, clientId };
  const clusterId = cluster.ids[0]!;
  if (chosen) {
    const kw = await insertKeyword(db, clientId, clusterId, {
      keyword: (scan.cluster_keyword as string).trim(),
      added_on: startedOn,
      added_by: "nomada",
      search_volume: (scan.cluster_keyword_volume as number | null) ?? null,
      intent: (scan.cluster_keyword_intent as string | null) ?? null,
    });
    if (!kw.ok) return { ok: false, outcome: `cluster made, keyword refused: ${kw.message}`, clientId };
  }

  const { data: sq, error: qErr } = await db.from("scan_questions").select("idx, question, kind").eq("scan_id", scan.id).order("idx", { ascending: true });
  if (qErr) return { ok: false, outcome: `could not read the scan's prompts: ${qErr.message}`, clientId };
  // Each prompt keeps its scan kind as its angle (BRIEF-3 C3).
  const rows = (sq ?? [])
    .map((q) => ({ text: String(q.question).trim(), angle: angleFor(q.kind) }))
    .filter((q) => q.text.length >= 8 && q.text.length <= 300)
    .slice(0, PROMPTS_PER_CLUSTER)
    .map((q) => ({ text: q.text, angle: q.angle, source: "scan", added_on: startedOn, added_by: "nomada" }));
  const prompts = await insertPrompts(db, clientId, clusterId, rows);
  if (!prompts.ok) return { ok: false, outcome: `cluster made, prompts refused: ${prompts.message}`, clientId };

  const { error: memErr } = await db
    .from("dashboard_members")
    .upsert({ account_id: accountId, email: o.email, role: "owner" }, { onConflict: "account_id,email", ignoreDuplicates: true });
  if (memErr) return { ok: false, outcome: `client made, owner not added: ${memErr.message}`, clientId };

  // The login link, the same token row /api/app/login writes; sent to the member just stored.
  const token = newToken();
  const { error: tErr } = await db
    .from("dashboard_login_tokens")
    .insert({ token_hash: hashToken(token), email: o.email, ip_hash: null, expires_at: new Date(Date.now() + LOGIN_TTL_MS).toISOString(), used_at: null });
  const sent = !tErr && (await sendLoginLink({ memberEmail: o.email, link: `${siteUrl()}/app/auth?token=${token}` }));

  return {
    ok: true,
    clientId,
    outcome:
      `${scan.domain} at ${tier}, first check ${startedOn}; cluster "${chosen ? scan.cluster_keyword : NEEDS_A_KEYWORD}" with ${rows.length} prompt(s)` +
      `${chosen ? "" : " - pick its keyword in /admin/tracking"}; ${o.email} is owner; login link ${sent ? "sent" : "NOT sent"}.`,
  };
}

export async function onCheckoutCompleted(db: SupabaseClient, o: CompletedOrder, eventId: string): Promise<boolean> {
  const r = await clientFromScan(db, o);
  if (!r.ok) {
    console.error(`[stripe] signup failed for ${eventId}: ${r.outcome}`);
    return false;
  }
  if (r.clientId) {
    const { error } = await db.from("stripe_events").update({ client_domain_id: r.clientId }).eq("id", eventId);
    if (error) console.warn(`[stripe] event ${eventId} not linked to its client: ${error.message}`);
  }
  const mail = orderEmailText(o, `${r.outcome} Order row: ${await writeOrder(db, o, r.clientId ?? null)}.`, siteUrl());
  await sendOrderEmail({ ...mail, replyTo: o.email });
  return true;
}

async function writeOrder(db: SupabaseClient, o: CompletedOrder, clientId: string | null): Promise<string> {
  const built = orderRow(o, clientId);
  if (!built.row) {
    console.error(`[stripe] order row not written for ${o.sessionId}: ${built.reason}`);
    return `not written (${built.reason})`;
  }
  const { error } = await db.from("orders").upsert(built.row, { onConflict: "stripe_session_id", ignoreDuplicates: true });
  if (error) {
    console.error(`[stripe] order row not written for ${o.sessionId}: ${error.message}`);
    return `NOT written (${error.message})`;
  }
  return "written";
}

async function clientOfSubscription(db: SupabaseClient, sub: Record<string, unknown>): Promise<string | null | false> {
  const token = subscriptionScanToken(sub);
  if (!token) return null;
  const { data: scan, error } = await db.from("scans").select("id").eq("public_token", token).maybeSingle();
  if (error) return false;
  if (!scan) return null;
  const { data: c, error: cErr } = await db.from("client_domains").select("id").eq("source_scan_id", scan.id).order("created_at", { ascending: false }).limit(1);
  if (cErr) return false;
  return (c?.[0]?.id as string | undefined) ?? null;
}

/** Packs become cluster_limit (limits.ts: 10 + 5 per pack). No client for the subscription: nothing to do. */
export async function onSubscriptionUpdated(db: SupabaseClient, sub: Record<string, unknown>): Promise<boolean> {
  const clientId = await clientOfSubscription(db, sub);
  if (clientId === false) return false;
  if (!clientId) return true;
  const { error } = await db.from("client_domains").update({ cluster_limit: clusterLimitFor(packsOn(sub)) }).eq("id", clientId);
  if (error) console.error(`[stripe] cluster_limit not set: ${error.message}`);
  return !error;
}

/** Cancelled: the client ends. Nothing is deleted. */
export async function onSubscriptionDeleted(db: SupabaseClient, sub: Record<string, unknown>): Promise<boolean> {
  const clientId = await clientOfSubscription(db, sub);
  if (clientId === false) return false;
  if (!clientId) return true;
  const { error } = await db.from("client_domains").update({ status: "ended" }).eq("id", clientId);
  if (error) console.error(`[stripe] client not ended: ${error.message}`);
  return !error;
}
