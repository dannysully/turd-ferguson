import type { Metadata } from "next";

import { scanReadiness } from "@/lib/scan/readiness";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Scan operations",
  robots: { index: false, follow: false },
};

const C = {
  navy: "#0B1220",
  body: "#4B5563",
  muted: "#9CA3AF",
  border: "#E5E7EB",
  soft: "#F8F7FF",
  purple: "#7C3AED",
  red: "#B91C1C",
  green: "#047857",
};

type ScanRow = {
  public_token: string;
  domain: string;
  topic: string | null;
  market: string | null;
  status: string;
  step: string | null;
  error: string | null;
  engines: string[] | null;
  engines_answered: string[] | null;
  gated_status: string | null;
  dfs_calls: number;
  dfs_cost: number | string | null;
  anthropic_calls: number;
  unlocked_at: string | null;
  created_at: string;
  completed_at: string | null;
};

function money(n: number): string {
  return `$${n.toFixed(4)}`;
}

function when(iso: string | null): string {
  if (!iso) return "-";
  return iso.replace("T", " ").slice(0, 16);
}

function seconds(row: ScanRow): string {
  if (!row.completed_at) return "-";
  const ms = new Date(row.completed_at).getTime() - new Date(row.created_at).getTime();
  return `${Math.round(ms / 1000)}s`;
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ background: C.soft, border: `1px solid ${C.border}`, borderRadius: 16, padding: "1.125rem 1.25rem" }}>
      <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.002em", color: C.muted }}>
        {label}
      </p>
      <p style={{ margin: "0.375rem 0 0", fontSize: "1.5rem", fontWeight: 700, color: tone ?? C.navy, letterSpacing: "-0.02em" }}>
        {value}
      </p>
    </div>
  );
}

