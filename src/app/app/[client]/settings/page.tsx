import type { Metadata } from "next";
import { loginHref } from "@/lib/tracking/next-path";
import { notFound, redirect } from "next/navigation";

import Settings from "@/components/app/Settings";
import Sidebar from "@/components/app/Sidebar";
import type { TierKey } from "@/components/TierName";
import { enginesFor, trackingPackPrice } from "@/config/pricing";
import { T } from "@/config/tokens";
import { CLUSTER_BASE } from "@/lib/tracking/limits";
import { rangeFrom } from "@/lib/tracking/overview-data";
import { placedTier } from "@/lib/tracking/placement-figures";
import { trackingRepo } from "@/lib/tracking/repo";
import { askToast } from "@/lib/tracking/ask";
import { teamToast } from "@/lib/tracking/team";

export const dynamic = "force-dynamic";

/** Private - noindex here as well as in the layout, the header rule and robots.txt. */
export const metadata: Metadata = {
  title: "Settings - alwaystracked dashboard",
  robots: { index: false, follow: false },
};
export const runtime = "nodejs";

/**
 * One client's Settings (R142, BRIEF-4 P2: `/app/[client]/settings`). Same
 * membership rule as the overview: a slug the session is not a live member
 * of is a 404.
 */
export default async function ClientSettings({ params, searchParams }: { params: Promise<{ client: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const repo = trackingRepo();
  const email = await repo.sessionEmail();
  if (!email) redirect(loginHref(`/app/${(await params).client}/settings`, await searchParams));
  const { client: slug } = await params;
  const clients = await repo.clientsFor(email);
  const client = clients.find((c) => c.slug === slug);
  if (!client) notFound();
  const tier = (client.tier as TierKey) ?? "tracked";
  const engines = enginesFor(tier);
  const today = repo.today();
  const { range, compare } = rangeFrom({}, today);
  const [data, upgrade, settings] = await Promise.all([repo.loadOverview(client.id, range, compare), repo.upgradeContext(client.id, email, today), repo.settings(client.id)]);
  const clusterLimit = client.cluster_limit ?? CLUSTER_BASE;
  // A stopped cluster frees its slot at once, as the Clusters page counts it.
  const inUse = (data.clusters ?? []).filter((c) => c.stopped_on === null).length;

  return (
    <div className="app-shell" style={{ display: "flex", flexWrap: "wrap", minHeight: "100vh", color: T.ink }}>
      <Sidebar client={client} others={clients.filter((c) => c.slug !== slug)} email={email} role={client.role} tier={tier} engines={engines} clusters current="Settings" placements={placedTier(tier)} clusterLimit={clusterLimit} packPrice={trackingPackPrice(client.market)} upsell={upgrade.mode === "nomada"} />
      <div id="app-content" tabIndex={-1} className="app-main" style={{ flex: "1 1 480px", minWidth: 0, padding: "36px 40px 48px", background: T.bg }}>
        <Settings
          domain={client.domain}
          brand={client.brand}
          market={client.market}
          tier={tier}
          clusterLimit={clusterLimit}
          clustersInUse={inUse}
          startedOn={client.started_on}
          aliases={settings.aliases}
          members={settings.members}
          email={email}
          mode={upgrade.mode}
          slug={slug}
          owner={client.role === "owner"}
          toast={
            sp.ask === "sent"
              ? askToast(sp.via === "agency" ? "your account contact" : "nomada digital", email)
              : sp.ask === "refused"
                ? "That ask did not send. Try again later."
                : teamToast(sp.team, sp.who, settings.members.find((m) => m.email === sp.who)?.role ?? null)
          }
        />
      </div>
    </div>
  );
}
