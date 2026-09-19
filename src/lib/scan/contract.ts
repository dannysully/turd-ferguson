/**
 * The scan API contract, section 3 of the checker brief.
 *
 * Numeric brand fields are nullable. The three DataForSEO endpoints that
 * produce the fixtures return no brand leaderboard for this topic and no
 * per-question "named in N of M" count, and the house rule is that a figure
 * we did not measure is blank rather than estimated. Matt's spec wins if it
 * disagrees - flagged for him.
 */

export type Market = "UK" | "US";

export type LeaderboardEntry = {
  brand: string;
  mentions: number;
  /** Null where search volume was not measured. Never coerce this to zero:
      "not measured" and "no volume" are different findings. */
  ai_search_volume: number | null;
};

export type SourceEntry = {
  domain: string;
  mentions: number;
  /** Null where search volume was not measured. See LeaderboardEntry. */
  ai_search_volume: number | null;
  /**
   * own | competitor | review | placement | other, or null where the
   * classifier did not reach this domain. Null is "unclassified", never
   * "other" - a domain we failed to read is a different finding from one we
   * read and could not place.
   */
  kind: string | null;
  /** One line on why it was classified that way. Null where unclassified. */
  note: string | null;
};

/**
 * One page a client could realistically be placed into: it fed answers the
 * brand was absent from, and it is somewhere an article can run.
 *
 * There is no "which competitors are on this page" field. scan_brands is
 * aggregated per scan and per engine, never per question, so that claim is
 * not derivable from what the scan records. The design asks for the column;
 * it is left out rather than guessed, because a named competitor on a named
 * page is exactly the kind of claim that has to be stood behind.
 */
export type ScanOpportunity = {
  domain: string;
  /** placement | review. Nothing else reaches this list. */
  kind: string;
  note: string | null;
  /** Answers (question x engine) this page fed where the brand was absent. */
  absent_answers: number;
  /** Distinct questions behind that count. Always <= absent_answers. */
  absent_questions: number;
  questions: string[];
};

export type HistoryPoint = {
  year: number;
  month: number;
  mentions: number;
  ai_search_volume: number;
};

/** One engine's coverage of the question set. */
export type EngineBreakdown = {
  engine: string;
  label: string;
  /** "scraper" read the consumer product; "model" asked the model directly. */
  kind: "scraper" | "model";
  /** Questions this engine was asked. */
  asked: number;
  /** Of those, how many it actually answered. Zero is a measured absence. */
  answered: number;
  /** Of the answers, how many named the brand. */
  named: number;
};

/** One question put to every engine, and what came back at the tally level. */
export type ScanQuestion = {
  idx: number;
  question: string;
  /** category | positioning | sector | outcome | comparison */
  kind: string;
  /** Monthly searches for the phrase, null when we could not measure it. */
  search_volume: number | null;
  /** How many engines produced an answer at all. */
  answered: number;
  /** Of those, how many named the brand. */
  named: number;
  /**
   * Where the brand sits in Google's organic results for this question, or
   * null outside the top 20 - and null also when no organic read was taken.
   * Deliberately not merged with the AI figures: a share of answers and a
   * rank are different measures with different denominators.
   */
  google_rank: number | null;
  /**
   * What each engine actually said, present only once the scan is unlocked.
   * The tallies above are free; the words are what the email buys.
   */
  answers?: EngineAnswer[];
};

/** One engine's response to one question, verbatim. */
export type EngineAnswer = {
  engine: string;
  answered: boolean;
  brand_named: boolean;
  /** Null when the engine said nothing, or when the purge has reclaimed it. */
  response_text: string | null;
};

export type RunScanResponse = {
  scan_id: string;
  /** Kept for the fixture path. Live results use `engines` instead. */
  platform: "google";
  /** ISO date the figures were read. Every figure carries this. */
  read_at: string;
  topic: string;
  market: Market;
  brand: {
    name: string;
    named_in: number | null;
    of: number | null;
    rank: number | null;
    of_brands: number | null;
    share_of_voice: number | null;
  };
  /** Empty on the fixture path; one row per engine the scan actually ran. */
  engines: EngineBreakdown[];
  top_source: { domain: string; brand_present: boolean } | null;
  leaderboard: LeaderboardEntry[];
  sources: SourceEntry[];
  history: HistoryPoint[];
  /**
   * The questions actually put to the engines, with how many answered and how
   * many named the brand. Free, and deliberately so: the strongest evidence a
   * scan is real is the list of things it asked.
   *
   * Optional because the fixture and /example paths do not have it.
   */
  questions?: ScanQuestion[];
  /**
   * The placement opportunities. Present only once the scan is unlocked -
   * this is the finding the email address buys, so it is absent from a locked
   * payload rather than hidden in one.
   */
  opportunities?: ScanOpportunity[];
  gated: boolean;
  /**
   * A model batch failed while the leaderboard was being built, so names are
   * missing from it. Every count in `leaderboard` is still measured - what is
   * not safe is anything counted *against* it, so rank, of_brands and
   * share_of_voice are null whenever this is true.
   */
  leaderboard_partial: boolean;
  empty: boolean;
  /** Why a field is blank or the result is empty. Null when nothing is missing. */
  reason: string | null;
};
