import type { Metadata } from "next";

import { T } from "@/config/tokens";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { ADMIN_LIMITS, UPSELL_MODES, liveOn, trackingDay } from "@/lib/tracking/decide";

import { ActionForm } from "./ActionForm";
import { addTracked, createClientFromScan, runNow, setMember, setUpsell } from "./actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Tracking operations",
  robots: { index: false, follow: false },
};

/**
 * /admin/tracking - T2 of docs/tracked-dashboard-2026-09-29/BRIEF.md (Danny,
 * 29 Sep 2026). Behind the /admin Basic auth. Until Stripe exists, this is
 * how an alwaystracked client is made: from a finished scan, then Nomada adds
 * questions and keywords up to the limit, and the members who can log in.
 *
 * Lists only clients set up here (a slug is set by the create action), so the
 * rows client_domains held before tracking are never shown or tracked.
 */

const input = {
  padding: "6px 8px",
  border: `1px solid ${T.line}`,
  borderRadius: "6px",
  fontSize: "13px",
  color: T.ink,
  background: T.surface,
} as const;

const money = (n: number) => `$${n.toFixed(2)}`;

type Row = Record<string, unknown>;

export default async function TrackingAdmin() {
  if (!supabaseConfigured()) return <main style={{ padding: "40px" }}>Database not configured.</main>;
  const db = supabaseAdmin();
  const today = trackingDay();
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);

  const { data: clients, error: cErr } = await db
    .from("client_domains")
    .select("id, account_id, domain, market, tier, status, started_on, question_limit, keyword_limit, slug")
    .not("slug", "is", null)
    .order("created_at", { ascending: true });
  if (cErr) throw new Error(`could not read tracked clients: ${cErr.message}`);
  const ids = (clients ?? []).map((c) => c.id as string);
  const accounts = [...new Set((clients ?? []).map((c) => c.account_id as string))];

  const [
    { data: questions, error: qErr },
    { data: keywords, error: kErr },
    { data: runs, error: rErr },
    { data: members, error: mErr },
    { data: accountRows, error: acErr },
  ] = await Promise.all([
    db.from("tracked_questions").select("client_domain_id, text, source, added_on, stopped_on").in("client_domain_id", ids),
    db.from("tracked_keywords").select("client_domain_id, keyword, added_on, stopped_on").in("client_domain_id", ids),
    db
      .from("tracking_runs")
      .select("client_domain_id, run_date, status, dfs_cost, model_calls, error, finished_at")
      .in("client_domain_id", ids)
      .gte("run_date", since)
      .order("run_date", { ascending: false }),
    db.from("dashboard_members").select("account_id, email, role").in("account_id", accounts),
    db.from("accounts").select("id, upsell_mode, upsell_contact_email").in("id", accounts),
  ]);
  if (qErr) throw new Error(`could not read tracked questions: ${qErr.message}`);
  if (kErr) throw new Error(`could not read tracked keywords: ${kErr.message}`);
  if (rErr) throw new Error(`could not read tracking runs: ${rErr.message}`);
  if (mErr) throw new Error(`could not read dashboard members: ${mErr.message}`);
  if (acErr) throw new Error(`could not read accounts: ${acErr.message}`);

  const of = (rows: Row[] | null, id: string, key = "client_domain_id") => (rows ?? []).filter((r) => r[key] === id);

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px", color: T.ink, fontSize: "14px" }}>
      <h1 style={{ fontSize: "24px", margin: "0 0 4px" }}>Tracking</h1>
      <p style={{ color: T.soft, margin: "0 0 24px" }}>
        Daily check at 05:00 UTC. Today (London): {today}. Clients are made here from a finished scan.
      </p>

      <section style={{ border: `1px solid ${T.line}`, borderRadius: "10px", padding: "16px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "16px", margin: "0 0 8px" }}>Create a client from a scan</h2>
        <ActionForm action={createClientFromScan} submit="Create client">
          <input name="scan" maxLength={ADMIN_LIMITS.scan} placeholder="Scan URL or token" style={{ ...input, width: "320px" }} aria-label="Scan URL or token" />
          <input name="email" maxLength={ADMIN_LIMITS.email} placeholder="Owner email" style={{ ...input, width: "220px" }} aria-label="Owner email" />
          <select name="tier" defaultValue="tracked" style={input} aria-label="Tier">
            <option value="tracked">alwaystracked</option>
            <option value="mentioned">alwaysmentioned</option>
            <option value="cited">alwayscited</option>
            <option value="everywhere">alwayseverywhere</option>
          </select>
        </ActionForm>
      </section>

      {(clients ?? []).length === 0 ? <p style={{ color: T.soft }}>No tracked clients yet.</p> : null}

      {(clients ?? []).map((c) => {
        const id = c.id as string;
        const qs = of(questions, id);
        const ks = of(keywords, id);
        const liveQ = qs.filter((q) => q.stopped_on === null);
        const liveK = ks.filter((k) => k.stopped_on === null);
        const checkedToday = qs.filter((q) => liveOn(q as { added_on: string; stopped_on: string | null }, today)).length;
        const rs = of(runs, id);
        const todayRun = rs.find((r) => r.run_date === today);
        const cost14 = rs.reduce((n, r) => n + Number(r.dfs_cost ?? 0), 0);
        const ms = of(members, c.account_id as string, "account_id");
        const account = (accountRows ?? []).find((a) => a.id === c.account_id);
        return (
          <section key={id} style={{ border: `1px solid ${T.line}`, borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "16px", margin: "0 0 4px" }}>
              {c.domain as string} <span style={{ color: T.soft, fontWeight: 400 }}>/{c.slug as string} - {c.market as string} - {c.tier as string} - {c.status as string} - started {String(c.started_on ?? "-")}</span>
            </h2>
            <p style={{ margin: "0 0 8px", color: T.soft }}>
              Questions {liveQ.length}/{c.question_limit as number} ({checkedToday} live today) - keywords {liveK.length}/{c.keyword_limit as number} - today&apos;s run:{" "}
              {todayRun ? `${todayRun.status} ${money(Number(todayRun.dfs_cost ?? 0))}${todayRun.error ? ` (${todayRun.error})` : ""}` : "none"} - 14 days {money(cost14)}
            </p>
            <ActionForm action={runNow} submit="Run now">
              <input type="hidden" name="client" value={id} maxLength={ADMIN_LIMITS.id} />
              <span style={{ fontSize: "12.5px", color: T.soft }}>The only manual spend.</span>
            </ActionForm>
            <ActionForm action={addTracked} submit="Add question">
              <input type="hidden" name="client" value={id} maxLength={ADMIN_LIMITS.id} />
              <input type="hidden" name="kind" value="question" maxLength={ADMIN_LIMITS.id} />
              <input name="value" maxLength={ADMIN_LIMITS.question} placeholder="A buyer question" style={{ ...input, width: "480px" }} aria-label="Question" />
            </ActionForm>
            <ActionForm action={addTracked} submit="Add keyword">
              <input type="hidden" name="client" value={id} maxLength={ADMIN_LIMITS.id} />
              <input type="hidden" name="kind" value="keyword" maxLength={ADMIN_LIMITS.id} />
              <input name="value" maxLength={ADMIN_LIMITS.keyword} placeholder="A Google keyword" style={{ ...input, width: "280px" }} aria-label="Keyword" />
            </ActionForm>
            <details style={{ margin: "8px 0" }}>
              <summary>Questions and keywords</summary>
              <ol style={{ margin: "6px 0", paddingLeft: "20px" }}>
                {liveQ.map((q, i) => (
                  <li key={i}>
                    {q.text as string} <span style={{ color: T.soft }}>({q.source as string}, from {q.added_on as string})</span>
                  </li>
                ))}
              </ol>
              <p style={{ margin: "4px 0" }}>{liveK.map((k) => k.keyword as string).join(", ") || "No keywords yet."}</p>
            </details>
            <div>
              <strong style={{ fontSize: "13px" }}>Members</strong>{" "}
              {ms.map((m) => `${m.email as string} (${m.role as string})`).join(", ") || "none"}
              <ActionForm action={setMember} submit="Save member">
                <input type="hidden" name="account" value={c.account_id as string} maxLength={ADMIN_LIMITS.id} />
                <input name="email" maxLength={ADMIN_LIMITS.email} placeholder="Email" style={{ ...input, width: "220px" }} aria-label="Member email" />
                <select name="role" defaultValue="editor" style={input} aria-label="Role">
                  <option value="owner">owner</option>
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
                <label style={{ fontSize: "13px" }}>
                  <input type="checkbox" name="remove" value="1" maxLength={ADMIN_LIMITS.id} /> remove
                </label>
              </ActionForm>
            </div>
            <div style={{ marginTop: "8px" }}>
              <strong style={{ fontSize: "13px" }}>Upgrade prompts</strong>{" "}
              {String(account?.upsell_mode ?? "nomada")}
              {account?.upsell_contact_email ? ` - asks go to ${account.upsell_contact_email as string}` : ""}
              <ActionForm action={setUpsell} submit="Save prompts">
                <input type="hidden" name="account" value={c.account_id as string} maxLength={ADMIN_LIMITS.id} />
                <select name="mode" defaultValue={String(account?.upsell_mode ?? "nomada")} style={input} aria-label="Upgrade prompt mode">
                  {UPSELL_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m === "nomada" ? "nomada - brand sold direct" : m === "agency" ? "agency - ask the agency, no tier names" : "off - no prompts"}
                    </option>
                  ))}
                </select>
                <input name="contact" maxLength={ADMIN_LIMITS.email} defaultValue={(account?.upsell_contact_email as string | null) ?? ""} placeholder="Agency contact email" style={{ ...input, width: "220px" }} aria-label="Agency contact email" />
              </ActionForm>
            </div>
            {rs.length ? (
              <p style={{ margin: "8px 0 0", fontSize: "12.5px", color: T.soft }}>
                Last 14 days: {rs.map((r) => `${r.run_date as string} ${r.status as string} ${money(Number(r.dfs_cost ?? 0))}`).join(" - ")}
              </p>
            ) : null}
          </section>
        );
      })}
    </main>
  );
}
