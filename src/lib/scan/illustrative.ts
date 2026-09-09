/**
 * ILLUSTRATIVE DATA FOR /example ONLY.
 *
 * The example page is a display specification: it shows what the product
 * renders in a live environment where everything is tracking, so the app can
 * be built to match. Where we have real data (the cited sources, the monthly
 * history) it is used. Where we do not - the brand leaderboard, per-question
 * counts, coverage matching, four weeks of tracking - the values below are
 * invented to look right. The page carries the amber pill throughout.
 *
 * Nothing in this file is imported by the live checker. A real visitor
 * typing a real domain never sees these numbers.
 */

import type { HistoryPoint, LeaderboardEntry, RunScanResponse, SourceEntry } from "./contract";

export const ILLUSTRATIVE_READ_AT = "2026-09-09";

/* Competitors anonymised until the naming decision (brief section 9). */
export const illustrativeLeaderboard: LeaderboardEntry[] = [
  { brand: "Competitor A", mentions: 6, ai_search_volume: 1900 },
  { brand: "Competitor B", mentions: 5, ai_search_volume: 1450 },
  { brand: "Competitor C", mentions: 4, ai_search_volume: 1120 },
  { brand: "Nomada Digital", mentions: 3, ai_search_volume: 640 },
  { brand: "Competitor D", mentions: 2, ai_search_volume: 380 },
];

/** Overlay the invented parts onto a real result. Sources and history stay real. */
export function buildIllustrativeResult(real: RunScanResponse): RunScanResponse {
  return {
    ...real,
    read_at: ILLUSTRATIVE_READ_AT,
    brand: {
      name: "Nomada Digital",
      named_in: 3,
      of: 14,
      rank: 4,
      of_brands: 5,
      share_of_voice: 21,
    },
    leaderboard: illustrativeLeaderboard,
    empty: false,
    reason: null,
  };
}

/* ── Step 6: coverage upload and match ── */
export type CoveragePiece = {
  title: string;
  domain: string;
  published: string;   // ISO date
  theme: "Roundup inclusion" | "Thought leadership" | "Interview" | "Launch PR" | "Guest post";
  status: "live" | "upcoming";
  cited: boolean;
  hasLink: boolean;
};

