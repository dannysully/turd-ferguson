-- 25 September 2026. Additive only.
--
-- scans.market_reason: why a scan opened on its market (market-pick.ts) -
--   'chosen', 'domain ending', 'rankings' or 'default'. Read for the line
--   under the confirm screen's market toggle.
-- scan_sources.difficulty / difficulty_basis: how hard a placement on that
--   domain is, 0-100, and the one-line reason (placement-difficulty.ts).
--
-- Applied by Danny in the Supabase SQL editor on 25 Sep 2026, before this
-- file was committed; every statement is idempotent, so replaying it is safe.
alter table public.scans add column if not exists market_reason text;
alter table public.scan_sources add column if not exists difficulty smallint check (difficulty between 0 and 100);
alter table public.scan_sources add column if not exists difficulty_basis text;
