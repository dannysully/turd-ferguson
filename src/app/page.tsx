import type { Metadata } from "next";
import { OG_IMAGE } from "@/config/og";
import HomeHero from "@/components/home/HomeHero";
import TwoWays from "@/components/home/TwoWays";
import ProcessSequence from "@/components/ProcessSequence";
import Packages from "@/components/home/Packages";
import HomeFaq from "@/components/home/HomeFaq";
import Results from "@/components/home/Results";

export const metadata: Metadata = {
  title: "LLM Visibility Checker | alwayscited",
  description:
    "Check whether AI engines name your client. A free scan shows who Google AI Overviews and ChatGPT cite for a topic. Then get placed in them, white-labelled.",
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
      {/* Dark hero, scan field and the engine demo, from Main.dc.html. The
          demo replaces AnswerExplorer. */}
      <HomeHero />

      {/* Two ways into an answer, the rest of Main.dc.html. ScanFacts, the
          phone stand-in for AnswerExplorer, went with it (Q03, 25 Sep). */}
      <TwoWays />

      {/* The four tiers, as four pictures. One explanation of them on this
          page and the same component on the scan waiting screen - there used
          to be two, and they did not agree about what $99 buys. */}
      <ProcessSequence
        heading="Four tiers. Each one adds to the last."
        standfirst="Start with measurement and stop there if you want. Everything above it is the same programme, doing more of the work."
      />

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
