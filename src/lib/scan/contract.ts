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
  ai_search_volume: number;
};

export type SourceEntry = {
  domain: string;
  mentions: number;
  ai_search_volume: number;
};

export type HistoryPoint = {
  year: number;
  month: number;
  mentions: number;
  ai_search_volume: number;
};

export type RunScanResponse = {
  scan_id: string;
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
  top_source: { domain: string; brand_present: boolean } | null;
  leaderboard: LeaderboardEntry[];
  sources: SourceEntry[];
  history: HistoryPoint[];
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
