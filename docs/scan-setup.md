# Turning the free scan on

Phase 1 is built and deployed, but it stays dormant until the environment is
configured. Until then the homepage falls back to the fixture-backed checker,
so nothing is broken in the meantime.

## 1. Create the Supabase project

Create a **new** project called `alwayscited`. Do not extend
`nomada-dashboards`: that project's row-level security is built around
`is_agency()` and `my_client()`, and anonymous public writes do not belong in
the same schema as client data.

Run `supabase/migrations/20260915000000_scan_phase1.sql` in the SQL editor. It
creates the tables, enables row-level security with no anonymous policies at
all, and installs `scan_teaser`, the single public read path.

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

- A scan of a domain you control reaches the free result with nobody involved.
- In the network tab, the response to `GET /api/scan/<token>` contains counts
  and four sources. The leaderboard and the full source list appear only in the
  response to `unlock`.
- A second scan of the same domain inside 30 days makes no paid API calls. The
  admin page will show the first scan's cost and no new row.
- Setting `scans_enabled` to `false` in `app_settings` stops new scans on the
  very next request, with no deploy.
- `/admin/scans` asks for a password, and the cost it reports reconciles
  against the DataForSEO dashboard.

## What a scan costs

A Google AI Overview read was measured at **$0.0055** per question against the
live API. At fourteen questions plus one search-volume call that is roughly
**$0.08 of DataForSEO per scan**, before the three language model calls. The
daily cap ships at 200, which is about $16 a day at the ceiling.

Watch the real figure in `/admin/scans` for the first week and move
`daily_scan_cap` once you have it. It is a row in `app_settings`, so it changes
without a deploy.

## Not built yet

Phase 2 (coverage upload) and phase 3 (weekly tracking) are deliberately out of
scope. `is_tracking_run` already exists on `scans` so that tracking runs can be
excluded from the free-scan caps when phase 3 arrives.
