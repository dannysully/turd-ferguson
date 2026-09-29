import type { Metadata } from "next";

import { fixtureMode } from "@/lib/tracking/fixture-mode";

/**
 * The alwaystracked client dashboard (T3, 29 Sep 2026). Private: noindex here,
 * `x-robots-tag: noindex` from next.config.ts and `Disallow: /app` in
 * robots.ts - all three closures, as every private route carries.
 */
export const metadata: Metadata = {
  title: "alwaystracked dashboard",
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Throws when TRACKING_FIXTURE=1 meets VERCEL_ENV=production (R93): the
  // made-up fixture client is never served from the live site.
  fixtureMode();
  return children;
}