export const illustrativeCoverage: { file: { name: string; rows: number }; pieces: CoveragePiece[] } = {
  file: { name: "nomada-coverage-2026.csv", rows: 22 },
  pieces: [
    /* The three doing the work - every one without a link */
    { title: "The B2B SEO agencies practitioners actually recommend", domain: "b2bmarketingjournal.co.uk", published: "2026-06-12", theme: "Roundup inclusion", status: "live", cited: true, hasLink: false },
    { title: "Why most B2B SEO retainers stall after month three", domain: "searchindustryreview.com", published: "2026-07-03", theme: "Thought leadership", status: "live", cited: true, hasLink: false },
    { title: "Interview: how Nomada Digital chooses which keywords to fight for", domain: "agencyinsider.co", published: "2026-08-19", theme: "Interview", status: "live", cited: true, hasLink: false },
    /* Launch pieces that earned nothing */
    { title: "Nomada Digital launches AI search practice", domain: "prnewsdesk.co.uk", published: "2026-04-02", theme: "Launch PR", status: "live", cited: false, hasLink: true },
    { title: "York agency expands into AI visibility", domain: "yorkbusinessnews.co.uk", published: "2026-04-03", theme: "Launch PR", status: "live", cited: false, hasLink: false },
    { title: "Nomada Digital announces new service line", domain: "marketingbeat.co.uk", published: "2026-04-04", theme: "Launch PR", status: "live", cited: false, hasLink: false },
    { title: "Agency roundup: April moves", domain: "agencymoves.com", published: "2026-04-08", theme: "Launch PR", status: "live", cited: false, hasLink: false },
    { title: "Five agencies betting on AI search", domain: "digitaltrade.co.uk", published: "2026-04-15", theme: "Launch PR", status: "live", cited: false, hasLink: false },
    { title: "Nomada Digital: the AEO pitch", domain: "b2bweekly.co.uk", published: "2026-04-22", theme: "Launch PR", status: "live", cited: false, hasLink: false },
    { title: "New AI search offer from Nomada", domain: "northernmarketing.co.uk", published: "2026-05-01", theme: "Launch PR", status: "live", cited: false, hasLink: false },
    { title: "Q&A: Nomada Digital on generative search", domain: "searchtalk.co.uk", published: "2026-05-09", theme: "Launch PR", status: "live", cited: false, hasLink: false },
    { title: "Nomada joins AI search vendors list", domain: "martechdirectory.co.uk", published: "2026-05-14", theme: "Launch PR", status: "live", cited: false, hasLink: true },
    { title: "Agencies to watch: AI search", domain: "growthreport.co", published: "2026-05-20", theme: "Launch PR", status: "live", cited: false, hasLink: false },
    { title: "Nomada Digital on LinkedIn Live: what AEO is", domain: "eventwrap.co.uk", published: "2026-05-28", theme: "Launch PR", status: "live", cited: false, hasLink: false },
    /* Other coverage, not cited */
    { title: "What B2B buyers ask AI before they call a vendor", domain: "demandgennotes.com", published: "2026-06-25", theme: "Thought leadership", status: "live", cited: false, hasLink: false },
    { title: "The myth of the DA 90 backlink", domain: "linkbuildingweekly.co", published: "2026-07-14", theme: "Guest post", status: "live", cited: false, hasLink: true },
    { title: "Nomada Digital on the Search Signals podcast", domain: "searchsignals.fm", published: "2026-07-22", theme: "Interview", status: "live", cited: false, hasLink: false },
    { title: "How agencies should report AI visibility to clients", domain: "agencyreporting.co.uk", published: "2026-08-05", theme: "Thought leadership", status: "live", cited: false, hasLink: false },
    { title: "Three questions to ask an AI search agency", domain: "buyersguide.co.uk", published: "2026-08-12", theme: "Guest post", status: "live", cited: false, hasLink: false },
    { title: "Nomada Digital's take on Google AI Mode", domain: "seoroundtable.co.uk", published: "2026-08-27", theme: "Thought leadership", status: "live", cited: false, hasLink: false },
    /* Two upcoming - a baseline is recorded before they publish */
    { title: "The B2B SEO agency shortlist for 2027", domain: "b2bmarketingjournal.co.uk", published: "2026-09-24", theme: "Roundup inclusion", status: "upcoming", cited: false, hasLink: false },
    { title: "Case study: from unranked to cited in eight weeks", domain: "searchindustryreview.com", published: "2026-10-02", theme: "Thought leadership", status: "upcoming", cited: false, hasLink: false },
  ],
};

/* ── Step 7: four weeks of tracking ── */
export type Tracking = {
  before: { namedIn: number; of: number; rank: number; ofBrands: number; readAt: string };
  after: { namedIn: number; of: number; rank: number; ofBrands: number; readAt: string };
  newlyNamed: string[];
  noLongerNamed: string[];
  weekly: { week: string; shareOfVoice: number; namedIn: number }[];
  newlyCitingSources: string[];
};

export const illustrativeTracking: Tracking = {
  before: { namedIn: 3, of: 14, rank: 4, ofBrands: 5, readAt: "2026-09-09" },
  after: { namedIn: 5, of: 14, rank: 3, ofBrands: 5, readAt: "2026-10-07" },
  newlyNamed: [
    "Which B2B SEO agencies work with SaaS companies in the UK?",
    "Best B2B SEO agency for lead generation, not just traffic",
  ],
  noLongerNamed: [],
  weekly: [
    { week: "9 Sep", shareOfVoice: 21, namedIn: 3 },
    { week: "16 Sep", shareOfVoice: 23, namedIn: 3 },
    { week: "23 Sep", shareOfVoice: 24, namedIn: 4 },
    { week: "30 Sep", shareOfVoice: 27, namedIn: 5 },
  ],
  newlyCitingSources: ["b2bmarketingjournal.co.uk", "agencyinsider.co"],
};

export { type HistoryPoint, type SourceEntry };