function Readiness() {
  const { ready, missingRequired, missingRecommended } = scanReadiness();
  if (ready && missingRecommended.length === 0) return null;

  const rows = [
    ...missingRequired.map((r) => ({ ...r, blocking: true })),
    ...missingRecommended.map((r) => ({ ...r, blocking: false })),
  ];

  return (
    <div
      style={{
        marginTop: "1.25rem",
        padding: "1rem 1.25rem",
        background: missingRequired.length ? "rgba(245,158,11,0.10)" : C.soft,
        border: `1px solid ${missingRequired.length ? "rgba(245,158,11,0.35)" : C.border}`,
        borderRadius: 14,
      }}
    >
      <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700, color: C.navy }}>
        {missingRequired.length
          ? "The live checker is switched off until these are set"
          : "Running live. These are still worth setting"}
      </p>
      {missingRequired.length > 0 && (
        <p style={{ margin: "0.375rem 0 0", fontSize: "0.8125rem", color: C.body, lineHeight: 1.6 }}>
          Visitors see the request form instead, which captures the domain and an address and reports
          nothing. Nothing is fabricated while these are missing.
        </p>
      )}
      <ul style={{ margin: "0.75rem 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        {rows.map((r) => (
          <li key={r.key} style={{ fontSize: "0.8125rem", color: C.body }}>
            <code style={{ fontWeight: 700, color: r.blocking ? "#92400E" : C.navy }}>{r.key}</code>
            <span style={{ color: C.muted }}> &mdash; {r.why}</span>
            {!r.blocking && <span style={{ color: C.muted }}> (optional)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function AdminScansPage() {
  if (!supabaseConfigured()) {
    return (
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", color: C.navy }}>Scan operations</h1>
        <p style={{ color: C.body }}>
          The database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then reload.
        </p>
        <Readiness />
      </main>
    );
  }

  const db = supabaseAdmin();
  // This page is force-dynamic and its whole job is "the last 24 hours", so
  // reading the clock here is deliberate rather than an accidental impurity.
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: today }, { data: recent }, { data: settings }] = await Promise.all([
    db.from("scans").select("status, dfs_calls, dfs_cost, anthropic_calls, unlocked_at").gte("created_at", since),
    db
      .from("scans")
      .select(
        "public_token, domain, topic, market, status, step, error, engines, engines_answered, gated_status, dfs_calls, dfs_cost, anthropic_calls, unlocked_at, created_at, completed_at",
      )
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("app_settings").select("key, value"),
  ]);

  const rows = (today ?? []) as Array<Pick<ScanRow, "status" | "dfs_calls" | "dfs_cost" | "anthropic_calls" | "unlocked_at">>;
  const scans = (recent ?? []) as ScanRow[];

  const total = rows.length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const unlocked = rows.filter((r) => r.unlocked_at).length;
  const dfsCalls = rows.reduce((a, r) => a + (r.dfs_calls ?? 0), 0);
  const anthropicCalls = rows.reduce((a, r) => a + (r.anthropic_calls ?? 0), 0);
  const dfsCost = rows.reduce((a, r) => a + Number(r.dfs_cost ?? 0), 0);

  const setting = (key: string) => (settings ?? []).find((s) => s.key === key)?.value;
  const enabled = setting("scans_enabled") !== false;
  const cap = Number(setting("daily_scan_cap") ?? 200);
  const costCap = Number(setting("daily_cost_cap_usd") ?? 60);
  const freeEngines = (setting("scan_engines_free") as string[] | undefined) ?? [];
  const gatedEngines = (setting("scan_engines_gated") as string[] | undefined) ?? [];

  const th: React.CSSProperties = {
    textAlign: "left",
    padding: "0.5rem 0.625rem",
    fontSize: "0.75rem",
    letterSpacing: "0.002em",
    color: C.muted,
    borderBottom: `1px solid ${C.border}`,
    whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "0.5rem 0.625rem",
    fontSize: "0.8125rem",
    color: C.body,
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: "top",
  };

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.navy, letterSpacing: "-0.03em", margin: 0 }}>
        Scan operations
      </h1>
      <p style={{ color: C.body, marginTop: "0.375rem" }}>
        Last 24 hours. Cost is what DataForSEO reported per task, so it reconciles against their dashboard.
      </p>
      <p style={{ color: C.muted, marginTop: "0.375rem", fontSize: "0.875rem" }}>
        Free scan reads {freeEngines.join(", ") || "nothing"}. An email additionally runs{" "}
        {gatedEngines.join(", ") || "nothing"} over the same questions.
      </p>

      <Readiness />

      {!enabled && (
        <p
          style={{
            marginTop: "1.25rem",
            padding: "0.75rem 1rem",
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.35)",
            borderRadius: 12,
            color: "#92400E",
            fontSize: "0.875rem",
          }}
        >
          Scans are switched off. New scans are refused until scans_enabled is set back to true in app_settings.
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "0.75rem",
          marginTop: "1.5rem",
        }}
      >
        <Tile label="Scans today" value={`${total} / ${cap}`} />
        <Tile label="Spend today" value={`${money(dfsCost)} / $${costCap}`} tone={dfsCost > costCap * 0.8 ? C.red : undefined} />
        <Tile label="Unlocked" value={String(unlocked)} tone={C.purple} />
        <Tile label="Failed" value={String(failed)} tone={failed ? C.red : C.green} />
        <Tile label="DataForSEO calls" value={String(dfsCalls)} />
        <Tile label="DataForSEO cost" value={money(dfsCost)} />
        <Tile label="Model calls" value={String(anthropicCalls)} />
        <Tile label="Cost per scan" value={total ? money(dfsCost / total) : "-"} />
      </div>

      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: C.navy, marginTop: "2.5rem", marginBottom: "0.75rem" }}>
        Last 50 runs
      </h2>
      <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr>
              <th style={th}>Started</th>
              <th style={th}>Domain</th>
              <th style={th}>Topic</th>
              <th style={th}>Market</th>
              <th style={th}>Engines</th>
              <th style={th}>Status</th>
              <th style={th}>Took</th>
              <th style={th}>DFS</th>
              <th style={th}>Cost</th>
              <th style={th}>Model</th>
              <th style={th}>Email</th>
            </tr>
          </thead>
          <tbody>
            {scans.length === 0 && (
              <tr>
                <td style={td} colSpan={11}>
                  No scans yet.
                </td>
              </tr>
            )}
            {scans.map((r) => (
              <tr key={r.public_token}>
                <td style={td}>{when(r.created_at)}</td>
                <td style={{ ...td, color: C.navy, fontWeight: 600 }}>{r.domain}</td>
                <td style={td}>{r.topic ?? "-"}</td>
                <td style={td}>
                  {(r.engines_answered ?? []).length}/{(r.engines ?? []).length}
                  {r.gated_status && r.gated_status !== "none" ? (
                    <span style={{ display: "block", color: C.muted, fontSize: "0.75rem" }}>
                      gated {r.gated_status}
                    </span>
                  ) : null}
                </td>
                <td style={{ ...td, color: r.status === "failed" ? C.red : r.status === "complete" ? C.green : C.body }}>
                  {r.status}
                  {r.step ? ` · ${r.step}` : ""}
                  {r.error ? (
                    <span style={{ display: "block", color: C.muted, fontSize: "0.75rem" }}>{r.error}</span>
                  ) : null}
                </td>
                <td style={td}>{seconds(r)}</td>
                <td style={td}>{r.dfs_calls}</td>
                <td style={td}>{money(Number(r.dfs_cost ?? 0))}</td>
                <td style={td}>{r.anthropic_calls}</td>
                <td style={td}>{r.unlocked_at ? "yes" : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
