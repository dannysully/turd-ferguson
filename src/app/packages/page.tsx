import type { Metadata } from "next";
import { OG_IMAGE } from "@/config/og";

import Packages from "@/components/home/Packages";

export const metadata: Metadata = {
  title: { absolute: "Packages and pricing - alwayscited" },
  description:
    "Four tiers, each adding to the last: alwaystracked, alwaysmentioned, alwayscited and alwayseverywhere. Monthly, no minimum term, with the price and what each tier adds on one page.",
  openGraph: { url: "https://alwayscited.com/packages", images: OG_IMAGE },
  alternates: { canonical: "https://alwayscited.com/packages" },
};

/**
 * The staircase, the full table of what each tier adds, the white-label line
 * and the Nomada credit - moved off the homepage onto their own route (Danny,
 * 28 Sep 2026, R65). The homepage keeps the staircase band only, with a link
 * here. Everything on it still reads from `Packages.tsx`, so the two cannot
 * drift apart.
 */
export default function PackagesPage() {
  return (
    <main>
      <Packages full />
    </main>
  );
}
