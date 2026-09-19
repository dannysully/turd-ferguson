import type { Metadata } from "next";

import HeroSection from "@/components/scan/HeroSection";

/**
 * The landing for a domain submitted from elsewhere on the site. It prefills
 * the field and nothing more. Not indexed - it is a state, not a page.
 */
export const metadata: Metadata = {
  title: "Checking your client's domain",
  robots: { index: false, follow: false },
};

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ domain?: string }> }) {
  const { domain = "" } = await searchParams;
  return <HeroSection initialDomain={domain} />;
}
