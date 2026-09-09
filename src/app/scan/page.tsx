import type { Metadata } from "next";
import HeroSection from "@/components/scan/HeroSection";
import { startScanAction } from "@/app/actions/checker";

/**
 * The no-JS landing for the domain form. Runs the first step on the server
 * and renders the checker already at state 2. Not indexed - it is a state,
 * not a page.
 */
export const metadata: Metadata = {
  title: "Checking your client's domain | alwayscited",
  robots: { index: false, follow: false },
};

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ domain?: string }> }) {
  const { domain = "" } = await searchParams;
  let initialStart = null;
  let initialError = null;
  if (domain) {
    const res = await startScanAction(domain);
    if (res.ok) initialStart = res.data;
    else initialError = { kind: res.kind, message: res.message };
  }
  return <HeroSection initialDomain={domain} initialStart={initialStart} initialError={initialError} />;
}
