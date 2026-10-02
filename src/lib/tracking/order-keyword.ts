/**
 * R180 (Danny, 2 Oct 2026, danny.md line 212): the keyword a buyer typed at
 * checkout reaches the dashboard. With no scan behind the order the webhook
 * builds cluster 1 as "Needs a keyword" and keeps the typed keyword only in
 * `orders.keyword`; this reads it back so /setup and Clusters can prefill that
 * cluster's Check keyword field. A prefill only - nothing is checked, paid for
 * or written until the member presses Check keyword. An order with a scan is
 * unchanged: its cluster came from the scan, so its typed keyword is not used.
 */
export type OrderPick = { keyword: string | null; scan_token: string | null };

/** At most CHECKOUT_LIMITS.keyword.max, as checkout validated it. */
const MAX = 120;

/** The newest order's typed keyword, only when no scan was behind it; null otherwise. */
export function orderKeyword(newest: OrderPick | null | undefined): string | null {
  if (!newest || newest.scan_token) return null;
  const k = (newest.keyword ?? "").trim().slice(0, MAX);
  return k.length >= 2 ? k : null;
}

/** The card the prefill lands on: the first cluster with no keyword, as the webhook's cluster 1 is. */
export function prefillCard<C extends { id: string; keyword: string | null }>(cards: readonly C[], keyword: string | null): string | null {
  if (!keyword) return null;
  return cards.find((c) => c.keyword === null)?.id ?? null;
}
