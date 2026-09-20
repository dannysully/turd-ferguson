-- A gated pass in flight was invisible to both day ceilings.
--
-- activeWindow in src/lib/scan/spend.ts counts a scan against the day if it was
-- created in the window or if either of its passes FINISHED in it:
--
--   created_at.gte.X, completed_at.gte.X, gated_completed_at.gte.X
--
-- The free pass is covered by created_at, because the row is made as that pass
-- starts. The gated pass is not. It runs when the visitor clicks the link in
-- the verification email, which can be days after created_at, and it is the
-- biggest single spender in the system: every question again on every gated
-- engine, plus a brand extraction per engine and a source classification. So
-- from the moment it starts until gated_completed_at lands, the most expensive
-- thing this product does costs nothing that either ceiling can see.
--
-- That is not a rounding error at the scale the caps are set for. Ten unlocks
-- clicked in the same few minutes are ten gated passes in flight, and both
-- daily_cost_cap_usd and the Anthropic call ceiling read as though none of them
-- had begun.
--
-- gated_started_at is stamped by the gated claim in pipeline.ts - the same
-- compare-and-swap that moves gated_status from 'queued' to 'running', so it is
-- written exactly once per pass and cannot double-stamp a duplicate. Adding it
-- to activeWindow makes the spend visible from the start of the pass rather
-- than the end of it.
--
-- Danny decided this on 20 September 2026: "stamp the row when the pass starts,
-- not only when it finishes, so spend in flight is visible to both ceilings."
--
-- What this still does not close, and deliberately: a pass the platform kills
-- mid-flight was billed by the vendor for every read it had already made and
-- never reached the write that records the cost. This column makes that pass
-- COUNT against the window, which is an improvement - the row is now in the
-- ceiling's denominator - but the number on it is still short by whatever the
-- killed pass had spent. Danny's instruction on that half was to leave it:
-- inventing a figure is worse than the gap. It is written down where the
-- ceilings are read instead.
--
-- Additive only. Danny authorised additive migrations in chat on 19 September
-- 2026, awake, after the absence of any restore in this setup was put to him in
-- plain terms: add a column, add an index, create or replace, create if not
-- exists, add a constraint existing rows already satisfy, backfill a column you
-- just added. Everything destructive stays absolute.
--
-- Not backfilled. A null gated_started_at means "this row predates the column",
-- and every existing gated pass has either finished - in which case
-- gated_completed_at already counts it - or was abandoned long enough ago to be
-- outside any window a ceiling asks about. A backfill from unlocked_at would
-- put a guessed date on rows the ceilings would then act on.

alter table scans add column if not exists gated_started_at timestamptz;

comment on column scans.gated_started_at is
  'When the gated pass claimed this row. Makes spend that is in flight visible '
  'to the day ceilings in spend.ts, which otherwise cannot see the most '
  'expensive pass in the system until it finishes. Null means the row predates '
  'the column.';
