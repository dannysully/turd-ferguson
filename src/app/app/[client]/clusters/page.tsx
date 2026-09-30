import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import Clusters, { type StopToast } from "@/components/app/Clusters";
import Sidebar from "@/components/app/Sidebar";
import type { TierKey } from "@/components/TierName";
import { enginesFor } from "@/config/pricing";
import { T } from "@/config/tokens";
import { clusterSearch } from "@/lib/tracking/cluster-figures";
import { CLUSTER_BASE } from "@/lib/tracking/limits";
import { rangeFrom } from "@/lib/tracking/overview-data";
import { trackingRepo } from "@/lib/tracking/repo";
import { refuseRole } from "@/lib/tracking/stop";

export const dynamic = "force-dynamic";

/** Private - noindex here as well as in the layout, the header rule and robots.txt. */
export const metadata: Metadata = {
  title: "Clusters - alwaystracked dashboard",
  robots: { index: false, follow: false },
};
export const runtime = "nodejs";

/**
 * One client's Clusters page (BRIEF-3 T6, route 8: `/app/[client]/clusters`),
 * for the range the URL states. Same membership rule as the overview: a slug
 * the session is not a member of is a 404.
 */
export default async function ClientClusters({
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
  const data = await repo.loadOverview(client.id, range, compare);
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const f = one("filter");
  const done = one("done");
  const kind = one("kind");
  const id = one("id");
  const toast: StopToast | null =
    (done === "stopped" || done === "undone" || done === "refused") && (kind === "prompt" || kind === "cluster") && id ? { done, kind, id } : null;

  return (
    <div className="app-shell" style={{ display: "flex", flexWrap: "wrap", minHeight: "100vh", color: T.ink }}>
      <Sidebar client={client} others={clients.filter((c) => c.slug !== slug)} email={email} role={client.role} tier={tier} engines={engines} clusters current="Clusters" />
      <div className="app-main" style={{ flex: "1 1 480px", minWidth: 0, padding: "36px 40px 48px", background: T.bg }}>
        <Clusters
          brand={client.brand ?? client.domain}
          engines={engines}
          today={today}
          range={range}
          compareMode={compare}
          data={data}
          clusterLimit={client.cluster_limit ?? CLUSTER_BASE}
          open={one("open")}
          filter={f === "named" || f === "never" ? f : "all"}
          q={clusterSearch(one("q"))}
          slug={slug}
          canWrite={refuseRole(client.role) === null}
          toast={toast}
        />
      </div>
    </div>
  );
}
