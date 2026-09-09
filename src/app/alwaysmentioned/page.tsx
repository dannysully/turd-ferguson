import type { Metadata } from "next";
import PackagePage from "@/components/PackagePage";
import { TIERS } from "@/config/pricing";

const tier = TIERS.find((t) => t.id === "mentioned")!;

export const metadata: Metadata = {
  title: "alwaysmentioned | AI citation placements for agencies",
  description:
    "Three editorial placements a month in the sources AI engines already cite for your client's topic, white-labelled. $995 a month, priced per topic.",
  alternates: { canonical: "https://alwayscited.com/alwaysmentioned" },
};

export default function Page() {
  return (
    <PackagePage
      tier={tier}
      headline="Get named when"
      headlineAccent="AI recommends."
      standfirst="Three placements a month in the third-party articles the engines draw on when someone asks who to use. The focus is recommendations and brand mentions for one topic. Rankings improve as a side effect."
      included={[
        "3 editorial placements a month on one topic",
        "Placed in sources the scan shows the engines already citing",
        "Editorial coverage approached through editors we work with",
        "Anchor text agreed with you before anything goes live",
        "Everything in alwaystracked, so you can see what each placement did",
        "White-label reporting with your logo",
      ]}
      notIncluded={{
        text: "This package wins the mention. It does not do on-page work. For schema and link insertions that go after the Google position directly, that is",
        upgradeTo: "alwayscited",
        href: "/alwayscited",
      }}
      sections={[
        {
          heading: "Every placement passes the same three-part screen",
          body: "Already cited by the engines for the topic, so we place where the answers are actually drawn from rather than on a domain-authority list. Real organic traffic, verified rather than claimed. And contextual to the topic, so the mention reads as editorial to a person and to a model.",
        },
        {
          heading: "A placement that fails the screen is replaced",
          body: "Not counted. You are buying placements that passed, not attempts. If a publication drops out or the piece never runs, it does not come off your three.",
        },
        {
          heading: "A mention can win the citation without a link",
          body: "Across our own coverage, the citations came from pieces with no link in them. Coverage and links do different jobs, and this package is aimed at the first one. The tracker reports which happened.",
        },
        {
          heading: "Priced per topic",
          body: "You name the topic, we build the question set buyers actually ask around it - the longer-tail questions people use when they are choosing a provider. One topic per plan, so the work stays focused enough to move.",
        },
      ]}
    />
  );
}
