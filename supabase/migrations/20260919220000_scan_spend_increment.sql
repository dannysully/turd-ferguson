-- The three spend columns are a read-then-write, so concurrent passes lose spend.
--
-- billedOnto in src/lib/scan/pipeline.ts reads dfs_calls, dfs_cost and
-- anthropic_calls off the scan row, adds what this pass billed, and hands the
-- totals to the caller's update. Added rather than set on purpose: three runs
-- write these columns - the free pass, the gated pass, and the free pass again
-- when a visitor confirms a second time after a failed one - and a set let a
-- retry overwrite the first attempt's cost.
--
-- But read-then-add-then-write is only a set with extra steps when two of them
-- overlap. Both read the same total, both add their own spend to it, and the
-- second write lands on top of the first: the column advances by one pass's
-- spend however many passes there were. The free pass and the gated pass are
-- not hypothetically concurrent - the gated pass starts when the visitor clicks
-- the link in their verification email, which is whenever they get round to it,
-- and nothing sequences that against a free pass being retried.
--
-- It matters past tidiness. spentSince and anthropicCallsSince in
-- src/lib/scan/spend.ts sum these columns to enforce the day's dollar ceiling
-- and the day's model-call ceiling. A lost write under-reports the day, and the
-- busier the day the more overlap there is to lose - so the ceiling reads
-- furthest under exactly when it is the only thing left. That is the one
-- direction a ceiling must not fail in.
--
-- The fix is the one note_preview_call already uses a floor above: make the
-- update do the arithmetic. `dfs_cost = dfs_cost + $1` reads and writes in one
-- statement, so the row is locked for the addition and two passes each add
-- their own spend rather than one overwriting the other. It also needs no read
-- at all, which closes the case the previous fix could only refuse: a read that
-- failed used to become `0 + this pass's spend`, erasing what the earlier pass
-- had recorded, and the shipped mitigation was to omit the columns and lose
-- this pass's addition instead. Neither is necessary now - there is nothing to
-- read.
--
-- Returns the new totals rather than void. The caller does not need them, but a
-- migration is verified by reading its output back on real data, and a call
-- with all three deltas at zero is a no-op that still returns what is on the
-- row - so this function can be proved to exist and run without adding a penny
-- to anybody's scan.
--
-- greatest(..., 0) is a floor rather than a guard. Every caller here adds a
-- non-negative bill, so the columns cannot legitimately go below zero - and if
-- some future caller gets that wrong, a column reading zero is a ceiling that
-- still holds where a negative one is a ceiling that has quietly become larger.
--
-- The columns are `not null default 0` (20260915000000), so only the parameters
-- are coalesced.
--
-- Additive: one create-or-replace of a function that does not exist yet, with
-- the revoke and grant the rest of this directory uses. No table, column, policy
-- or row is touched. A deploy landing before this is applied gets a missing
-- function error from the RPC, which the pipeline logs and treats as spend it
-- could not record - the old failure mode, not a worse one - so this is applied
-- first anyway.
--
-- Authorised by Danny on 19 September 2026, in chat, awake: additive migrations
-- are the agent's to apply, destructive DDL is not.

create or replace function public.note_scan_spend(
  p_scan            uuid,
  p_dfs_calls       integer,
  p_dfs_cost        numeric,
  p_anthropic_calls integer
)
returns table (
  total_dfs_calls       integer,
  total_dfs_cost        numeric,
  total_anthropic_calls integer
)
language sql
set search_path = public
as $$
  update scans
     set dfs_calls       = greatest(scans.dfs_calls       + coalesce(p_dfs_calls, 0), 0),
         dfs_cost        = greatest(scans.dfs_cost        + coalesce(p_dfs_cost, 0), 0),
         anthropic_calls = greatest(scans.anthropic_calls + coalesce(p_anthropic_calls, 0), 0)
   where id = p_scan
  returning scans.dfs_calls, scans.dfs_cost, scans.anthropic_calls;
$$;

revoke all on function public.note_scan_spend(uuid, integer, numeric, integer) from public;
grant execute on function public.note_scan_spend(uuid, integer, numeric, integer) to service_role;

comment on function public.note_scan_spend(uuid, integer, numeric, integer) is
  'Adds a pass''s DataForSEO and Anthropic spend to a scan row in one statement, and returns the new totals. The update does the arithmetic, so two passes billing the same scan concurrently cannot overwrite each other - which is what the read-then-write it replaces did, under-reporting the day ceilings that sum these columns. Returns no rows if no scan matches. Service role only.';
