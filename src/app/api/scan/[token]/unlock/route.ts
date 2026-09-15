import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

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
    .select("id, domain, brand_name, topic, market, status, account_id")
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

  // 5. The full payload, which has not been sent before this point.
  const [{ data: brands }, { data: sources }, { data: questions }] = await Promise.all([
    db
      .from("scan_brands")
      .select("brand, mentions, is_subject")
      .eq("scan_id", scan.id)
      .order("mentions", { ascending: false }),
    db
      .from("scan_citations")
      .select("source_domain, url, title, question_id, scan_questions(search_volume)")
      .eq("scan_id", scan.id),
    db
      .from("scan_questions")
      .select("idx, question, kind, search_volume, aio_shown, brand_named")
      .eq("scan_id", scan.id)
      .order("idx", { ascending: true }),
  ]);

  // Fold citations into one row per source: distinct questions, summed volume.
  type SourceRow = {
    source: string;
    mentions: number;
    ai_search_volume: number | null;
    urls: string[];
    questions: Set<string>;
  };
  const bySource = new Map<string, SourceRow>();
  for (const c of sources ?? []) {
    const row: SourceRow = bySource.get(c.source_domain) ?? {
      source: c.source_domain,
      mentions: 0,
      ai_search_volume: null,
      urls: [],
      questions: new Set<string>(),
    };
    if (!row.questions.has(c.question_id)) {
      row.questions.add(c.question_id);
      row.mentions += 1;
      // An embedded to-one select arrives as an array in some client versions.
      const embedded = c.scan_questions as unknown;
      const q = Array.isArray(embedded) ? embedded[0] : embedded;
      const v = (q as { search_volume?: number | null } | null)?.search_volume;
      if (typeof v === "number") row.ai_search_volume = (row.ai_search_volume ?? 0) + v;
    }
    if (c.url && !row.urls.includes(c.url)) row.urls.push(c.url);
    bySource.set(c.source_domain, row);
  }

  const fullSources = [...bySource.values()]
    // The question set was only needed to count distinct questions per source.
    .map((r) => ({ source: r.source, mentions: r.mentions, ai_search_volume: r.ai_search_volume, urls: r.urls }))
    .sort((a, b) => b.mentions - a.mentions || (b.ai_search_volume ?? 0) - (a.ai_search_volume ?? 0));

  return Response.json(
    {
      unlocked: true,
      brands: brands ?? [],
      sources: fullSources,
      questions: questions ?? [],
    },
    { headers: { "cache-control": "no-store" } },
  );
}
