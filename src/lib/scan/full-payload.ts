import type { ClusterKeywordView, EngineAnswer, ScanOpportunity } from "./contract.ts";

/** The unlocked half of a scan, as ScanFlow holds it in state. */
export type FullPayload = {
  brands: { brand: string; mentions: number; is_subject: boolean }[];
  sources: { source: string; mentions: number; urls: string[]; kind?: string | null; note?: string | null }[];
  /**
   * Per-question engine detail, including what each one actually said.
   *
   * `google_rank` is here because the merge used to take `engines` and
   * nothing else off these rows. buildUnlockPayload has always sent the rank
   * and this type did not name it, so it was dropped on the way into state and
   * the two places that render it - the "- Google 3rd" note on a question row
   * and the "Best Google position" tile on the unlocked report - had never once
   * shown a value.
   */
  questions?: {
    idx: number;
    google_rank?: number | null;
    target_keyword?: string | null;
    search_volume?: number | null;
    keyword_rank?: number | null;
    engines: EngineAnswer[];
  }[];
  /** True when the questions' keyword trio is the scan's one cluster keyword (BRIEF-3 C1). */
  cluster_keyword?: boolean;
  /** The cluster keyword itself (S1). Null before C1. */
  cluster?: ClusterKeywordView | null;
  /** The gated finding: pages feeding answers the brand is absent from. */
  opportunities?: ScanOpportunity[];
  gated_engines?: string[];
  gated_status?: string;
};

/** What /full and the server page hand over: buildUnlockPayload's output. */
export type FullInput = {
  brands?: FullPayload["brands"];
  sources?: FullPayload["sources"];
  questions?: FullPayload["questions"];
  cluster_keyword?: boolean;
  cluster?: ClusterKeywordView | null;
  opportunities?: ScanOpportunity[];
};

/**
 * The unlock payload, as the screens need it.
 *
 * Written once because it was written three times and one of them was wrong:
 * every reader picked brands, sources and questions off the response and left
 * `opportunities` behind, which is the one thing the email address buys. The
 * table that renders it has shipped since 9d54925 and has never had a row in
 * it, because nothing ever put the rows into state.
 *
 * It then did the same to `cluster` and `cluster_keyword` (R125, 30 Sep):
 * /full carried the cluster keyword, this dropped it, and clusterState() was
 * null on every scan, so "Your first cluster" never drew. Everything the
 * payload carries that a screen reads is copied here; the test runs a real
 * /full shape through it.
 */
export function asFull(data: FullInput): FullPayload {
  return {
    brands: data.brands ?? [],
    sources: data.sources ?? [],
    questions: data.questions ?? [],
    cluster_keyword: data.cluster_keyword === true,
    cluster: data.cluster ?? null,
    opportunities: data.opportunities ?? [],
  };
}
