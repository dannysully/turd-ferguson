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

export type StartScanResponse = {
  scan_id: string;
  /** Null when no brand name could be read - UI asks for it. */
  brand: string | null;
  suggested_topic: string | null;
  markets: Market[];
};

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
  gated: boolean;
  empty: boolean;
  /** Why a field is blank or the result is empty. Null when nothing is missing. */
  reason: string | null;
};

export type SignUpResponse = { ok: true };

/** Every failure the UI must render. Thrown by adapters, never returned. */
export class ScanError extends Error {
  constructor(
    public readonly kind: "unreachable" | "rate_limited" | "api_down",
    message: string
  ) {
    super(message);
    this.name = "ScanError";
  }
}

export type ScanSource = "fixture" | "live";

export interface ScanAdapter {
  /** Where results come from. Drives the live-data / illustrative pill. */
  readonly source: ScanSource;
  startScan(input: { domain: string; turnstile?: string }): Promise<StartScanResponse>;
  runScan(input: { scan_id: string; topic: string; market: Market }): Promise<RunScanResponse>;
  signUp(input: { scan_id: string; email: string }): Promise<SignUpResponse>;
}
