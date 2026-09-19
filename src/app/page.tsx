import type { Metadata } from "next";
import { OG_IMAGE } from "@/config/og";
import HeroSection from "@/components/scan/HeroSection";
import AnswerExplorer from "@/components/home/AnswerExplorer";
import TwoWays from "@/components/home/TwoWays";
import ScanFacts from "@/components/home/ScanFacts";
import TierJourney from "@/components/home/TierJourney";
import Packages from "@/components/home/Packages";
import HomeFaq from "@/components/home/HomeFaq";
import Results from "@/components/home/Results";

export const metadata: Metadata = {
  title: "LLM Visibility Checker | alwayscited",
  description:
    "Check whether AI engines name your client. Run a free scan to see who Google AI Overviews and ChatGPT cite for a topic, then get placed in those sources. White-labelled for agencies, prices on the page.",
  alternates: { canonical: "https://alwayscited.com" },
  openGraph: {
    images: OG_IMAGE,
    title: "LLM Visibility Checker | alwayscited",
    description: "Check whether AI engines name your client. Free scan, then white-label placements in the sources they cite. Prices on the page.",
    url: "https://alwayscited.com",
  },
};

/* ══════════════════════════════════════════════════════════════ */

export default function HomePage() {
  return (
    <>
      <HeroSection />

      {/* The product, shown rather than described. Supersedes the dark
          "why it works" block, which described the same thing in prose. */}
      {/* Phone board only: a compact stand-in for the panel below, which is
          a two-column layout a phone cannot do much with. */}
      <ScanFacts />

      <AnswerExplorer />
      <TwoWays />

      {/* The four tiers, from Journey.dc.html. Supersedes the dark
          comparison block, which argued the same point in prose. */}
      <TierJourney />

      {/* Packages and white label, from Packages.dc.html. Replaces the
          old pricing table and the separate white-label block. */}
      <Packages />

      <Results />

      {/* FAQ and the closing scan, from HomeFaq.dc.html. Replaces the
          old FAQ block and the navy closing CTA. */}
      <HomeFaq />

    </>
  );
}
