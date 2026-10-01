import type { Metadata } from "next";

import { T } from "@/config/tokens";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { USAGE_EVENTS, weeklyUsage } from "@/lib/tracking/usage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Dashboard usage",
  robots: { index: false, follow: false },
};

/** Weeks shown, newest first. */
const WEEKS = 8;

/**
 * /admin/tracking/usage - BRIEF-2 T10 (R98, 30 Sep 2026). Behind the /admin
 * Basic auth. Weekly counts of each dashboard usage event per client, the
 * aggregate the UX pass reads; no raw row, member or path is shown here.
 */
export default async function UsageAdmin() {
  if (!supabaseConfigured()) return <div style={{ padding: "40px" }}>Database not configured.</div>;
  const db = supabaseAdmin();
  const since = new Date(Date.now() - WEEKS * 7 * 86_400_000).toISOString();
  const [{ data: clients, error: cErr }, { data: rows, error: eErr }] = await Promise.all([
    db.from("client_domains").select("id, domain").not("slug", "is", null).order("created_at", { ascending: true }),
    db.from("dashboard_events").select("client_domain_id, event, created_at").in("event", [...USAGE_EVENTS]).gte("created_at", since).limit(50_000),
  ]);
  if (cErr) throw new Error(`could not read tracked clients: ${cErr.message}`);
  if (eErr) throw new Error(`could not read dashboard events: ${eErr.message}`);

  const order = (clients ?? []).map((c) => c.id as string);
  const domain = new Map((clients ?? []).map((c) => [c.id as string, c.domain as string]));
  const weeks = weeklyUsage((rows ?? []) as { client_domain_id: string | null; event: string; created_at: string }[], order);
  const cell = { padding: "6px 8px", borderBottom: `1px solid ${T.hair}`, textAlign: "right", fontVariantNumeric: "tabular-nums" } as const;

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "32px 24px", color: T.ink, fontSize: "14px" }}>
      <p style={{ margin: "0 0 4px", fontSize: "13px" }}>
        <a href="/admin/tracking" style={{ color: T.soft }}>
          Tracking
        </a>
      </p>
      <h1 style={{ fontSize: "24px", margin: "0 0 4px" }}>Dashboard usage</h1>
      <p style={{ color: T.soft, margin: "0 0 24px" }}>
        Weekly counts per client, weeks from Monday (UTC), the last {WEEKS} weeks. Events carry ids only, never what a member typed.
      </p>
      {weeks.length === 0 ? (
        <p style={{ color: T.soft }}>No dashboard events recorded yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: "13px", minWidth: "100%" }}>
            <thead>
              <tr>
                <th style={{ ...cell, textAlign: "left" }}>Week</th>
                <th style={{ ...cell, textAlign: "left" }}>Client</th>
                {USAGE_EVENTS.map((e) => (
                  <th key={e} style={{ ...cell, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {e}
                  </th>
                ))}
                <th style={cell}>total</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={`${w.week}-${w.client}`}>
                  <td style={{ ...cell, textAlign: "left", whiteSpace: "nowrap" }}>{w.week}</td>
                  <td style={{ ...cell, textAlign: "left", whiteSpace: "nowrap" }}>{domain.get(w.client) ?? w.client}</td>
                  {USAGE_EVENTS.map((e) => (
                    <td key={e} style={{ ...cell, color: w.counts[e] ? T.ink : T.faint }}>
                      {w.counts[e] ?? 0}
                    </td>
                  ))}
                  <td style={{ ...cell, fontWeight: 700 }}>{w.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
