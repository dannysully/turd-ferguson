-- Nothing in this pipeline was timed.
--
-- Danny ran a free scan on 20 September 2026, said it feels slow, and named the
-- phase: the one behind the caption "Finding the sources they cited", where the
-- progress bar sits at 85% for the whole of it. Four API phases ran in a line
-- behind that single caption and there was no elapsed, no duration column and
-- no timed log anywhere in the run.
--
-- So every judgement about where a scan spends its time - including the two
-- changes shipped alongside this migration, removing the search volume step and
-- un-chaining the source classifier - was read off the call graph. That is
-- enough to remove a dependency that provably is not real. It is not enough to
-- know which phase dominates, and the next change after this one should not be
-- another guess.
--
-- Danny, 20 Sep 12:10, item 3: "Record per-step elapsed on the scan row while
-- you are in this file. It is the difference between the next change being
-- measured and being another guess."
--
-- `step_ms` is a flat jsonb object of phase name to whole milliseconds:
--
--   {"questions": 8120, "reading": 41003, "extract": 5210,
--    "classify": 3180, "sources": 4602, "total": 62115}
--
-- jsonb rather than a column per phase, deliberately. The phases are not the
-- three `RUN_STEPS` the progress bar shows - they are finer, because the whole
-- point is to see inside the step that holds at 85% - and they will change as
-- the pipeline does. A column per phase makes every future split a migration
-- and leaves a trail of columns nothing writes, which is the shape
-- `search_volume` is already in one table over. A key that stops being written
-- simply stops appearing, and an operator reading two scans can see which keys
-- each one has.
--
-- Nullable with no default. Null means "this scan ran before the pipeline was
-- timed, or died before it could write", which is a different finding from an
-- empty object, and neither is an error. Nothing reads this on the visitor's
-- report; it is for /admin/scans and for the next person deciding what to
-- change.
--
-- Additive: one nullable column, no backfill, no constraint, no index. Written
-- once per scan in the same update that sets the completed status, so it costs
-- no extra round trip. A scan that fails writes whatever phases finished.

alter table public.scans
  add column if not exists step_ms jsonb;

comment on column public.scans.step_ms is
  'Elapsed milliseconds per pipeline phase, written once when the pass ends. '
  'Flat jsonb of phase name to whole ms, plus "total". Null on any scan that '
  'ran before 20 September 2026, which is not the same as an empty object. '
  'Operator diagnostics only - no visitor surface reads it.';
