import type { Metadata } from "next";

import { T } from "@/config/tokens";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { ADMIN_LIMITS, UPSELL_MODES, liveOn, trackingDay } from "@/lib/tracking/decide";
import { PROMPTS_PER_CLUSTER } from "@/lib/tracking/limits";

import { ActionForm } from "./ActionForm";
import { addTracked, createClientFromScan, groupCluster, runNow, setMember, setUpsell } from "./actions";

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
    // question_limit and keyword_limit are no longer read: the allowance is cluster_limit (BRIEF-3 C2, limits.ts).
    .select("id, account_id, domain, market, tier, status, started_on, cluster_limit, slug")
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
    { data: clusters, error: clErr },
  ] = await Promise.all([
    db.from("tracked_questions").select("id, client_domain_id, cluster_id, angle, text, source, added_on, stopped_on").in("client_domain_id", ids),
    db.from("tracked_keywords").select("id, client_domain_id, keyword, added_on, stopped_on").in("client_domain_id", ids),
    db
      .from("tracking_runs")
      .select("client_domain_id, run_date, status, dfs_cost, model_calls, error, finished_at")
      .in("client_domain_id", ids)
      .gte("run_date", since)
      .order("run_date", { ascending: false }),
    db.from("dashboard_members").select("account_id, email, role").in("account_id", accounts),
    db.from("accounts").select("id, upsell_mode, upsell_contact_email").in("id", accounts),
    db
      .from("tracked_clusters")
      .select("id, client_domain_id, name, keyword_id, tier, started_on, stopped_on")
      .in("client_domain_id", ids)
      .is("stopped_on", null)
      .order("created_at", { ascending: true }),
  ]);
  if (qErr) throw new Error(`could not read tracked questions: ${qErr.message}`);
  if (kErr) throw new Error(`could not read tracked keywords: ${kErr.message}`);
  if (rErr) throw new Error(`could not read tracking runs: ${rErr.message}`);
  if (mErr) throw new Error(`could not read dashboard members: ${mErr.message}`);
  if (acErr) throw new Error(`could not read accounts: ${acErr.message}`);
  if (clErr) throw new Error(`could not read clusters: ${clErr.message}`);

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
              Clusters allowed {c.cluster_limit as number} - prompts {liveQ.length}/{(c.cluster_limit as number) * PROMPTS_PER_CLUSTER} ({checkedToday} live today) - keywords {liveK.length}/{c.cluster_limit as number} - today&apos;s run:{" "}
              {todayRun ? `${todayRun.status} ${money(Number(todayRun.dfs_cost ?? 0))}${todayRun.error ? ` (${todayRun.error})` : ""}` : "none"} - 14 days {money(cost14)}
            </p>
            <ActionForm action={runNow} submit="Run now">
              <input type="hidden" name="client" value={id} maxLength={ADMIN_LIMITS.id} />
              <span style={{ fontSize: "12.5px", color: T.soft }}>The only manual spend.</span>
            </ActionForm>
            <ActionForm action={addTracked} submit="Add prompt">
              <input type="hidden" name="client" value={id} maxLength={ADMIN_LIMITS.id} />
              <input type="hidden" name="kind" value="question" maxLength={ADMIN_LIMITS.id} />
              <input name="value" maxLength={ADMIN_LIMITS.question} placeholder="A buyer prompt, ungrouped" style={{ ...input, width: "480px" }} aria-label="Prompt" />
            </ActionForm>
            <ActionForm action={addTracked} submit="Add keyword">
              <input type="hidden" name="client" value={id} maxLength={ADMIN_LIMITS.id} />
              <input type="hidden" name="kind" value="keyword" maxLength={ADMIN_LIMITS.id} />
              <input name="value" maxLength={ADMIN_LIMITS.keyword} placeholder="A Google keyword" style={{ ...input, width: "280px" }} aria-label="Keyword" />
            </ActionForm>
            <ClusterAdmin
              client={id}
              clusters={of(clusters, id)}
              prompts={liveQ}
              keywords={liveK}
            />
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

const angleShort = (a: unknown) => (a ? ` [${String(a)}]` : "");

/**
 * The cluster list and "Ungrouped" - BRIEF-3 C3 (Danny, 29 Sep 2026). A
 * cluster is one keyword and up to 5 prompts; ungrouped prompts and keywords
 * are still read daily and shown here only (R111). Grouping moves the rows,
 * so readings already taken stay with them.
 */
