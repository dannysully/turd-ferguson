-- A scan left at 'queued' could not be dated, so it could not be closed.
--
-- The free pass stamps started_at when it claims the row, so a row stuck at
-- 'running' can be aged and closed. 'queued' had no stamp at all: it is written
-- by the confirm route, and the only other date on the row is created_at, which
-- is when the visitor submitted the domain. Those can be hours apart - somebody
-- leaves the confirm screen open and comes back to it - so created_at cannot
-- stand in for it. A sweep using created_at would mark a live scan failed the
-- moment it was confirmed, and runScan's claim (.eq("status","queued")) would
-- then find nothing and drop the pass. That is a worse bug than the one it
-- closes.
--
-- The window is small: the confirm route sets 'queued' and runScan claims it
-- in the same request, milliseconds apart. But it is exactly the window the
-- platform kill lands in, and a row that never leaves 'queued' can never be
-- re-confirmed either, because the confirm route's compare-and-swap excludes
-- 'queued' by design.
--
-- Additive only. Danny authorised additive migrations in chat on 19 September
-- 2026, awake, after the absence of any restore in this setup was put to him
-- in plain terms: add a column, add an index, create or replace, create if not
-- exists, add a constraint existing rows already satisfy, backfill a column you
-- just added. Everything destructive stays absolute.
--
-- Not backfilled, deliberately. A null queued_at reads as "cannot date this
-- row" everywhere it is used, and is never treated as stale - so rows that
-- predate this column are left alone rather than closed on a guessed date.

alter table scans add column if not exists queued_at timestamptz;

comment on column scans.queued_at is
  'When the confirm route queued this scan. Dates a row stuck at queued so the '
  'stall sweep can tell a pass that is starting from one the platform killed. '
  'Null means undatable, which is never treated as stale.';

-- Supports the stall sweep, which runs on a schedule for as long as the table
-- keeps growing. Partial, because the only rows it ever looks at are the two
-- unfinished statuses - which is a handful at any moment, against every scan
-- ever run.
create index if not exists scans_unfinished_idx
  on scans (status, started_at, queued_at)
  where status in ('queued', 'running');

-- The same, for the pass an email address bought. Dated by unlocked_at, which
-- already exists: completeUnlock stamps it and moves gated_status off 'none' a
-- few statements later in the same request, and throws if the stamp does not
-- land. So no new column is needed on this side.
create index if not exists scans_gated_unfinished_idx
  on scans (gated_status, unlocked_at)
  where gated_status in ('queued', 'running');
