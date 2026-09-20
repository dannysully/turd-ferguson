/**
 * The retry ladder in front of the model, and the thing that counts what it
 * costs.
 *
 * Split out of `anthropic.ts` for the reason ten other modules here were: that
 * file opens with `import "server-only"` and pulls in the SDK, so `node --test`
 * cannot load it, and the policy under every model call in this product had no
 * check on it. Nothing in here imports the SDK or touches the network.
 *
 * ## There are two retry layers, not one, and this module owns neither alone
 *
 * `anthropic.ts` used to say "Two retries on an overloaded or rate limited
 * model ... worst case this adds about five and a half seconds before giving
 * up". Both halves were false, and the reason is a default nothing in this repo
 * had read: `new Anthropic()` sets `maxRetries` to **2** of its own
 * (`node_modules/@anthropic-ai/sdk/client.js`, `options.maxRetries ?? 2`), and
 * retries 408, 409, 429, every 5xx and a connection error before the error ever
 * reaches `withRetry`. So one `withRetry` call is up to **three attempts of
 * three requests each - nine requests**, not three, and the wait between them
 * is the SDK's own exponential backoff *plus* the waits below.
 *
 * The SDK's backoff is also not bounded by anything here: `retryRequest` obeys
 * a `retry-after` or `retry-after-ms` response header up to `2 ** 31 - 1`
 * milliseconds and only falls back to its 0.5s/1s exponential when the header
 * is absent or unparseable. A 429 routinely carries one. The five-and-a-half
 * seconds below is the floor of the outer layer, not the ceiling of the whole.
 *
 * Both layers are kept. The SDK's recovers three classes this one deliberately
 * does not - a 408, a 409 and a connection error that never got a status - and
 * dropping to `maxRetries: 0` to make the old sentence true would have traded a
 * real recovery for a tidy comment. What is fixed instead is the count, below.
 */

/**
 * The outer layer's waits, in order, one per retry.
 *
 * Backed off rather than immediate: a second call fired 1.5s into a capacity
 * wobble tends to meet the same wobble, which is also why these are an order of
 * magnitude longer than the SDK's own 0.5s and 1s.
 */
export const RETRY_WAITS = [1500, 4000] as const;

/**
 * Should the outer layer try again?
 *
 * A 529 is capacity, not a bad request, and it lands often enough to matter:
 * the question set is the one call a visitor is waiting on on the first screen
 * of the funnel, so failing it outright costs the scan. It 529ed three times in
 * one testing session.
 *
 * Anything else - a bad request, a bad key - is refused here, because a retry
 * cannot fix it. That includes an error carrying no status at all, which is the
 * case worth naming: the SDK's `APIConnectionError` has none, and neither does
 * a `ZodError` out of `messages.parse` when the model returns JSON the schema
 * refuses. The two are not distinguishable from outside the SDK, and retrying
 * the second buys three identical failures at three times the price. The SDK's
 * own inner layer already retried the first before we ever saw it.
 */
export function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return status === 429 || (typeof status === "number" && status >= 500);
}

/**
 * The outer retry layer.
 *
 * No billing accumulator, deliberately, and that is the fix this module was
 * written for. It used to take one and increment it once per attempt, which
 * counted three requests where the SDK had sent nine. `anthropic_calls` is not
 * a diagnostic: `anthropicCallsSince` sums it into the daily call ceiling, and
 * `spend.ts` says in its own header that the failure that puts a scan on that
 * ceiling "is the repeating kind, which is precisely when this ceiling is the
 * only thing left". A 529 storm is the repeating kind, and under one the
 * counter reported a third of the requests that had actually gone out - so the
 * ceiling under-reported by 3x on the one day it exists for.
 *
 * Counting moved to `countingFetch`, which is the only place in this tree that
 * sees a request rather than an attempt.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  waits: readonly number[] = RETRY_WAITS,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= waits.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === waits.length) throw err;
      await new Promise((r) => setTimeout(r, waits[attempt]));
    }
  }
  throw lastErr;
}

/** What `countingFetch` wraps: the SDK's `fetch`, structurally, without importing it. */
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * `inner`, with a tally of every request that leaves.
 *
 * Handed to the SDK as its `fetch`, so it is called once per HTTP request
 * including the SDK's own retries - the layer `withRetry` cannot see and cannot
 * be told about. That is the whole point: a counter above the SDK counts
 * attempts, and only a counter below it counts requests.
 *
 * Incremented **before** the await, for the reason the DataForSEO call in the
 * pipeline is: by the time this rejects the request has already gone out, and a
 * counter that only hears about the requests that came back reports a scan as
 * cheaper than it was. The run this exists for - three 529s in one session - is
 * exactly the run whose cost went unrecorded.
 */
export function countingFetch(billed: { calls: number }, inner: FetchLike): FetchLike {
  return (input, init) => {
    billed.calls += 1;
    return inner(input, init);
  };
}
