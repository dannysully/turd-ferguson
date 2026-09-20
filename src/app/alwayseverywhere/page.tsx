import type { Metadata } from "next";
import { OG_IMAGE } from "@/config/og";
import PackagePage from "@/components/PackagePage";
import { TIERS } from "@/config/pricing";

const tier = TIERS.find((t) => t.id === "everywhere")!;

export const metadata: Metadata = {
  title: "alwayseverywhere | Multi-market AI visibility",
  description:
    "Multi-market, multi-brand AI citation placements with a dedicated strategist, white-labelled for agencies running this across a client base.",
  openGraph: { url: "https://alwayscited.com/alwayseverywhere", images: OG_IMAGE },
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
      notIncluded={{
        text: "A published price is the one thing this tier does not come with. The number of brands, the number of markets, and how hard the answer box is to win in each all change what the work costs, so we quote it rather than post a figure we would have to renegotiate. A partner call covers how many clients you are thinking about, which markets, and what you already have running - and we say what we would do first, and roughly what it costs, before you commit to anything.",
      }}
      /**
       * These are deliverables now. The three that were here - why there is no
       * price, we never contact your client, what a partner call covers - were
       * the sales process, rendered under a heading that reads "What lands each
       * month" and a line that reads "Stated as deliverables rather than
       * adjectives, so you can hold us to it". This was the only one of the four
       * package pages whose deliverables table contained no deliverables; the
       * pricing rationale and the partner call moved to the trailing paragraph,
       * which is where a caveat belongs. Every line below is a restatement of
       * something already in `included` or in the partner agreement - nothing
       * here is a new claim, and nothing here is about what an engine does.
       */
      sections={[
        {
          heading: "A question set per market, not one translated",
          body: "Buyers phrase the same purchase differently in each market, so each market gets its own set of questions built for it rather than a translation of the first one. The sets are locked once agreed, so a change in the reading is a change in the answers and not a change in what we asked.",
        },
        {
          heading: "One strategist who holds the whole portfolio",
          body: "The same person across every brand and every market on the agreement, so the pattern that shows up on one account is applied to the next one without you having to carry it between two contacts.",
        },
        {
          heading: "Reporting that splits two ways",
          body: "One consolidated view of the portfolio for you, and a separate report per client for them, from the same readings. Both carry your logo and neither carries ours.",
        },
        {
          heading: "We never contact your client",
          body: "No calls, no emails, no name on the report, at any tier. That is in the partner agreement rather than just on a page, and it does not change because the account got bigger.",
        },
      ]}
    />
  );
}
