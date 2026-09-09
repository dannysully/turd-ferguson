import type { Metadata } from "next";
import PackagePage from "@/components/PackagePage";
import { TIERS } from "@/config/pricing";

const tier = TIERS.find((t) => t.id === "cited")!;

export const metadata: Metadata = {
  title: "alwayscited | AI citations and rankings for agencies",
  description:
    "Editorial placements in the sources AI engines cite, plus schema work and link insertions that go after the Google position directly. $2,495 a month, priced per topic.",
  alternates: { canonical: "https://alwayscited.com/alwayscited" },
};

export default function Page() {
  return (
    <PackagePage
      tier={tier}
      headline="Get cited,"
      headlineAccent="and rank for it."
      standfirst="Everything in alwaysmentioned, then we go after the ranking directly. Schema work on your client's pages and link insertions from the placements, so the same coverage that wins the AI answer also moves the keyword. This is the one most agencies buy."
      included={[
        "Everything in alwaysmentioned, including the placements and the tracking",
        "Schema work on your client's target pages",
        "Link insertions inside existing high-authority articles",
        "Insertions agreed with the publisher and with you",
        "Both the AI citation and the Google position worked deliberately",
        "White-label reporting with your logo",
      ]}
      notIncluded={{
        text: "One topic, one market. For several markets, several brands, or a dedicated strategist, that is",
        upgradeTo: "alwayseverywhere",
        href: "/alwayseverywhere",
      }}
      sections={[
        {
          heading: "Two routes, worked at once",
          body: "Coverage the engines read can win a citation with no link in it. Links that move rankings can shift a Google position. Both put your client in the pool the engines extract from, and this is the package that does both rather than picking one.",
        },
        {
          heading: "Link insertions, not link building",
          body: "We place contextual links inside articles that already exist, already rank for their own terms, and already get read. Agreed with the publisher, agreed with you, and always inside content about your client's category.",
        },
        {
          heading: "Schema so the answer is extractable",
          body: "A model has to be able to parse what your client's page says before it can quote it. We mark up the pages the placements point at, so the claim on the page and the claim in the coverage line up.",
        },
        {
          heading: "What compounds",
          body: "The engines start citing your client, and once cited in a trusted source brands tend to be cited again across engines. The host article's own ranking carries the linked page. And readers arriving from a category roundup are already choosing a provider.",
        },
      ]}
    />
  );
}
