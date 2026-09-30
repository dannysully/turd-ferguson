import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import Overview from "@/components/app/Overview";
import Sidebar from "@/components/app/Sidebar";
import type { TierKey } from "@/components/TierName";
import { enginesFor, trackingPackPrice } from "@/config/pricing";
import { T } from "@/config/tokens";
import { CLUSTER_BASE } from "@/lib/tracking/limits";
import { rangeFrom } from "@/lib/tracking/overview-data";
import { trackingRepo } from "@/lib/tracking/repo";

export const dynamic = "force-dynamic";

/** Private - noindex here as well as in the layout, the header rule and robots.txt. */
export const metadata: Metadata = {
  title: "alwaystracked dashboard",
  robots: { index: false, follow: false },
};
export const runtime = "nodejs";

/**
 * One client's dashboard: the sidebar (T3, 29 Sep 2026) and the overview
 * (T4), for the range the URL states - `?from=&to=&compare=`, BRIEF
 * decision 3.
 *
 * A slug the session's email is not a member of is a 404, not a 403, so
 * client slugs are not discoverable.
 */
export default async function ClientDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ client: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const repo = trackingRepo();
  const email = await repo.sessionEmail();
  if (!email) redirect("/app/login");
  const { client: slug } = await params;
  const clients = await repo.clientsFor(email);
  const client = clients.find((c) => c.slug === slug);
  if (!client) notFound();
  const tier = (client.tier as TierKey) ?? "tracked";
  const engines = enginesFor(tier);
  const today = repo.today();
  const sp = await searchParams;
  const { range, compare } = rangeFrom(sp, today);
  const [data, upgrade] = await Promise.all([repo.loadOverview(client.id, range, compare), repo.upgradeContext(client.id, email, today)]);

  return (
    <div className="app-shell" style={{ display: "flex", flexWrap: "wrap", minHeight: "100vh", color: T.ink }}>
      <Sidebar client={client} others={clients.filter((c) => c.slug !== slug)} email={email} role={client.role} tier={tier} engines={engines} clusters={(data.clusters?.length ?? 0) > 0} clusterLimit={client.cluster_limit ?? CLUSTER_BASE} packPrice={trackingPackPrice(client.market)} upsell={upgrade.mode === "nomada"} />
      <div className="app-main" style={{ flex: "1 1 480px", minWidth: 0, padding: "36px 40px 48px", background: T.bg }}>
        <Overview
          brand={client.brand ?? client.domain}
          domain={client.domain}
          market={client.market}
          engines={engines}
          startedOn={client.started_on}
          today={today}
          range={range}
          compareMode={compare}
          data={data}
          selected={typeof sp.cluster === "string" ? sp.cluster : undefined}
          clustersPath={`/app/${slug}/clusters`}
          clusterLimit={client.cluster_limit ?? CLUSTER_BASE}
        />
      </div>
    </div>
  );
}
