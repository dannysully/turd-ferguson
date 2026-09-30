import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import Clusters, { type StopToast } from "@/components/app/Clusters";
import Sidebar from "@/components/app/Sidebar";
import type { TierKey } from "@/components/TierName";
import { enginesFor, trackingPackPrice } from "@/config/pricing";
import { T } from "@/config/tokens";
import { MARKETS, isMarket } from "@/lib/scan/domain";
import { keywordForm } from "@/lib/scan/dataforseo-request";
import { verdictFromQuery } from "@/lib/tracking/add-cluster";
import { ASK_ITEMS_MAX, askToast } from "@/lib/tracking/ask";
import { clusterSearch } from "@/lib/tracking/cluster-figures";
import { CLUSTER_BASE } from "@/lib/tracking/limits";
import { rangeFrom } from "@/lib/tracking/overview-data";
import { placedTier } from "@/lib/tracking/placement-figures";
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
  const [data, upgrade] = await Promise.all([repo.loadOverview(client.id, range, compare), repo.upgradeContext(client.id, email, today)]);
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const f = one("filter");
  const done = one("done");
  const kind = one("kind");
  const id = one("id");
  const toast: StopToast | null =
    (done === "stopped" || done === "undone" || done === "added" || done === "saved" || done === "refused") && (kind === "prompt" || kind === "cluster") && id ? { done, kind, id } : null;

  // Add a cluster (part 3b): `?add=1` opens the panel; the check's 303 adds `kw` and `ck`.
  const kw = (one("kw") ?? "").slice(0, 200);
  const market = MARKETS[isMarket(client.market) ? client.market : "US"].label;
  const adding = one("add") === "1" ? { kw, check: verdictFromQuery(one, keywordForm(kw), `the ${market}`), sig: (one("sig") ?? "").slice(0, 64) } : null;
  // T11 /ask: the 303 carries a few words (who, and for "Ask about these" the count and noun); the line is built here.
  const ask = one("ask");
  const n = Number(one("n"));
  const of = one("of");
  const attached = Number.isInteger(n) && n > 0 && n <= ASK_ITEMS_MAX && (of === "prompts" || of === "keywords") ? `${n} ${n === 1 ? of.slice(0, -1) : of}` : undefined;
  const packPrice = trackingPackPrice(client.market);
  const asked = ask === "sent" ? askToast(one("to") === "agency" ? "your account contact" : "nomada digital", email, attached) : ask === "refused" ? "That ask did not send. Try again later." : null;

  return (
    <div className="app-shell" style={{ display: "flex", flexWrap: "wrap", minHeight: "100vh", color: T.ink }}>
      <Sidebar client={client} others={clients.filter((c) => c.slug !== slug)} email={email} role={client.role} tier={tier} engines={engines} clusters current="Clusters" placements={placedTier(tier)} clusterLimit={client.cluster_limit ?? CLUSTER_BASE} packPrice={packPrice} upsell={upgrade.mode === "nomada"} />
      <div className="app-main" style={{ flex: "1 1 480px", minWidth: 0, padding: "36px 40px 48px", background: T.bg }}>
        <Clusters
          brand={client.brand ?? client.domain}
          subject={{ brand: client.brand, domain: client.domain }}
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
          adding={adding}
          asked={asked}
          askSent={ask === "sent"}
          packPrice={packPrice}
          upgrade={{ tier, mode: upgrade.mode, hidden: upgrade.hidden, startedOn: client.started_on ?? today, domain: client.domain }}
        />
      </div>
    </div>
  );
}
