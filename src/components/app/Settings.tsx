import TierName, { type TierKey } from "@/components/TierName";
import { T } from "@/config/tokens";
import type { UpsellMode } from "@/lib/tracking/ask";
import { formatDay } from "@/lib/tracking/figures";
import { KEYWORDS_PER_CLUSTER, PROMPTS_PER_CLUSTER } from "@/lib/tracking/limits";
import type { Member } from "@/lib/tracking/settings-data";

/**
 * Settings (R142 part 1, 1 Oct 2026; BRIEF-4 P2). No board: the Clusters
 * page's shell - title block, bordered sections at 18px, hairlines. Account
 * and Team are read-only for everyone in this part; inviting, roles and
 * removal (part 2) and Billing (part 3) follow. Everything here is server
 * drawn, so it all works with JS off.
 */

const SECTION = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: "18px", overflow: "hidden" } as const;
const HEAD = { margin: 0, padding: "18px 24px", fontSize: "16px", fontWeight: 700, color: T.ink } as const;
// Each row carries the rule above it, so the head needs none of its own.
const ROW = { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px 24px", flexWrap: "wrap", padding: "14px 24px", borderTop: `1px solid ${T.line}`, fontSize: "14px" } as const;

/** A London calendar day from a timestamp, as the rest of /app writes days. */
const dayOf = (iso: string) => formatDay(new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/London" }), true);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={ROW}>
      <span style={{ color: T.soft }}>{label}</span>
      <span style={{ color: T.ink, fontWeight: 600, textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{children}</span>
    </div>
  );
}

export default function Settings({
  domain,
  brand,
  market,
  tier,
  clusterLimit,
  clustersInUse,
  startedOn,
  aliases,
  members,
  email,
  mode,
}: {
  domain: string;
  brand: string | null;
  market: string;
  tier: TierKey;
  clusterLimit: number;
  clustersInUse: number;
  startedOn: string | null;
  aliases: string[];
  members: Member[];
  /** The signed-in member, for "You". */
  email: string;
  mode: UpsellMode;
}) {
  const names = [brand?.trim() || domain, ...aliases.filter((a) => a !== brand)];
  return (
    <div className="app-col" style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0, maxWidth: "880px" }}>
      <header style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>Settings</h1>
        <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.5, color: T.soft }}>Your plan, the names we match and who can see this dashboard.</p>
      </header>

      <section aria-labelledby="set-account" style={SECTION}>
        <h2 id="set-account" style={HEAD}>Account</h2>
        <Row label="Client domain">{domain}</Row>
        <Row label="Market">{market === "UK" ? "UK" : "US"}</Row>
        <Row label="Plan">
          {/* agency mode names no nomada tier (BRIEF-4 rules). */}
          {mode === "agency" ? null : (
            <>
              <TierName tier={tier} />
              {", "}
            </>
          )}
          {`${clusterLimit} clusters: ${clusterLimit * PROMPTS_PER_CLUSTER} prompts and ${clusterLimit * KEYWORDS_PER_CLUSTER} Google keywords, checked daily`}
        </Row>
        <Row label="Clusters in use">{`${clustersInUse} of ${clusterLimit}`}</Row>
        <Row label="Tracking since">{startedOn ? formatDay(startedOn, true) : "Not started yet"}</Row>
        <Row label="Next check">Tomorrow at 06:00</Row>
        <div style={{ ...ROW, flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
          <span style={{ color: T.soft }}>Names we match</span>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {names.map((n) => (
              <li key={n} style={{ padding: "4px 12px", borderRadius: "999px", background: T.chip, border: `1px solid ${T.line}`, fontSize: "13px", fontWeight: 600, color: T.ink }}>
                {n}
              </li>
            ))}
          </ul>
          <span style={{ fontSize: "13px", color: T.soft }}>We count an answer as naming you when it uses one of these.</span>
        </div>
      </section>

      <section aria-labelledby="set-team" style={SECTION}>
        <h2 id="set-team" style={HEAD}>Team</h2>
        {members.length === 0 ? (
          <p style={{ margin: 0, padding: "18px 24px", fontSize: "14px", color: T.soft }}>No members to show.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {members.map((m) => (
              <li key={m.email} className="set-member" style={{ ...ROW, alignItems: "center", flexWrap: "nowrap" }}>
                <span style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: "1 1 auto" }}>
                  <span style={{ fontWeight: 600, color: T.ink, overflowWrap: "anywhere" }}>
                    {m.name ?? m.email}
                    {m.email === email ? <span style={{ marginLeft: "8px", padding: "1px 8px", borderRadius: "999px", background: T.wash, border: `1px solid ${T.washLine}`, fontSize: "11px", fontWeight: 700 }}>You</span> : null}
                  </span>
                  {m.name ? <span style={{ fontSize: "13px", color: T.soft, overflowWrap: "anywhere" }}>{m.email}</span> : null}
                </span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", fontSize: "13px", flexShrink: 0, textAlign: "right" }}>
                  <span style={{ fontWeight: 600, color: T.ink }}>{cap(m.role)}</span>
                  <span style={{ color: T.soft }}>{m.last_login_at ? `Last signed in ${dayOf(m.last_login_at)}` : "Not signed in yet"}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="set-out" style={SECTION}>
        <h2 id="set-out" style={HEAD}>Sign out</h2>
        <div style={ROW}>
          <span style={{ color: T.soft }}>Signed in as {email}</span>
          <form method="post" action="/api/app/logout" style={{ margin: 0 }}>
            <button type="submit" style={{ height: "40px", padding: "0 14px", border: `1px solid ${T.line}`, borderRadius: "10px", background: T.surface, color: T.ink, fontFamily: "inherit", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              Sign out
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