function ClusterAdmin({ client, clusters, prompts, keywords }: { client: string; clusters: Row[]; prompts: Row[]; keywords: Row[] }) {
  const linked = new Set(clusters.map((c) => c.keyword_id as string | null).filter(Boolean));
  const ungroupedQ = prompts.filter((q) => q.cluster_id === null);
  const ungroupedK = keywords.filter((k) => !linked.has(k.id as string));
  const pick = (
    <div style={{ display: "grid", gap: "2px", width: "100%" }}>
      {ungroupedQ.map((q) => (
        <label key={q.id as string} style={{ fontSize: "13px" }}>
          <input type="checkbox" name="prompt" value={q.id as string} maxLength={ADMIN_LIMITS.id} /> {q.text as string}
          <span style={{ color: T.soft }}>
            {" "}
            ({q.source as string}, from {q.added_on as string}){angleShort(q.angle)}
          </span>
        </label>
      ))}
    </div>
  );
  return (
    <details style={{ margin: "8px 0" }} open={ungroupedQ.length > 0}>
      <summary>
        Clusters {clusters.length} - prompts {prompts.length} ({ungroupedQ.length} ungrouped) - keywords {keywords.length} ({ungroupedK.length} ungrouped)
      </summary>
      {clusters.map((c) => {
        const qs = prompts.filter((q) => q.cluster_id === c.id);
        const kw = keywords.find((k) => k.id === c.keyword_id);
        return (
          <div key={c.id as string} style={{ borderLeft: `3px solid ${T.line}`, padding: "4px 0 4px 10px", margin: "8px 0" }}>
            <strong>{c.name as string}</strong>{" "}
            <span style={{ color: T.soft }}>
              - keyword {kw ? `${kw.keyword as string} (from ${kw.added_on as string})` : "none"} -{qs.length}/{PROMPTS_PER_CLUSTER} prompts - from {c.started_on as string}
            </span>
            <ol style={{ margin: "4px 0", paddingLeft: "20px" }}>
              {qs.map((q) => (
                <li key={q.id as string}>
                  {q.text as string} <span style={{ color: T.soft }}>({q.source as string}, from {q.added_on as string}){angleShort(q.angle)}</span>
                </li>
              ))}
            </ol>
            {(!kw || qs.length < PROMPTS_PER_CLUSTER) && (ungroupedQ.length > 0 || !kw) ? (
              <ActionForm action={groupCluster} submit="Add to this cluster">
                <input type="hidden" name="client" value={client} maxLength={ADMIN_LIMITS.id} />
                <input type="hidden" name="cluster" value={c.id as string} maxLength={ADMIN_LIMITS.id} />
                {!kw ? <input name="keyword" maxLength={ADMIN_LIMITS.keyword} placeholder="Its Google keyword" style={{ ...input, width: "280px" }} aria-label="Cluster keyword" /> : null}
                {qs.length < PROMPTS_PER_CLUSTER ? pick : null}
              </ActionForm>
            ) : null}
          </div>
        );
      })}
      <div style={{ margin: "8px 0" }}>
        <strong style={{ fontSize: "13px" }}>Ungrouped</strong>{" "}
        <span style={{ color: T.soft, fontSize: "13px" }}>
          Still read daily; admin only.{ungroupedK.length ? ` Keywords: ${ungroupedK.map((k) => `${k.keyword as string} (from ${k.added_on as string})`).join(", ")}.` : ""}
        </span>
        {ungroupedQ.length ? (
          <ActionForm action={groupCluster} submit="New cluster">
            <input type="hidden" name="client" value={client} maxLength={ADMIN_LIMITS.id} />
            <input name="keyword" maxLength={ADMIN_LIMITS.keyword} placeholder="Its Google keyword" style={{ ...input, width: "280px" }} aria-label="New cluster keyword" />
            <span style={{ fontSize: "12.5px", color: T.soft }}>Pick up to {PROMPTS_PER_CLUSTER}; the rest stay ungrouped and running.</span>
            {pick}
          </ActionForm>
        ) : (
          <p style={{ margin: "4px 0", color: T.soft, fontSize: "13px" }}>No ungrouped prompts.</p>
        )}
      </div>
    </details>
  );
}
