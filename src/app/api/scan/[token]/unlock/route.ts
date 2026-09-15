import { after } from "next/server";

import { runGatedScan } from "@/lib/scan/pipeline";
import { getSettings } from "@/lib/scan/settings";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The response goes out as soon as the free result is assembled; the gated
// engines then run in after(), so this covers that second pass too.
export const maxDuration = 300;

/** Throwaway-inbox domains. Kept short and obvious rather than exhaustive. */
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "temp-mail.org", "throwawaymail.com", "yopmail.com", "sharklasers.com",
  "getnada.com", "trashmail.com", "fakeinbox.com", "maildrop.cc",
  "dispostable.com", "mintemail.com", "spamgourmet.com", "mailnesia.com",
]);

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  let body: { email?: string; marketing_ok?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) {
    return Response.json(
      { error: "bad_email", message: "That email does not look right." },
      { status: 400 },
    );
  }
  if (DISPOSABLE.has(email.split("@")[1] ?? "")) {
    return Response.json(
      { error: "disposable_email", message: "Please use your work email address." },
      { status: 400 },
    );
  }

  const db = supabaseAdmin();

  const { data: scan } = await db
    .from("scans")
    .select("id, domain, brand_name, topic, market, status, account_id, gated_engines, gated_status")
    .eq("public_token", token)
    .maybeSingle();

  if (!scan) return Response.json({ error: "not_found" }, { status: 404 });
  if (scan.status !== "complete") {
    return Response.json({ error: "not_ready", status: scan.status }, { status: 409 });
  }

  // 2. Find or create the account, then make it real with a magic link.
  let accountId = scan.account_id as string | null;
  if (!accountId) {
    const { data: existing } = await db
      .from("accounts")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existing) {
      accountId = existing.id;
    } else {
      const { data: created, error: aErr } = await db
        .from("accounts")
        .insert({ email, agency_domain: email.split("@")[1] })
        .select("id")
        .single();
      if (aErr || !created) {
        return Response.json({ error: "account_failed" }, { status: 500 });
      }
      accountId = created.id;
    }
  }

  await db.from("leads").insert({
    email,
    scan_id: scan.id,
    account_id: accountId,
    marketing_ok: body.marketing_ok === true,
  });

  // 3. The scan becomes the account's first client domain.
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

  // 4. Attach and stamp.
  await db
    .from("scans")
    .update({
      account_id: accountId,
      client_domain_id: clientDomain?.id ?? null,
      unlocked_at: new Date().toISOString(),
    })
    .eq("id", scan.id);

  // The magic link establishes the session for the return visit. It is sent,
  // not waited on: making someone leave the page to see what they were just
  // promised loses them.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://alwayscited.com";
  void db.auth.admin
    .inviteUserByEmail(email, { redirectTo: `${siteUrl}/scan/${token}` })
    .catch(() => {
      // Already-registered users error here; that is fine and not worth failing on.
    });

  // 4b. Start the engines the email just bought. This runs once per scan: a
  // second unlock of the same scan must not re-spend on Perplexity and Claude.
  let gatedStarted = false;
  const gatedEngines = ((scan.gated_engines ?? []) as string[]).filter(Boolean);
  if (gatedEngines.length && scan.gated_status === "none") {
    // The spend cap covers gated runs as well, or a burst of unlocks could
    // outspend the day's budget after the count cap has already been passed.
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

  // 5. The full payload, which has not been sent before this point.
  const [{ data: brands }, { data: sources }, { data: questions }, { data: answers }] = await Promise.all([
    db.from("scan_brands").select("engine, brand, mentions, is_subject").eq("scan_id", scan.id),
    db
      .from("scan_citations")
      .select("source_domain, url, title, question_id, engine, scan_questions(search_volume)")
      .eq("scan_id", scan.id),
    db
      .from("scan_questions")
      .select("id, idx, question, kind, search_volume")
      .eq("scan_id", scan.id)
      .order("idx", { ascending: true }),
    db.from("scan_answers").select("question_id, engine, answered, brand_named").eq("scan_id", scan.id),
  ]);

  // Leaderboard: per engine, and summed across engines for the overall view.
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

  // Sources: one row per source, counting distinct (question, engine) pairs, so
  // a source cited twice inside one answer is not counted twice.
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
      // An embedded to-one select arrives as an array in some client versions.
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

  // Per question, what each engine did. "did not answer" and "answered without
  // naming them" stay separate states all the way to the screen.
  const answerRows = (answers ?? []) as Array<{
    question_id: string;
    engine: string;
    answered: boolean;
    brand_named: boolean;
  }>;
  const questionDetail = (questions ?? []).map((q) => ({
    idx: q.idx,
    question: q.question,
    kind: q.kind,
    search_volume: q.search_volume,
    engines: answerRows
      .filter((a) => a.question_id === q.id)
      .map((a) => ({ engine: a.engine, answered: a.answered, brand_named: a.brand_named })),
  }));

  return Response.json(
    {
      unlocked: true,
      // Which engines are still to come, so the screen can say so rather than
      // showing a silent gap where Perplexity and Claude will appear.
      gated_engines: gatedEngines,
      gated_status: gatedStarted ? "queued" : (scan.gated_status ?? "none"),
      brands: leaderboard,
      brands_by_engine: brandRows,
      sources: fullSources,
      questions: questionDetail,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
