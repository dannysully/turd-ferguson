"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { type TierKey } from "@/components/TierName";
import { TRACKED_KEYWORDS, TRACKED_QUESTIONS, enginesFor } from "@/config/pricing";
import { constantTimeEqual, decodeBasicAuth } from "@/lib/constant-time";
import { isPlausibleEmail } from "@/lib/email-address";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ADMIN_LIMITS, dayAfter, liveOn, slugFor, trackingDay, underLimit, upsellSetting } from "@/lib/tracking/decide";
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
 * what happened. Limits are enforced here, never only in the form.
 */

export type AdminResult = { ok: boolean; message: string };

/** Every tier starts at the plan basis in pricing.ts; the +$49 pack raises a client row by hand. */
const TIERS = ["tracked", "mentioned", "cited", "everywhere"];
const LIMITS = { questions: TRACKED_QUESTIONS, keywords: TRACKED_KEYWORDS };

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
    .select("id, domain, brand_name, topic, market, status")
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
  const limits = LIMITS;
  const fields = {
    account_id: accountId,
    domain: scan.domain as string,
    brand_name: scan.brand_name as string | null,
    topic: scan.topic as string | null,
    market: scan.market as string,
    slug: slugFor(scan.domain as string),
    status: "active",
    tier,
    question_limit: limits.questions,
    keyword_limit: limits.keywords,
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
  if (eErr) return { ok: false, message: `Could not read the client's questions: ${eErr.message}` };
  const have = new Set((existing ?? []).map((q) => String(q.text).toLowerCase()));

  const { data: sq, error: qErr } = await db
    .from("scan_questions")
    .select("idx, question")
    .eq("scan_id", scan.id)
    .order("idx", { ascending: true });
  if (qErr) return { ok: false, message: `Could not read the scan's questions: ${qErr.message}` };
  const rows = (sq ?? [])
    .map((q) => String(q.question).trim())
    .filter((q) => q.length >= 8 && q.length <= 300 && !have.has(q.toLowerCase()))
    .slice(0, Math.max(0, limits.questions - have.size))
    .map((q) => ({ client_domain_id: client.id, text: q, source: "scan", added_on: startedOn, added_by: "nomada" }));
  if (rows.length) {
    const { error } = await db.from("tracked_questions").insert(rows);
    if (error) return { ok: false, message: `Could not copy the questions: ${error.message}` };
  }

  const { error: memErr } = await db
    .from("dashboard_members")
    .upsert({ account_id: accountId, email, role: "owner" }, { onConflict: "account_id,email", ignoreDuplicates: true });
  if (memErr) return { ok: false, message: `Client made, but the owner could not be added: ${memErr.message}` };

  revalidatePath("/admin/tracking");
  return { ok: true, message: `${scan.domain} set up: ${rows.length} scan question(s), first check ${startedOn}.` };
}

/** Add a Nomada question or a keyword, up to the client's limit. */
export async function addTracked(_prev: AdminResult | null, form: FormData): Promise<AdminResult> {
  const refused = await refuseUnlessAdmin();
  if (refused) return refused;
  const clientId = text(form, "client");
  const kind = text(form, "kind");
  const value = text(form, "value");
  if (kind !== "question" && kind !== "keyword") return { ok: false, message: "Unknown kind." };
  if (kind === "question" && (value.length < 8 || value.length > 300)) return { ok: false, message: "A question is 8 to 300 characters." };
  if (kind === "keyword" && (value.length < 2 || value.length > 120)) return { ok: false, message: "A keyword is 2 to 120 characters." };

  const db = supabaseAdmin();
  const { data: client, error: cErr } = await db
    .from("client_domains")
    .select("id, question_limit, keyword_limit")
    .eq("id", clientId)
    .single();
  if (cErr) return { ok: false, message: `Could not read the client: ${cErr.message}` };

  const table = kind === "question" ? "tracked_questions" : "tracked_keywords";
  const column = kind === "question" ? "text" : "keyword";
  const { data: live, error: lErr } = await db
    .from(table)
    .select(`${column}, added_on, stopped_on`)
    .eq("client_domain_id", clientId)
    .is("stopped_on", null);
  if (lErr) return { ok: false, message: `Could not read the current list: ${lErr.message}` };
  const rows = (live ?? []) as unknown as Record<string, string | null>[];
  const limit = kind === "question" ? (client.question_limit as number) : (client.keyword_limit as number);
  if (!underLimit(rows.length, limit)) return { ok: false, message: `At the limit of ${limit} ${kind}s.` };
  if (rows.some((r) => String(r[column]).toLowerCase() === value.toLowerCase())) {
    return { ok: false, message: `That ${kind} is already tracked.` };
  }

  const addedOn = dayAfter(trackingDay());
  const { error } = await db.from(table).insert({
    client_domain_id: clientId,
    [column]: value,
    ...(kind === "question" ? { source: "nomada" } : {}),
    added_on: addedOn,
    added_by: "nomada",
  });
  if (error) return { ok: false, message: `Could not add it: ${error.message}` };
  revalidatePath("/admin/tracking");
  return { ok: true, message: `Added; first check ${addedOn}.` };
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
  if (qErr) return { ok: false, message: `Could not read the questions: ${qErr.message}` };
  if (!(qs ?? []).some((q) => liveOn(q as { added_on: string; stopped_on: string | null }, day))) {
    return { ok: false, message: "No question is live today - new questions start at the next daily check." };
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
