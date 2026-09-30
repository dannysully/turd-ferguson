import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import Placements from "@/components/app/Placements";
import Sidebar from "@/components/app/Sidebar";
import type { TierKey } from "@/components/TierName";
import { enginesFor, trackingPackPrice } from "@/config/pricing";
import { T } from "@/config/tokens";
import { clusterChart } from "@/lib/tracking/cluster-figures";
import { type Day, addDays } from "@/lib/tracking/figures";
import { CLUSTER_BASE } from "@/lib/tracking/limits";
import { rangeFrom } from "@/lib/tracking/overview-data";
import { citeRows, pickCluster, placedTier, placementsView } from "@/lib/tracking/placement-figures";
import { trackingRepo } from "@/lib/tracking/repo";

export const dynamic = "force-dynamic";

/** Private - noindex here as well as in the layout, the header rule and robots.txt. */
export const metadata: Metadata = {
  title: "Placements - alwaystracked dashboard",
  robots: { index: false, follow: false },
};
export const runtime = "nodejs";

/** The longest "since it started" the screen reads in one go. */
const SINCE_MAX_DAYS = 364;

/**
 * One client's placements (T13, R97 part 3, 30 Sep 2026; BRIEF-2 T13 route
 * `/app/[client]/placements?cluster=&from=&to=`). Same membership rule as the
 * overview. Open to a client on mentioned or above, and to any client with a
 * placement logged (a row Nomada logged is the client's to see); anyone else
 * gets a 404. Without from/to the range is since the client started, as the
 * board's "Since it started".
 */
export default async function ClientPlacements({
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
  const asked = rangeFrom(sp, today).range;
  const started: Day = client.started_on && client.started_on > addDays(today, -SINCE_MAX_DAYS) ? client.started_on : addDays(today, -SINCE_MAX_DAYS);
  const range = typeof sp.from === "string" && typeof sp.to === "string" ? asked : { from: started > today ? today : started, to: today };
  const [data, rows, upgrade] = await Promise.all([repo.loadOverview(client.id, range, "none"), repo.placements(client.id), repo.upgradeContext(client.id, email, today)]);
  if (!placedTier(tier) && !rows.some((p) => p.status !== "removed")) notFound();

  const clusters = (data.clusters ?? []).filter((c) => c.stopped_on === null || c.stopped_on > range.from);
  const id = pickCluster(clusters, rows, typeof sp.cluster === "string" ? sp.cluster : null);
  const cluster = clusters.find((c) => c.id === id);
  if (!cluster) notFound();
  const input = { clusters, questions: data.questions, keywords: data.keywords, answers: data.answers, serp: data.serp, range, before: null, today, engines };
  const chart = clusterChart(input, cluster.id);
  if (!chart) notFound();
  const questionIds = data.questions.filter((q) => q.cluster_id === cluster.id && (q.stopped_on === null || q.stopped_on > range.from)).map((q) => q.id);
  const view = placementsView({ chart, questionIds, placements: rows.filter((p) => p.cluster_id === cluster.id), cites: citeRows(data.answers), engines });
  const keyword = data.keywords.find((k) => k.id === cluster.keyword_id)?.keyword ?? null;
  const keep: Record<string, string> = typeof sp.from === "string" && typeof sp.to === "string" ? { from: range.from, to: range.to } : {};
  const href = (c: string) => `/app/${slug}/placements?${new URLSearchParams({ cluster: c, ...keep })}`;

  return (
    <div className="app-shell" style={{ display: "flex", flexWrap: "wrap", minHeight: "100vh", color: T.ink }}>
      <Sidebar client={client} others={clients.filter((c) => c.slug !== slug)} email={email} role={client.role} tier={tier} engines={engines} clusters current="Placements" placements clusterLimit={client.cluster_limit ?? CLUSTER_BASE} packPrice={trackingPackPrice(client.market)} upsell={upgrade.mode === "nomada"} />
      <div className="app-main" style={{ flex: "1 1 480px", minWidth: 0, padding: "36px 40px 48px", background: T.bg }}>
        <Placements
          brand={client.brand ?? client.domain}
          engines={engines}
          range={range}
          clusters={clusters.map((c) => ({ id: c.id, name: c.name, href: href(c.id) }))}
          cluster={cluster}
          keyword={keyword}
          prompts={questionIds.length}
          view={view}
        />
      </div>
    </div>
  );
}
