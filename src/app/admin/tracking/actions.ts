"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { type TierKey } from "@/components/TierName";
import { enginesFor } from "@/config/pricing";
import { constantTimeEqual, decodeBasicAuth } from "@/lib/constant-time";
import { isPlausibleEmail } from "@/lib/email-address";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ADMIN_LIMITS, dayAfter, liveOn, slugFor, trackingDay, upsellSetting } from "@/lib/tracking/decide";
import { NEEDS_A_KEYWORD } from "@/lib/checkout/signup";
import { type Angle, angleFor, groupPrompts, insertCluster, insertKeyword, insertPrompts, linkKeyword, PROMPTS_PER_CLUSTER, readPromptRoom, refuseGrouping } from "@/lib/tracking/limits";
import { dispatchTrackingRun } from "@/lib/tracking/runner";

/**
 * /admin/tracking's writes - T2 of docs/tracked-dashboard-2026-09-29/BRIEF.md
 * (Danny, 29 Sep 2026).
 *
 * The /admin proxy is not enough on its own: a server action is invoked by
 * its action id and Next answers that id on any path, not only the page that
 * rendered the form. So every action checks the same Basic auth itself, with
 * the proxy's own helpers, before it reads or writes anything. The browser
 * sends the header because the post goes to /admin/tracking, inside the realm.
 *
 * Every action returns a sentence rather than throwing, so the page can say
 * what happened. Limits are enforced in `limits.ts` (BRIEF-3 C2), never only
 * in the form; every tracked insert goes through it.
 */

export type AdminResult = { ok: boolean; message: string };

const TIERS = ["tracked", "mentioned", "cited", "everywhere"];

