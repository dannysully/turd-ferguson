import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import EngineLogo from "@/components/EngineLogo";
import TierName, { type TierKey } from "@/components/TierName";
import { TRACKED_BASIS, enginesFor } from "@/config/pricing";
import { T } from "@/config/tokens";
import { ENGINE_SPECS } from "@/lib/scan/engines";
import { clientsFor, sessionEmail } from "@/lib/tracking/member";

export const dynamic = "force-dynamic";

/** Private - noindex here as well as in the layout, the header rule and robots.txt. */
export const metadata: Metadata = {
  title: "alwaystracked dashboard",
  robots: { index: false, follow: false },
};
export const runtime = "nodejs";

/**
 * One client's dashboard shell (T3, 29 Sep 2026): the sidebar from
 * boards/Main.dc.html - lockup, client switcher, nav, plan card, member - and
 * the overview's place, which T4 fills.
 *
 * A slug the session's email is not a member of is a 404, not a 403, so
 * client slugs are not discoverable.
 */

const NAV = ["Overview", "Questions", "Google keywords", "Who is named", "Cited pages", "Reports", "Settings"];

export default async function ClientDashboard({ params }: { params: Promise<{ client: string }> }) {
  const email = await sessionEmail();
  if (!email) redirect("/app/login");
  const { client: slug } = await params;
  const clients = await clientsFor(email);
  const client = clients.find((c) => c.slug === slug);
  if (!client) notFound();
  const tier = (client.tier as TierKey) ?? "tracked";
  const engines = enginesFor(tier);

  return (
    <div className="app-shell" style={{ display: "flex", flexWrap: "wrap", minHeight: "70vh", color: T.ink }}>
      <aside style={{ flex: "0 0 260px", borderRight: `1px solid ${T.line}`, padding: "24px 20px", display: "grid", gap: "20px", alignContent: "start" }}>
        <div style={{ fontSize: "18px", fontWeight: 700 }}>
          <TierName tier="tracked" />
        </div>

        <div>
          <div style={{ fontWeight: 600 }}>{client.brand ?? client.domain}</div>
          <div style={{ fontSize: "13px", color: T.soft }}>
            {client.domain}, {client.market === "UK" ? "United Kingdom" : "United States"}
          </div>
          {clients.length > 1 ? (
            <nav aria-label="Switch client" style={{ marginTop: "8px", display: "grid", gap: "4px" }}>
              {clients
                .filter((c) => c.slug !== slug)
                .map((c) => (
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
          <div style={{ color: T.soft }}>{client.role}</div>
          <form method="post" action="/api/app/logout" style={{ marginTop: "8px" }}>
            <button type="submit" style={{ background: "none", border: "none", padding: 0, color: T.accent, fontSize: "13px", cursor: "pointer" }}>
              Log out
            </button>
          </form>
        </div>
      </aside>

      <section style={{ flex: "1 1 480px", padding: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 8px" }}>Overview</h1>
        <p style={{ color: T.soft, margin: 0 }}>
          {client.started_on
            ? `Tracking began ${client.started_on}. The overview fills in from the first daily check.`
            : "Your first check runs tomorrow at 06:00."}
        </p>
      </section>
    </div>
  );
}
