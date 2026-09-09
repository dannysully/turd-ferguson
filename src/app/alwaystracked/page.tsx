import type { Metadata } from "next";
import PackagePage from "@/components/PackagePage";
import { TIERS } from "@/config/pricing";

const tier = TIERS.find((t) => t.id === "tracked")!;

export const metadata: Metadata = {
  title: "alwaystracked | AI visibility tracking for agencies",
  description:
    "Ongoing AI visibility tracking for one topic: who the engines name, which sources they cite, and which of your coverage is in that list. $99 a month, white-labelled.",
  alternates: { canonical: "https://alwayscited.com/alwaystracked" },
};

export default function Page() {
  return (
    <PackagePage
      tier={tier}
      headline="Know what your coverage"
      headlineAccent="actually did."
      standfirst="The scan tells you where a client stands today. alwaystracked keeps reading, week after week, so you can show a client what changed and when it changed."
      included={[
        "Ongoing AI visibility readings on a locked question set",
        "The category leaderboard, and where your client sits in it",
        "The sources the engines cite for your topic, ranked by how often",
        "Coverage matching: upload a campaign, see which pieces are cited",
        "Google positions for the host article and the client page, tracked separately",
        "White-label reports with your logo, not ours",
        "One topic, one market",
      ]}
      notIncluded={{
        text: "This package measures. It does not place. If you want us to get your client into the sources the scan names, that starts at",
        upgradeTo: "alwaysmentioned",
        href: "/alwaysmentioned",
      }}
      sections={[
        {
          heading: "Who the engines name",
          body: "Every brand Google AI Overviews and ChatGPT mention when buyers ask about your client's topic, ranked by share of voice. You see the competitors ahead of your client by name, not a score out of a hundred.",
        },
        {
          heading: "What they drew on to say it",
          body: "The exact sources cited in those answers, ranked by how often they appear. This is the list that decides whether your client exists in an AI answer, and it is the list we work from when you buy a placement.",
        },
        {
          heading: "Which of your coverage is in that list",
          body: "Upload a campaign's coverage and we match it URL for URL against the cited sources. You get the pieces doing the work, the pieces doing nothing, and the sources you are not in yet.",
        },
        {
          heading: "Two keyword sets, never averaged",
          body: "The host article's ranking for the terms it was written to win, and your client's page ranking for the term that converts. They are different jobs, so we report them separately rather than rolling them into one number.",
        },
        {
          heading: "The sequence, not a claim about cause",
          body: "We show you where a page sat before, where it sits now, and the date the coverage went live. We do not pretend that is a controlled experiment.",
        },
      ]}
    />
  );
}
