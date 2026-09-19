import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ScanFlow from "@/components/scan/ScanFlow";
import { isMarket } from "@/lib/scan/domain";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * A scan, by its link.
 *
 * The whole flow lives here now: confirm what we read off the site, the run,
 * the free result, and the report an address unlocks. The email link and the
 * magic link both land here too, so a visitor coming back on another device
 * gets their scan rather than an empty form.
 *
 * Not indexed. Every one of these is somebody own result.
 */
export const metadata: Metadata = {
  title: "Your AI visibility report | alwayscited",
  robots: { index: false, follow: false },
};

export default async function ScanTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { data: scan } = await supabaseAdmin()
    .from("scans")
    .select("brand_name, domain, positioning, topic, topic_variants, market, status, engines, gated_engines")
    .eq("public_token", token)
    .maybeSingle();

  if (!scan) notFound();

  const brand = (scan.brand_name as string | null) ?? null;
  const positioning = (scan.positioning as string | null) ?? null;
  const topic = (scan.topic as string | null) ?? "";
  const variants = (scan.topic_variants as string[] | null) ?? [];
  const engines = (scan.engines as string[] | null) ?? [];
  const gated = (scan.gated_engines as string[] | null) ?? [];
  const market = isMarket(scan.market) ? scan.market : "UK";

  return (
    <ScanFlow
      token={token}
      domain={scan.domain as string}
      brand={brand}
      positioning={positioning}
      topic={topic}
      market={market}
      variants={variants}
      status={scan.status as string}
      engines={engines}
      gatedEngines={gated}
    />
  );
}
