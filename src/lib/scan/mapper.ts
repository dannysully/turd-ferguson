/**
 * Maps raw DataForSEO llm_mentions responses to the contract.
 *
 * This is the piece that survives the live swap. It never fetches, never
 * reads env, and never invents a value: a field the response does not
 * support comes out null with the reason recorded.
 */

import type {
  HistoryPoint,
  LeaderboardEntry,
  Market,
  RunScanResponse,
  SourceEntry,
} from "./contract";

/* Minimal shapes for the parts of the raw response we read. */
type RawTask<T> = { status_code: number; result?: T[] };
type RawEnvelope<T> = { status_code: number; tasks?: RawTask<T>[] };

type RawHistoricalResult = {
  items?: { year: number; month: number; metrics: { mentions: number; ai_search_volume: number } }[];
};
type RawDomainsResult = {
  items?: { domain: string; metrics: { mentions: number; ai_search_volume: number } }[];
};
type RawBrandsResult = {
  items?: { brand?: string; name?: string; metrics: { mentions: number; ai_search_volume: number } }[];
};

function firstResult<T>(raw: RawEnvelope<T>): T | null {
  const task = raw?.tasks?.[0];
  if (!task || task.status_code !== 20000) return null;
  return task.result?.[0] ?? null;
}

/** Strip scheme, www and path, leaving a bare host for display and matching. */
export function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .trim()
    .toLowerCase();
}

export function mapHistory(raw: RawEnvelope<RawHistoricalResult>): HistoryPoint[] {
  const items = firstResult(raw)?.items ?? [];
  return items
    .map((i) => ({
      year: i.year,
      month: i.month,
      mentions: i.metrics.mentions,
      ai_search_volume: i.metrics.ai_search_volume,
    }))
    .sort((a, b) => a.year - b.year || a.month - b.month);
}

export function mapSources(raw: RawEnvelope<RawDomainsResult>): SourceEntry[] {
  const items = firstResult(raw)?.items ?? [];
  return items.map((i) => ({
    domain: normalizeDomain(i.domain),
    mentions: i.metrics.mentions,
    ai_search_volume: i.metrics.ai_search_volume,
  }));
}

export function mapLeaderboard(raw: RawEnvelope<RawBrandsResult>): LeaderboardEntry[] {
  const items = firstResult(raw)?.items ?? [];
  return items.map((i) => ({
    brand: i.brand ?? i.name ?? "",
    mentions: i.metrics.mentions,
    ai_search_volume: i.metrics.ai_search_volume,
  }));
}

/**
 * Assemble a RunScanResponse from the mapped parts.
 *
 * Rank comes from the leaderboard only. With an empty leaderboard every rank
 * field is null and the reason says why. named_in and of are not available
 * from these endpoints at all, so they are null regardless.
 */
export function buildRunResult(input: {
  scan_id: string;
  brandName: string;
  brandDomain: string;
  topic: string;
  market: Market;
  read_at: string;
  history: HistoryPoint[];
  sources: SourceEntry[];
  leaderboard: LeaderboardEntry[];
  gated: boolean;
}): RunScanResponse {
  const { leaderboard, sources } = input;
  const brandKey = input.brandName.trim().toLowerCase();
  const brandDomain = normalizeDomain(input.brandDomain);

  const rankIndex = leaderboard.findIndex((e) => e.brand.trim().toLowerCase() === brandKey);
  const ranked = leaderboard.length > 0;

  const topSource = sources[0]
    ? { domain: sources[0].domain, brand_present: sources[0].domain === brandDomain }
    : null;

  const reasons: string[] = [];
  if (!ranked) reasons.push("no brand leaderboard returned for this topic and market");
  reasons.push("per-question named-in counts are not available from the aggregate endpoints");

  const empty = !ranked && sources.length === 0;

  return {
    scan_id: input.scan_id,
    platform: "google",
    read_at: input.read_at,
    topic: input.topic,
    market: input.market,
    brand: {
      name: input.brandName,
      named_in: null,
      of: null,
      rank: ranked && rankIndex >= 0 ? rankIndex + 1 : null,
      of_brands: ranked ? leaderboard.length : null,
      share_of_voice: null,
    },
    top_source: topSource,
    leaderboard,
    sources,
    history: input.history,
    gated: input.gated,
    empty,
    reason: reasons.length ? reasons.join("; ") : null,
  };
}
