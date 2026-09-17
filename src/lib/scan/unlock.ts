import "server-only";

import { after } from "next/server";

import { runGatedScan } from "@/lib/scan/pipeline";
import { getSettings } from "@/lib/scan/settings";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * What unlocking a scan actually does, in one place.
 *
 * It lives here rather than in the unlock route because two different requests
 * now perform it: the unlock itself when verification is off, and the verify
 * link when it is on. Having one copy is what stops the two paths drifting into
 * subtly different unlocks.
 */

export type UnlockableScan = {
  id: string;
  domain: string;
  brand_name: string | null;
  topic: string | null;
  market: string | null;
  gated_engines: string[] | null;
  gated_status: string | null;
};

export const SCAN_UNLOCK_COLUMNS =
  "id, public_token, domain, brand_name, topic, market, status, account_id, gated_engines, gated_status";

/** Finds or creates the account behind an address. */
export async function resolveAccount(email: string, existingId: string | null): Promise<string | null> {
  if (existingId) return existingId;
  const db = supabaseAdmin();

  const { data: existing } = await db.from("accounts").select("id").ilike("email", email).maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await db
    .from("accounts")
    .insert({ email, agency_domain: email.split("@")[1] })
    .select("id")
    .single();
  if (error || !created) return null;
  return created.id as string;
}

/**
 * Attaches the account, stamps the unlock, and starts the engines the email
 * bought. Idempotent on the gated pass: a second unlock of the same scan claims
 * nothing and re-spends nothing.
 */
export async function completeUnlock(
  scan: UnlockableScan,
  accountId: string | null,
): Promise<{ gatedStarted: boolean; gatedEngines: string[] }> {
  const db = supabaseAdmin();

  const { data: clientDomain } = await db
    .from("client_domains")
    .upsert(
      {
        account_id: accountId,
        domain: scan.domain,
        brand_name: scan.brand_name,
        topic: scan.topic,
        market: scan.market,
      },
      { onConflict: "account_id,domain,topic,market" },
    )
    .select("id")
    .single();

  await db
    .from("scans")
    .update({
      account_id: accountId,
      client_domain_id: clientDomain?.id ?? null,
      unlocked_at: new Date().toISOString(),
    })
    .eq("id", scan.id);

  let gatedStarted = false;
  const gatedEngines = ((scan.gated_engines ?? []) as string[]).filter(Boolean);

  if (gatedEngines.length && scan.gated_status === "none") {
    // The spend cap covers gated runs too, or a burst of unlocks outspends the
    // day's budget after the count cap has already been passed.
    const settings = await getSettings();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: spendRows } = await db.from("scans").select("dfs_cost").gte("created_at", since);
    const spentToday = (spendRows ?? []).reduce((a, r) => a + Number(r.dfs_cost ?? 0), 0);

    if (spentToday < settings.daily_cost_cap_usd) {
      const { error: claimErr } = await db
        .from("scans")
        .update({ gated_status: "queued" })
        .eq("id", scan.id)
        .eq("gated_status", "none");
      if (!claimErr) {
        gatedStarted = true;
        after(async () => {
          await runGatedScan(scan.id);
        });
      }
    }
  }

  return { gatedStarted, gatedEngines };
}

export type UnlockPayload = {
  brands: Array<{ brand: string; mentions: number; is_subject: boolean; engines: string[] }>;
  brands_by_engine: Array<{ engine: string; brand: string; mentions: number; is_subject: boolean }>;
  sources: Array<{
    source: string;
    mentions: number;
    engines: string[];
    ai_search_volume: number | null;
    urls: string[];
  }>;
  questions: Array<{
    idx: number;
    question: string;
    kind: string;
    search_volume: number | null;
    engines: Array<{ engine: string; answered: boolean; brand_named: boolean }>;
  }>;
};

/** Everything the gate was holding back, assembled once. */
export async function buildUnlockPayload(scanId: string): Promise<UnlockPayload> {
  const db = supabaseAdmin();

  const [{ data: brands }, { data: sources }, { data: questions }, { data: answers }] = await Promise.all([
    db.from("scan_brands").select("engine, brand, mentions, is_subject").eq("scan_id", scanId),
    db
      .from("scan_citations")
      .select("source_domain, url, title, question_id, engine, scan_questions(search_volume)")
      .eq("scan_id", scanId),
    db
      .from("scan_questions")
      .select("id, idx, question, kind, search_volume")
      .eq("scan_id", scanId)
      .order("idx", { ascending: true }),
    db.from("scan_answers").select("question_id, engine, answered, brand_named").eq("scan_id", scanId),
  ]);

  type BrandRow = { engine: string; brand: string; mentions: number; is_subject: boolean };
  const brandRows = (brands ?? []) as BrandRow[];
  const overall = new Map<string, { brand: string; mentions: number; is_subject: boolean; engines: string[] }>();
  for (const b of brandRows) {
    const row = overall.get(b.brand) ?? { brand: b.brand, mentions: 0, is_subject: b.is_subject, engines: [] };
    row.mentions += b.mentions;
    row.is_subject = row.is_subject || b.is_subject;
    if (!row.engines.includes(b.engine)) row.engines.push(b.engine);
    overall.set(b.brand, row);
  }
  const leaderboard = [...overall.values()].sort((a, b) => b.mentions - a.mentions);

  type SourceRow = {
    source: string;
    mentions: number;
    engines: string[];
    ai_search_volume: number | null;
    urls: string[];
  };
  const bySource = new Map<string, SourceRow>();
  const counted = new Set<string>();
  for (const c of sources ?? []) {
    const row: SourceRow = bySource.get(c.source_domain) ?? {
      source: c.source_domain,
      mentions: 0,
      engines: [],
      ai_search_volume: null,
      urls: [],
    };
    const key = `${c.source_domain}|${c.question_id}|${c.engine}`;
    if (!counted.has(key)) {
      counted.add(key);
      row.mentions += 1;
      const embedded = c.scan_questions as unknown;
      const q = Array.isArray(embedded) ? embedded[0] : embedded;
      const v = (q as { search_volume?: number | null } | null)?.search_volume;
      if (typeof v === "number") row.ai_search_volume = (row.ai_search_volume ?? 0) + v;
    }
    if (!row.engines.includes(c.engine)) row.engines.push(c.engine);
    if (c.url && !row.urls.includes(c.url)) row.urls.push(c.url);
    bySource.set(c.source_domain, row);
  }
  const fullSources = [...bySource.values()].sort(
    (a, b) => b.mentions - a.mentions || (b.ai_search_volume ?? 0) - (a.ai_search_volume ?? 0),
  );

  const answerRows = (answers ?? []) as Array<{
    question_id: string;
    engine: string;
    answered: boolean;
    brand_named: boolean;
  }>;
  const questionDetail = (questions ?? []).map((q) => ({
    idx: q.idx as number,
    question: q.question as string,
    kind: q.kind as string,
    search_volume: (q.search_volume ?? null) as number | null,
    engines: answerRows
      .filter((a) => a.question_id === q.id)
      .map((a) => ({ engine: a.engine, answered: a.answered, brand_named: a.brand_named })),
  }));

  return {
    brands: leaderboard,
    brands_by_engine: brandRows,
    sources: fullSources,
    questions: questionDetail,
  };
}
