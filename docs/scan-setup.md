# Turning the free scan on

Phase 1 is built and deployed, but it stays dormant until the environment is
configured. Until then the homepage falls back to the fixture-backed checker,
so nothing is broken in the meantime.

## 1. The Supabase project

Done. Project `alwayscited`, ref `bhvjmlrekrwlrabpysja`, London (eu-west-2),
separate from `nomada-dashboards` as intended. The migration
`supabase/migrations/20260915000000_scan_phase1.sql` ran unedited: nine tables,
row-level security on every one, no policies anywhere, and `scan_teaser`
installed as the single public read path.

`SUPABASE_URL` is `https://bhvjmlrekrwlrabpysja.supabase.co`.

### A note on the key format

The project uses Supabase's newer API keys, so the secret is `sb_secret_...`
rather than a legacy `service_role` JWT. Use the new one.
`@supabase/supabase-js` 2.116 detects the new format and sends it in the
`apikey` header only, never as a bearer token, which is what the new keys
require. There is no need for the legacy keys tab.

One thing to watch on the first unlock: the magic-link invite is the only call
that goes through the auth admin API rather than PostgREST. It is fire and
forget, so a failure cannot break an unlock, but it now logs a warning rather
than swallowing the error. If magic links never arrive, that log line is where
to look.

## 2. Set the environment variables in Vercel

| Variable | Where it comes from |
|---|---|
| `SUPABASE_URL` | Supabase project settings, API |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page. Server only, never `NEXT_PUBLIC_` |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` | app.dataforseo.com, API access. The API password, not the dashboard one |
| `IP_HASH_SALT` | Any long random string. Raw IP addresses are never stored |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile. Public by design |
| `TURNSTILE_SECRET_KEY` | Same widget. Without it, production refuses every scan |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Your choice. Without them `/admin/scans` returns 503 |

This repository is public. Never commit any of these values.

Set the admin pair before the next deploy: the proxy reads them from the
runtime environment, so a new value needs a redeploy to reach it.

## 3. Check the Vercel plan

`/api/scan/[token]/confirm` declares `maxDuration = 300`. The response is sent
as soon as the scan is queued and the run continues in `after()`, so that
ceiling covers the whole pipeline. A Hobby plan caps functions at 60 seconds,
which is below the 90 second target for a full run.

## 4. Verify before announcing it

- A scan of a domain you control reaches the free result with nobody involved,
  and the result names Google AI Overviews, ChatGPT and Gemini separately.
- Giving an email starts the second pass, and Perplexity and Claude appear in
  the same breakdown a minute or two later without reloading.
- In the network tab, the response to `GET /api/scan/<token>` contains counts
  and four sources. The leaderboard and the full source list appear only in the
  response to `unlock`.
- A second scan of the same domain inside 30 days makes no paid API calls. The
  admin page will show the first scan's cost and no new row.
- Setting `scans_enabled` to `false` in `app_settings` stops new scans on the
  very next request, with no deploy.
- `/admin/scans` asks for a password, and the cost it reports reconciles
  against the DataForSEO dashboard.

## Engines, and what the email buys

A scan runs in two passes over the **same fourteen questions**, so the engines
are comparable with each other.

The free pass, before any email:

| Engine | Endpoint | Per call | Per scan |
|---|---|---|---|
| Google AI Overviews | SERP advanced, `load_async_ai_overview` | $0.0055 | $0.077 |
| ChatGPT | LLM Scraper | $0.0040 | $0.056 |
| Gemini | LLM Scraper | $0.0040 | $0.056 |
| **Free scan total** | | | **$0.19** |

The email-gated pass, run once when an address is given:

| Engine | Endpoint | Per call | Per scan |
|---|---|---|---|
| Perplexity | LLM Responses, `sonar` | $0.0060 | $0.084 |
| Claude | LLM Responses, `claude-sonnet-5` | $0.0471 | $0.659 |
| **Unlock total** | | | **$0.74** |

Every figure above was measured against the live API on 15 September 2026, not
taken from a price list.

Claude is the reason for the split: web search pushes it past eleven thousand
input tokens a call, so it costs about eight times the others. Putting it behind
the email means an anonymous visitor costs 19 cents and a captured address costs
93 cents, which is the right way round.

ChatGPT and Gemini are read through the **LLM Scraper**, which returns what a
buyer actually sees in the consumer product. Perplexity and Claude have no
scraper, so they are asked directly through **LLM Responses**. That is a
slightly different question and the result screen labels those two as asked
directly rather than pretending the two are the same measurement.

## The cost controls

Two caps now run together, both rows in `app_settings`:

- `daily_scan_cap`, 200, counts scans started in a rolling day.
- `daily_cost_cap_usd`, 60, sums what DataForSEO actually billed. It covers
  both passes, so a burst of unlocks cannot outspend the day after the count cap
  has been passed.

`scan_engines_free` and `scan_engines_gated` decide which engines each pass
reads. Removing Claude from the gated row halves the unlock cost and takes
effect on the next request, no deploy. An unrecognised engine name in either row
is ignored rather than sent to an endpoint that does not exist.

Watch the real figures in `/admin/scans` for the first week before moving either
cap.

## Not built yet

Phase 2 (coverage upload) and phase 3 (weekly tracking) are deliberately out of
scope. `is_tracking_run` already exists on `scans` so that tracking runs can be
excluded from the free-scan caps when phase 3 arrives.
