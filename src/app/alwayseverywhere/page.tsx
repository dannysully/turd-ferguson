import type { Metadata } from "next";
import PackagePage from "@/components/PackagePage";
import { TIERS } from "@/config/pricing";

const tier = TIERS.find((t) => t.id === "everywhere")!;

export const metadata: Metadata = {
  title: "alwayseverywhere | Multi-market AI visibility for agencies",
  description:
    "Multi-market, multi-brand AI citation placements with a dedicated strategist, white-labelled for agencies running this across a client base.",
  alternates: { canonical: "https://alwayscited.com/alwayseverywhere" },
};

export default function Page() {
  return (
    <PackagePage
      tier={tier}
      headline="Every market,"
      headlineAccent="every brand."
      standfirst="For agencies running this across a client base rather than a single account. Several markets, several brands, and a strategist who knows all of them, still entirely under your brand."
      included={[
        "Everything in alwayscited, across multiple topics",
        "Multiple markets, with the question set built per market",
        "Multiple brands under one agreement",
        "A dedicated strategist who knows your client base",
        "Reporting consolidated for you, and split per client for them",
        "White-label throughout, including the partner agreement",
      ]}
      sections={[
        {
          heading: "Why this is a conversation rather than a price",
          body: "Scope varies too much to publish a number honestly. The number of brands, the number of markets, and how hard the answer box is to win in each all change what the work costs. We would rather quote it than post a figure we have to renegotiate.",
        },
        {
          heading: "We never contact your client",
          body: "No calls, no emails, no name on the report, at any tier. That is in the partner agreement rather than just on a page, and it does not change because the account got bigger.",
        },
        {
          heading: "What a partner call covers",
          body: "How many clients you are thinking about, which markets, and what you already have running. We will tell you what we would do first and roughly what it costs before you commit to anything.",
        },
      ]}
    />
  );
}
