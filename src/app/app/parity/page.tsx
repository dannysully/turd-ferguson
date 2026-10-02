import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Overview from "@/components/app/Overview";
import Sidebar from "@/components/app/Sidebar";
import type { TierKey } from "@/components/TierName";
import { enginesFor } from "@/config/pricing";
import { T } from "@/config/tokens";
import { rangeFrom, type OverviewData } from "@/lib/tracking/overview-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "alwaystracked dashboard", robots: { index: false, follow: false } };

/**
 * The T4 parity fixture (29 Sep 2026): the overview drawn from
 * docs/parity/T4/fixture.json - seeded from the board's own dataset.py - so
 * board and page can be compared figure for figure (BRIEF T4, decision 10).
 *
 * A 404 everywhere but a local checkout: anywhere the fixture file (docs/parity/T4/fixture.json under the working directory)
 * does not exist - it is generated locally by make-fixture.py and
 * never committed. The fixture's made-up brand lives in that file, never in
 * src, and no database is read.
 */
export default async function ParityOverview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // The guard is the file itself: Vercel builds from git, and the fixture is
  // generated locally and never committed (the builder stages src, supabase
  // and public only). An env-var guard was tried first and tripped locally,
  // because a pulled env file carries the platform's variables too.
  // A constant path, so the build traces this one file rather than the project.
  const file = join(process.cwd(), "docs", "parity", "T4", "fixture.json");
  if (!existsSync(file)) notFound();
  const fx = JSON.parse(readFileSync(file, "utf8")) as {
    client: { brand: string; domain: string; market: string; tier: TierKey; started_on: string };
    today: string;
    data: OverviewData;
  };
  const engines = enginesFor(fx.client.tier);
  const q = await searchParams;
  const { range, compare } = rangeFrom(q, fx.today);
  // Slug "example", the fixture client (TRACKING_FIXTURE): since R130 the
  // sidebar links every built screen, and /app/parity/clusters is not a route.
  const client = { slug: "example", domain: fx.client.domain, brand: fx.client.brand, market: fx.client.market };
  // DS5 (2 Oct 2026): ?others=2 gives the member two more made-up clients, so the
  // client switcher can be measured; the fixture member has one client.
  const n = Math.min(Number(q.others) || 0, 5);
  const others = Array.from({ length: n }, (_, i) => ({ slug: `example-${i + 2}`, domain: `example-${i + 2}.com`, brand: null, market: fx.client.market }));

  return (
    <div className="app-shell" style={{ display: "flex", flexWrap: "wrap", minHeight: "100vh", color: T.ink }}>
      <Sidebar client={client} others={others} email="parity@localhost" role="owner" tier={fx.client.tier} engines={engines} />
      <div id="app-content" tabIndex={-1} className="app-main" style={{ flex: "1 1 480px", minWidth: 0, padding: "36px 40px 48px", background: T.bg }}>
        <Overview
          brand={fx.client.brand}
          domain={fx.client.domain}
          market={fx.client.market}
          engines={engines}
          startedOn={fx.client.started_on}
          today={fx.today}
          range={range}
          compareMode={compare}
          data={fx.data}
        />
      </div>
    </div>
  );
}
