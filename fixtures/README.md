# Fixtures

Raw DataForSEO responses, saved verbatim. Nothing in this directory is
hand-written. Regenerate by re-running the three calls below and overwriting
the files - do not edit them.

## Generated

9 September 2026, via the DataForSEO API. Total cost $0.317, from the `cost`
fields the API returned.

| File | Endpoint | Target | Cost |
|---|---|---|---|
| `llm_mentions_historical.json` | `/v3/ai_optimization/llm_mentions/historical/live` | "nomada digital", any scope, Google, UK, from 2025-09-01 | $0.101 |
| `top_mentioned_domains_lite.json` | `/v3/ai_optimization/llm_mentions/top_mentioned_domains_lite/live` | "b2b seo agency", question scope, Google, UK, limit 16 | $0.116 |
| `top_mentioned_brands_lite.json` | `/v3/ai_optimization/llm_mentions/top_mentioned_brands_lite/live` | same as above | $0.100 |

## What the data supports, and what it does not

The domains call returned 16 real sources. The historical call returned 13
real monthly points. **The brands call returned zero items.** DataForSEO has
no brand leaderboard for this topic in this market.

So the mapper leaves `leaderboard` empty and `brand.rank`, `brand.of_brands`,
`brand.named_in`, `brand.of` and `brand.share_of_voice` null, with the reason
stated. None of these three endpoints returns a per-question "named in N of M"
count either - that is a question-level scan the product API runs. Under the
house rule, a figure we did not measure is blank, including here.
