import { TIER_PLAIN } from "../lib/tier-text.ts";

/**
 * The launch video on /how-it-works, as one record (Q23, 26 Sep 2026).
 *
 * A video is a rendered file: nothing in it updates when the site does. So
 * everything the page, the JSON-LD and the text summary say about it lives
 * here, and `video.test.mts` holds the parts that can drift - the files, the
 * duration, and above all the prices - against the tree.
 *
 * `shownPrices` is what the video's staircase frame (0:57) paints, read off
 * stills taken from the file on 26 Sep 2026, in tier order. It is a recorded
 * fact about the video, not a copy of pricing.ts: if a price changes, the test
 * fails and the video is stale until it is re-rendered or taken down.
 */
export const LAUNCH_VIDEO = {
  src: "/video/alwayscited-tiers-720.mp4",
  poster: "/video/alwayscited-tiers-poster.jpg",
  /** 62.315s by the file's mvhd box, rounded to the second. */
  duration: "PT1M2S",
  durationSeconds: 62,
  width: 1280,
  height: 720,
  /** The day it went on the site. */
  uploadDate: "2026-09-26",
  name: "alwayscited in 60 seconds: four tiers, from tracked to everywhere",
  description:
    "One buyer question put to the AI engines, the brands they name instead, and the four tiers that get a brand into the answer: tracking, placements, citation and a whole portfolio.",
  shownPrices: [
    "from $99/mo",
    "$995/mo",
    "$2,495/mo",
    "Book a call",
  ],
} as const;

/**
 * What the video argues, as text, for anyone who cannot or does not play it -
 * a crawler, a screen reader, a muted phone. Each line is what the matching
 * beat says on screen, in plain words; the prices are the ones the video
 * shows, so this can never describe a different video from the one it sits
 * under.
 */
export const LAUNCH_VIDEO_SUMMARY: string[] = [
  "A buyer asks the AI engines for the best invoicing software for freelancers, and each engine names a ranked list of other brands. The brand in the video, Tallyroo, is made up, as is every brand shown.",
  `${TIER_PLAIN.tracked}, ${LAUNCH_VIDEO.shownPrices[0]}: buyer questions put to the engines every week, with every source behind every answer, so you can see every placement opportunity.`,
  `${TIER_PLAIN.mentioned}, ${LAUNCH_VIDEO.shownPrices[1]}: editorial placements in the pages the engines already cite, links included - three a month, on one topic.`,
  `The ${TIER_PLAIN.cited} plan, ${LAUNCH_VIDEO.shownPrices[2]}: link insertions and on-site work move the Google listing as well as the answer, with your own page cited.`,
  `${TIER_PLAIN.everywhere}, ${LAUNCH_VIDEO.shownPrices[3]}: a portfolio of clients under one agreement, priced on volume rather than per seat.`,
  "It closes on the free scan: pick a domain and find out.",
];
