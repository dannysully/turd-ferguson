-- The visitor waits out the slowest engine to learn the first fact.
--
-- Danny, 20 Sep 12:30, item 4, and he called it the biggest perceived win
-- available: "Reads finish at different times and the screen shows nothing
-- until all 56 are in. Reveal each engine's verdict as it arrives. A two-minute
-- scan then feels like thirty seconds."
--
-- Nothing in the pipeline could report that. Every answer from every engine is
-- stored in one upsert after the last read returns, so the first moment any
-- per-engine figure exists in the database is the moment the whole reading
-- phase is over - which is the moment the report renders anyway. There was no
-- partial state to reveal, only a progress bar.
--
-- `engine_results` is that partial state: one row per engine, written the
-- moment that engine's last question comes back, while the other engines are
-- still reading.
--
--   [{"engine": "chatgpt", "asked": 14, "answered": 12, "named": 3},
--    {"engine": "google_aio", "asked": 14, "answered": 14, "named": 0}]
--
-- The three numbers are the same three the finished report's per-engine strip
-- carries (`scan_teaser`'s `by_engine`), so the chip on the waiting screen and
-- the strip on the report cannot say different things about one engine. What
-- they are counted over is in `src/lib/scan/engine-results.ts` and the wording
-- rule is /about's: an engine that returned no answer is excluded from the
-- denominator, never scored as a zero.
--
-- jsonb and an array rather than a column per engine, for the reason `step_ms`
-- gives one migration over: the engine list is `app_settings.scan_engines_free`
-- at runtime, so a column per engine makes every engine added a migration. An
-- engine absent from the array has not landed yet, which is a different finding
-- from an engine that landed and answered nothing - and that distinction is the
-- whole feature.
--
-- Nullable with no default. Null means "this scan ran before the reads were
-- reported as they landed", which is every scan before today and is not the
-- same as an empty array. Read by the status poll, which the waiting screen
-- reads; a scan that has finished has the full report and nothing reads this.
--
-- Written only by the free pass. The gated pass leaves it exactly as the free
-- pass left it, for the same reason it does not write `scans.step`: this column
-- drives the free waiting screen, and a gated pass writing its own two engines
-- over the free pass's four would replace a finished record with a partial one
-- that nobody is watching.
--
-- Additive: one nullable column, no backfill, no constraint, no index.

alter table public.scans
  add column if not exists engine_results jsonb;

comment on column public.scans.engine_results is
  'Per-engine tallies written by the free pass as each engine finishes its '
  'last question, so the waiting screen can reveal one engine at a time. '
  'jsonb array of {engine, asked, answered, named}. An engine absent from the '
  'array has not landed yet - which is not the same as one that landed having '
  'answered nothing. Null on any scan that ran before 20 September 2026. '
  'Written by the free pass only; the gated pass leaves it alone.';
