import BrandMark from "@/components/BrandMark";
import EngineLogo from "@/components/EngineLogo";
import TierName, { type TierKey } from "@/components/TierName";
import { TRACKED_BASIS } from "@/config/pricing";
import { T } from "@/config/tokens";
import { ENGINE_SPECS, type Engine } from "@/lib/scan/engines";

/**
 * The dashboard sidebar (T3, 29 Sep 2026), from boards/Main.dc.html: lockup,
 * client switcher, nav, plan card, member. Shared by /app/[client] and the
 * parity fixture so the two cannot drift.
 *
 * R104 (29 Sep 2026): the sidebar is the full height of the viewport and
 * pinned, with the plan card and member at its foot as the board draws them.
 * Below 860px it gives way to Mobile.dc.html's shell - a top bar with the
 * lockup and the client, and four tabs along the bottom. All three are in the
 * server HTML and swapped by CSS, so the phone shell stands with JS off.
 */

const NAV = ["Overview", "Clusters", "Google keywords", "Who is named", "Cited pages", "Reports", "Settings"];
const TABS = ["Overview", "Clusters", "Keywords", "Reports"];

type Client = { slug: string; domain: string; brand: string | null; market: string };

function Lockup({ size }: { size: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: `${size}px`, fontWeight: 700, letterSpacing: "-0.02em" }}>
      <BrandMark id="app-side" size={15} />
      <TierName tier="tracked" />
    </div>
  );
}

function Initial({ name, size }: { name: string; size: number }) {
  return (
    <span aria-hidden="true" style={{ width: `${size}px`, height: `${size}px`, borderRadius: `${Math.round(size / 3.5)}px`, background: T.ink, color: T.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: `${Math.round(size * 0.45)}px`, fontWeight: 700, flexShrink: 0 }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

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
  const name = client.brand ?? client.domain;
  return (
    <>
      <header className="app-topbar" style={{ alignItems: "center", justifyContent: "space-between", height: "60px", padding: "0 16px", background: T.surface, borderBottom: `1px solid ${T.line}`, flex: "1 1 100%", boxSizing: "border-box" }}>
        <Lockup size={16} />
        <span style={{ display: "flex", alignItems: "center", gap: "8px", height: "40px", padding: "0 10px", border: `1px solid ${T.line}`, borderRadius: "10px", fontSize: "14px", fontWeight: 700, maxWidth: "60%", minWidth: 0 }}>
          <Initial name={name} size={22} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
        </span>
      </header>

      <aside className="app-side" style={{ flex: "0 0 248px", position: "sticky", top: 0, height: "100vh", overflowY: "auto", boxSizing: "border-box", borderRight: `1px solid ${T.line}`, padding: "24px 16px", display: "flex", flexDirection: "column", gap: "24px", background: T.surface }}>
        <div style={{ padding: "4px 8px" }}>
          <Lockup size={17} />
        </div>

        <div style={{ border: `1px solid ${T.line}`, borderRadius: "12px", padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Initial name={name} size={32} />
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{ fontSize: "14px", fontWeight: 700 }}>{name}</span>
              <span style={{ fontSize: "12px", color: T.soft }}>
                {client.domain}, {client.market === "UK" ? "United Kingdom" : "United States"}
              </span>
            </span>
          </div>
          {others.length ? (
            <nav aria-label="Switch client" style={{ marginTop: "10px", display: "grid", gap: "4px" }}>
              {others.map((c) => (
                <a key={c.slug} href={`/app/${c.slug}`} style={{ fontSize: "13px", color: T.accent }}>
                  {c.brand ?? c.domain}
                </a>
              ))}
            </nav>
          ) : null}
        </div>

        <nav aria-label="Dashboard" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {NAV.map((item, i) => (
            <span
              key={item}
              aria-current={i === 0 ? "page" : undefined}
              style={{ display: "flex", alignItems: "center", height: "40px", padding: "0 12px", borderRadius: "10px", fontSize: "14px", background: i === 0 ? T.wash : "transparent", color: i === 0 ? T.accent : T.ink, fontWeight: i === 0 ? 600 : 500 }}
            >
              {item}
            </span>
          ))}
        </nav>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "12px", padding: "16px", borderRadius: "14px", background: T.chip }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: T.soft }}>Your plan</div>
          <div style={{ fontSize: "15px", fontWeight: 700 }}>
            <TierName tier={tier} />
          </div>
          <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: T.soft }}>{TRACKED_BASIS}.</p>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {engines.map((e) => (
              <EngineLogo key={e} engine={e} size={18} title={ENGINE_SPECS[e].label} />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 8px", fontSize: "13px" }}>
          <span aria-hidden="true" style={{ width: "30px", height: "30px", borderRadius: "50%", background: T.wash, color: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>
            {email.charAt(0).toUpperCase()}
          </span>
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{email}</span>
            <span style={{ color: T.soft }}>
              {role}
              {" · "}
              <form method="post" action="/api/app/logout" style={{ display: "inline" }}>
                <button type="submit" style={{ background: "none", border: "none", padding: 0, color: T.accent, fontSize: "13px", cursor: "pointer" }}>
                  Log out
                </button>
              </form>
            </span>
          </span>
        </div>
      </aside>

      <nav aria-label="Dashboard sections" className="app-tabs" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 20, background: T.surface, borderTop: `1px solid ${T.line}`, paddingBottom: "8px" }}>
        {TABS.map((item, i) => (
          <span
            key={item}
            aria-current={i === 0 ? "page" : undefined}
            style={{ flex: "1 1 0", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0 6px", color: i === 0 ? T.accent : T.soft, fontSize: "11px", fontWeight: 600 }}
          >
            {item}
          </span>
        ))}
      </nav>
    </>
  );
}