/** The proxy's check, repeated inside the action. Null when the caller is the admin. */
async function refuseUnlessAdmin(): Promise<AdminResult | null> {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!user || !password) return { ok: false, message: "Admin access is not configured." };
  const creds = decodeBasicAuth((await headers()).get("authorization") ?? "");
  if (!creds) return { ok: false, message: "Not authorised." };
  const userOk = constantTimeEqual(creds.user, user);
  const passwordOk = constantTimeEqual(creds.password, password);
  return userOk && passwordOk ? null : { ok: false, message: "Not authorised." };
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** Create a tracked client from a finished scan: its domain, brand, market and questions. */
export async function createClientFromScan(_prev: AdminResult | null, form: FormData): Promise<AdminResult> {
  const refused = await refuseUnlessAdmin();
  if (refused) return refused;
  const token = text(form, "scan").replace(/^.*\/scan\//, "").replace(/[/?#].*$/, "");
  const email = text(form, "email").toLowerCase();
  const tier = text(form, "tier") || "tracked";
  if (!/^[0-9a-f]{32}$/i.test(token)) return { ok: false, message: "Paste a scan URL or its 32-character token." };
  if (email.length > ADMIN_LIMITS.email || !isPlausibleEmail(email)) return { ok: false, message: "An owner email is needed." };
  if (!TIERS.includes(tier)) return { ok: false, message: "Unknown tier." };

  const db = supabaseAdmin();
  const { data: scan, error: sErr } = await db
    .from("scans")
    .select("id, domain, brand_name, topic, market, status, cluster_keyword, cluster_keyword_volume, cluster_keyword_intent, cluster_keyword_status")
    .eq("public_token", token)
    .maybeSingle();
  if (sErr) return { ok: false, message: `Could not read the scan: ${sErr.message}` };
  if (!scan) return { ok: false, message: "No scan with that token." };
  if (scan.status !== "complete") return { ok: false, message: `That scan is ${scan.status}, not complete.` };
  if (scan.market !== "UK" && scan.market !== "US") return { ok: false, message: "That scan has no market." };

  // The account: found by email, or made.
  const { data: found, error: aErr } = await db.from("accounts").select("id").ilike("email", email).maybeSingle();
  if (aErr) return { ok: false, message: `Could not read accounts: ${aErr.message}` };
  let accountId = found?.id as string | undefined;
  if (!accountId) {
    const { data: made, error: mErr } = await db.from("accounts").insert({ email }).select("id").single();
    if (mErr) return { ok: false, message: `Could not create the account: ${mErr.message}` };
    accountId = made.id as string;
  }

  const startedOn = dayAfter(trackingDay());
  // question_limit and keyword_limit keep their column defaults and are no
  // longer read (BRIEF-3 C0/C2); cluster_limit is left to its default on
  // insert so a re-run never undoes packs the webhook set.
  const fields = {
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
  };

  // One client per (account, domain, topic, market) - the existing unique key.
  const { data: client, error: cErr } = await db
    .from("client_domains")
    .upsert(fields, { onConflict: "account_id,domain,topic,market" })
    .select("id")
    .single();
  if (cErr) return { ok: false, message: `Could not create the client: ${cErr.message}` };

  const { data: existing, error: eErr } = await db
    .from("tracked_questions")
    .select("text")
    .eq("client_domain_id", client.id);
  if (eErr) return { ok: false, message: `Could not read the client's prompts: ${eErr.message}` };
  const have = new Set((existing ?? []).map((q) => String(q.text).toLowerCase()));

  const { data: sq, error: qErr } = await db
    .from("scan_questions")
    .select("idx, question, kind")
    .eq("scan_id", scan.id)
    .order("idx", { ascending: true });
  if (qErr) return { ok: false, message: `Could not read the scan's prompts: ${qErr.message}` };
  const room = await readPromptRoom(db, client.id as string, null);
  if (typeof room === "string") return { ok: false, message: room };
  // Each prompt keeps its scan kind as its angle (BRIEF-3 C3).
  const rows = (sq ?? [])
    .map((q) => ({ text: String(q.question).trim(), angle: angleFor(q.kind) }))
    .filter((q) => q.text.length >= 8 && q.text.length <= 300 && !have.has(q.text.toLowerCase()))
    .slice(0, room.room)
    .map((q) => ({ text: q.text, angle: q.angle, source: "scan", added_on: startedOn, added_by: "nomada" }));

  // A scan made since C1 carries its cluster keyword (or says none qualified):
  // its first 5 prompts become the first cluster, as signup does. An older
  // scan (status null) has no cluster; its prompts stay ungrouped for grouping below.
  let clustered = 0;
  if (scan.cluster_keyword_status && rows.length && have.size === 0) {
    const chosen = scan.cluster_keyword_status === "chosen" && typeof scan.cluster_keyword === "string" && scan.cluster_keyword.trim();
    const cluster = await insertCluster(db, client.id as string, { name: chosen ? (scan.cluster_keyword as string).trim() : NEEDS_A_KEYWORD, tier, started_on: startedOn });
    if (!cluster.ok) return { ok: false, message: `Client made, cluster refused: ${cluster.message}` };
    if (chosen) {
      const kw = await insertKeyword(db, client.id as string, cluster.ids[0]!, {
        keyword: (scan.cluster_keyword as string).trim(),
        added_on: startedOn,
        added_by: "nomada",
        search_volume: (scan.cluster_keyword_volume as number | null) ?? null,
        intent: (scan.cluster_keyword_intent as string | null) ?? null,
      });
      if (!kw.ok) return { ok: false, message: `Cluster made, keyword refused: ${kw.message}` };
    }
    const first = await insertPrompts(db, client.id as string, cluster.ids[0]!, rows.slice(0, PROMPTS_PER_CLUSTER));
    if (!first.ok) return { ok: false, message: `Cluster made, prompts refused: ${first.message}` };
    clustered = Math.min(rows.length, PROMPTS_PER_CLUSTER);
  }
  const copied = await insertPrompts(db, client.id as string, null, rows.slice(clustered));
  if (!copied.ok) return { ok: false, message: `Could not copy the prompts: ${copied.message}` };

  const { error: memErr } = await db
    .from("dashboard_members")
    .upsert({ account_id: accountId, email, role: "owner" }, { onConflict: "account_id,email", ignoreDuplicates: true });
  if (memErr) return { ok: false, message: `Client made, but the owner could not be added: ${memErr.message}` };

  revalidatePath("/admin/tracking");
  return { ok: true, message: `${scan.domain} set up: ${rows.length} scan prompt(s), first check ${startedOn}.` };
}

/** Add a Nomada question or a keyword, up to the client's allowance (limits.ts). */
export async function addTracked(_prev: AdminResult | null, form: FormData): Promise<AdminResult> {
  const refused = await refuseUnlessAdmin();
  if (refused) return refused;
  const clientId = text(form, "client");
  const kind = text(form, "kind");
  const value = text(form, "value");
  if (kind !== "question" && kind !== "keyword") return { ok: false, message: "Unknown kind." };
  if (kind === "question" && (value.length < 8 || value.length > 300)) return { ok: false, message: "A prompt is 8 to 300 characters." };
  if (kind === "keyword" && (value.length < 2 || value.length > 120)) return { ok: false, message: "A keyword is 2 to 120 characters." };

  const db = supabaseAdmin();
  const table = kind === "question" ? "tracked_questions" : "tracked_keywords";
  const column = kind === "question" ? "text" : "keyword";
  const { data: live, error: lErr } = await db
    .from(table)
    .select(`${column}, added_on, stopped_on`)
    .eq("client_domain_id", clientId)
    .is("stopped_on", null);
  if (lErr) return { ok: false, message: `Could not read the current list: ${lErr.message}` };
  const rows = (live ?? []) as unknown as Record<string, string | null>[];
  if (rows.some((r) => String(r[column]).toLowerCase() === value.toLowerCase())) {
    return { ok: false, message: `That ${kind} is already tracked.` };
  }

  const addedOn = dayAfter(trackingDay());
  // Ungrouped until C3's cluster form names one; limits.ts refuses past the allowance.
  const written =
    kind === "question"
      ? await insertPrompts(db, clientId, null, [{ text: value, source: "nomada", added_on: addedOn, added_by: "nomada" }])
      : await insertKeyword(db, clientId, null, { keyword: value, added_on: addedOn, added_by: "nomada" });
  if (!written.ok) return { ok: false, message: written.message };
  revalidatePath("/admin/tracking");
  return { ok: true, message: `Added; first check ${addedOn}.` };
}

/**
 * Group prompts into a cluster - BRIEF-3 C3 (Danny, 29 Sep 2026). With no
 * cluster named, makes a new one on the keyword typed; with one named, adds
 * prompts to it and, if it has none, its keyword. The keyword is an existing
 * ungrouped one when the text matches, else a new row. Each prompt without an
 * angle takes its scan kind, matched by text on the client's source scan.
 * Nothing is re-created or re-run: readings stay on the same rows.
 *
 * The keyword is not yet run through C1's volume and intent check; that check
 * is built with C1 and this form calls it then. Until then Nomada types it.
 */
export async function groupCluster(_prev: AdminResult | null, form: FormData): Promise<AdminResult> {
  const refused = await refuseUnlessAdmin();
  if (refused) return refused;
  const clientId = text(form, "client");
  const clusterIdIn = text(form, "cluster");
  const keyword = text(form, "keyword");
  const ids = form.getAll("prompt").map((v) => String(v)).filter(Boolean);
  if (keyword && (keyword.length < 2 || keyword.length > 120)) return { ok: false, message: "A keyword is 2 to 120 characters." };
  if (!clusterIdIn && !keyword) return { ok: false, message: "A new cluster needs its keyword." };
  if (!clusterIdIn && !ids.length) return { ok: false, message: "Pick the prompts that go in it." };

  const db = supabaseAdmin();
  const { data: client, error: cErr } = await db.from("client_domains").select("id, tier, source_scan_id").eq("id", clientId).single();
  if (cErr) return { ok: false, message: `Could not read the client: ${cErr.message}` };
  const { data: live, error: qErr } = await db
    .from("tracked_questions")
    .select("id, text, added_on")
    .eq("client_domain_id", clientId)
    .is("cluster_id", null)
    .is("stopped_on", null);
  if (qErr) return { ok: false, message: `Could not read the ungrouped prompts: ${qErr.message}` };
  const picked = (live ?? []).filter((q) => ids.includes(q.id as string));
  if (ids.length) {
    // Judged before anything is written, so a refused batch leaves no empty cluster behind.
    const early = refuseGrouping({ ids, ungrouped: new Set((live ?? []).map((q) => q.id as string)), clusterLive: 0 });
    if (early) return { ok: false, message: early };
  }

  // Angles from the source scan's kinds, by text.
  const angles = new Map<string, Angle | null>();
  if (client.source_scan_id && picked.length) {
    const { data: sq, error: sErr } = await db.from("scan_questions").select("question, kind").eq("scan_id", client.source_scan_id as string);
    if (sErr) return { ok: false, message: `Could not read the scan's kinds: ${sErr.message}` };
    const kinds = new Map((sq ?? []).map((q) => [String(q.question).trim().toLowerCase(), angleFor(q.kind)]));
    for (const q of picked) angles.set(q.id as string, kinds.get(String(q.text).trim().toLowerCase()) ?? null);
  }

  let clusterId = clusterIdIn;
  if (!clusterId) {
    // The cluster started when its oldest prompt did, so its history reads from day one.
    const startedOn = picked.map((q) => q.added_on as string).sort()[0] ?? dayAfter(trackingDay());
    const made = await insertCluster(db, clientId, { name: keyword, tier: client.tier as string, started_on: startedOn });
    if (!made.ok) return { ok: false, message: made.message };
    clusterId = made.ids[0]!;
  }

  if (keyword) {
    const { data: ks, error: kErr } = await db.from("tracked_keywords").select("id, keyword").eq("client_domain_id", clientId).is("stopped_on", null);
    if (kErr) return { ok: false, message: `Could not read the keywords: ${kErr.message}` };
    const same = (ks ?? []).find((k) => String(k.keyword).toLowerCase() === keyword.toLowerCase());
    const kw = same
      ? await linkKeyword(db, clientId, clusterId, same.id as string)
      : await insertKeyword(db, clientId, clusterId, { keyword, added_on: dayAfter(trackingDay()), added_by: "nomada" });
    if (!kw.ok) return { ok: false, message: kw.message };
    if (clusterIdIn) {
      const { error: nErr } = await db.from("tracked_clusters").update({ name: keyword }).eq("id", clusterId).eq("name", NEEDS_A_KEYWORD);
      if (nErr) return { ok: false, message: `Keyword linked, name not updated: ${nErr.message}` };
    }
  }

  if (ids.length) {
    const grouped = await groupPrompts(db, clientId, clusterId, ids, angles);
    if (!grouped.ok) return { ok: false, message: grouped.message };
  }
  revalidatePath("/admin/tracking");
  return { ok: true, message: `${clusterIdIn ? "Cluster updated" : `Cluster "${keyword}" made`}: ${ids.length} prompt(s) grouped${keyword ? `, keyword ${keyword}` : ""}.` };
}

/** Add or remove a dashboard member on an account. */
export async function setMember(_prev: AdminResult | null, form: FormData): Promise<AdminResult> {
  const refused = await refuseUnlessAdmin();
  if (refused) return refused;
  const accountId = text(form, "account");
  const email = text(form, "email").toLowerCase();
  const role = text(form, "role") || "editor";
  const remove = text(form, "remove") === "1";
  if (email.length > ADMIN_LIMITS.email || !isPlausibleEmail(email)) return { ok: false, message: "A valid email is needed." };
  const db = supabaseAdmin();
  if (remove) {
    const { error } = await db.from("dashboard_members").delete().eq("account_id", accountId).eq("email", email);
    if (error) return { ok: false, message: `Could not remove ${email}: ${error.message}` };
  } else {
    if (!["owner", "editor", "viewer"].includes(role)) return { ok: false, message: "Unknown role." };
    const { error } = await db
      .from("dashboard_members")
      .upsert({ account_id: accountId, email, role }, { onConflict: "account_id,email" });
    if (error) return { ok: false, message: `Could not add ${email}: ${error.message}` };
  }
  revalidatePath("/admin/tracking");
  return { ok: true, message: remove ? `${email} removed.` : `${email} is ${role}.` };
}

/** An account's upgrade prompts: nomada (default), agency (asks the agency, no tier names) or off. */
export async function setUpsell(_prev: AdminResult | null, form: FormData): Promise<AdminResult> {
  const refused = await refuseUnlessAdmin();
  if (refused) return refused;
  const accountId = text(form, "account");
  const setting = upsellSetting(text(form, "mode"), text(form, "contact"));
  if ("error" in setting) return { ok: false, message: setting.error };
  const db = supabaseAdmin();
  const { error } = await db.from("accounts").update({ upsell_mode: setting.mode, upsell_contact_email: setting.contact }).eq("id", accountId);
  if (error) return { ok: false, message: `Could not save the prompt mode: ${error.message}` };
  revalidatePath("/admin/tracking");
  return { ok: true, message: setting.mode === "agency" ? `Agency mode; asks go to ${setting.contact}.` : `Prompts: ${setting.mode}.` };
}

/**
 * "Run now" - the only manual spend. Opens today's run if there is none and
 * posts it down the same signed path the cron uses. A run already running or
 * finished today is left alone by the run route's claim.
 */
export async function runNow(_prev: AdminResult | null, form: FormData): Promise<AdminResult> {
  const refused = await refuseUnlessAdmin();
  if (refused) return refused;
  const clientId = text(form, "client");
  const db = supabaseAdmin();
  const day = trackingDay();

  const { data: client, error: cErr } = await db.from("client_domains").select("id, tier").eq("id", clientId).single();
  if (cErr) return { ok: false, message: `Could not read the client: ${cErr.message}` };
  const { data: qs, error: qErr } = await db
    .from("tracked_questions")
    .select("added_on, stopped_on")
    .eq("client_domain_id", clientId);
  if (qErr) return { ok: false, message: `Could not read the prompts: ${qErr.message}` };
  if (!(qs ?? []).some((q) => liveOn(q as { added_on: string; stopped_on: string | null }, day))) {
    return { ok: false, message: "No prompt is live today - new prompts start at the next daily check." };
  }

  const engines = [...enginesFor((client.tier as TierKey) ?? "tracked")];
  const { error: iErr } = await db
    .from("tracking_runs")
    .upsert({ client_domain_id: clientId, run_date: day, engines }, { onConflict: "client_domain_id,run_date", ignoreDuplicates: true });
  if (iErr) return { ok: false, message: `Could not open today's run: ${iErr.message}` };
  const { data: run, error: rErr } = await db
    .from("tracking_runs")
    .select("id, status")
    .eq("client_domain_id", clientId)
    .eq("run_date", day)
    .single();
  if (rErr) return { ok: false, message: `Could not read today's run: ${rErr.message}` };
  if (run.status !== "queued") return { ok: false, message: `Today's run is already ${run.status}.` };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  try {
    await dispatchTrackingRun(run.id as string, `${proto}://${host}`);
  } catch (err) {
    return { ok: false, message: `Dispatch failed: ${err instanceof Error ? err.message : String(err)}` };
  }
  revalidatePath("/admin/tracking");
  return { ok: true, message: "Run dispatched. Refresh in a few minutes." };
}
