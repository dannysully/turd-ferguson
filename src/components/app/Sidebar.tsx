import EngineLogo from "@/components/EngineLogo";
import TierName, { type TierKey } from "@/components/TierName";
import { TRACKED_BASIS } from "@/config/pricing";
import { T } from "@/config/tokens";
import { ENGINE_SPECS, type Engine } from "@/lib/scan/engines";

/**
 * The dashboard sidebar (T3, 29 Sep 2026), from boards/Main.dc.html: lockup,
 * client switcher, nav, plan card, member. Shared by /app/[client] and the
 * parity fixture so the two cannot drift.
 */

const NAV = ["Overview", "Questions", "Google keywords", "Who is named", "Cited pages", "Reports", "Settings"];

type Client = { slug: string; domain: string; brand: string | null; market: string };

export default function Sidebar({
  client,
  others,
  email,
  role,
  tier,
  engines,
}: {
  client: Client;
  others: Client[];
  email: string;
  role: string;
  tier: TierKey;
  engines: readonly Engine[];
}) {
  return (
    <aside className="app-side" style={{ flex: "0 0 260px", borderRight: `1px solid ${T.line}`, padding: "24px 20px", display: "grid", gap: "20px", alignContent: "start", background: T.surface }}>
      <div style={{ fontSize: "18px", fontWeight: 700 }}>
        <TierName tier="tracked" />
      </div>

      <div>
        <div style={{ fontWeight: 600 }}>{client.brand ?? client.domain}</div>
        <div style={{ fontSize: "13px", color: T.soft }}>
          {client.domain}, {client.market === "UK" ? "United Kingdom" : "United States"}
        </div>
        {others.length ? (
          <nav aria-label="Switch client" style={{ marginTop: "8px", display: "grid", gap: "4px" }}>
            {others.map((c) => (
              <a key={c.slug} href={`/app/${c.slug}`} style={{ fontSize: "13px", color: T.accent }}>
                {c.brand ?? c.domain}
              </a>
            ))}
          </nav>
        ) : null}
      </div>

      <nav aria-label="Dashboard" style={{ display: "grid", gap: "2px" }}>
        {NAV.map((item, i) => (
          <span
            key={item}
            aria-current={i === 0 ? "page" : undefined}
            style={{ padding: "8px 10px", borderRadius: "8px", fontSize: "14px", background: i === 0 ? T.wash : "transparent", color: i === 0 ? T.accent : T.ink, fontWeight: i === 0 ? 600 : 400 }}
          >
            {item}
          </span>
        ))}
      </nav>

      <div style={{ border: `1px solid ${T.line}`, borderRadius: "12px", padding: "14px" }}>
        <div style={{ fontSize: "12px", color: T.soft, marginBottom: "4px" }}>Your plan</div>
        <div style={{ fontWeight: 700, marginBottom: "6px" }}>
          <TierName tier={tier} />
        </div>
        <p style={{ margin: "0 0 8px", fontSize: "13px", color: T.soft }}>{TRACKED_BASIS}.</p>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {engines.map((e) => (
            <EngineLogo key={e} engine={e} size={18} title={ENGINE_SPECS[e].label} />
          ))}
        </div>
      </div>

      <div style={{ fontSize: "13px" }}>
        <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{email}</div>
        <div style={{ color: T.soft }}>{role}</div>
        <form method="post" action="/api/app/logout" style={{ marginTop: "8px" }}>
          <button type="submit" style={{ background: "none", border: "none", padding: 0, color: T.accent, fontSize: "13px", cursor: "pointer" }}>
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
