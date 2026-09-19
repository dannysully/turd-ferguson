-- The rewrite ceiling is a read-then-write, so concurrent requests all pass it.
--
-- /api/scan/[token]/questions reads preview_calls, compares it to a ceiling of
-- five, makes the model call, and then writes the column back as "what I read
-- plus what I spent". Two requests that arrive together both read the same
-- number, both pass, both spend, and both write the same total - so the column
-- advances by one however many of them there were.
--
-- That is not a near-miss. The route is public and its only credential is the
-- scan token, which the visitor holds; there is no Turnstile on it and no rate
-- limit next to it. A batch of a hundred concurrent requests is a hundred
-- model calls and moves the ceiling by one, and the batch can be repeated.
-- The day ceiling added in 20f8a84 now bounds where that ends, which is the
-- difference between expensive and unbounded, but a ceiling written to allow
-- five rewrites should not be the thing relying on another ceiling to hold.
--
-- The fix is the one note_verify_send already uses on the floor above: make
-- the update the arbiter. A reservation is taken before the call goes out
-- rather than recorded after it comes back, and the WHERE clause is what
-- decides - two requests cannot both satisfy `preview_calls < ceiling` on the
-- same row, because the second one sees the first one committed.
--
-- Reserving before spending, rather than counting after, is also what makes a
-- request that dies mid-call cost its allowance. The old shape recorded
-- nothing when the process went away between the request and the write, which
-- is the free retry an attacker wants and the honest visitor never notices.
--
-- Two functions because there are two jobs. note_preview_call takes the one
-- reservation and answers whether it got it. note_preview_calls adjusts by
-- what was actually billed afterwards - withRetry can make three requests for
-- one reservation, and a call that threw before it sent anything gets its
-- reservation handed back.
--
-- Additive: two create-or-replaces of functions that do not exist yet, with
-- the revoke and grant the rest of this directory uses. No table, column,
-- policy or row is touched. A deploy landing before this is applied gets a
-- missing-function error from the RPC, which the route reads as refuse - so
-- this is applied first.
--
-- Authorised by Danny on 19 September 2026, in chat, awake: additive
-- migrations are the agent to apply, destructive DDL is not.

create or replace function public.note_preview_call(p_scan uuid, p_ceiling integer)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_calls integer;
begin
  update scans
     set preview_calls   = coalesce(preview_calls, 0) + 1,
         anthropic_calls = coalesce(anthropic_calls, 0) + 1
   where id = p_scan
     and coalesce(preview_calls, 0) < p_ceiling
  returning preview_calls into v_calls;

  -- 0 means refused: at the ceiling already, or no such scan. Both are "do not
  -- make the call", and the caller does not need to tell them apart - it has
  -- already established the row exists.
  return coalesce(v_calls, 0);
end;
$$;

revoke all on function public.note_preview_call(uuid, integer) from public;
grant execute on function public.note_preview_call(uuid, integer) to service_role;

comment on function public.note_preview_call(uuid, integer) is
  'Reserves one question-set rewrite against the ceiling and returns the new preview_calls, or 0 if it was refused. The update is the arbiter: two concurrent previews cannot both pass the same ceiling. Service role only.';

-- Adjusts a reservation by what the call actually cost.
--
-- Positive when withRetry made more requests than the one reserved; negative
-- by exactly one when nothing was sent at all, which hands the reservation
-- back. Both columns move together because they measure the same calls: one
-- is the allowance and one is the bill.
--
-- greatest(..., 0) is a floor rather than a guard. The only negative this is
-- ever called with is a refund of a reservation this same request just took,
-- so the column cannot legitimately go below zero - and if some future caller
-- gets that wrong, a column that reads zero is a ceiling that still holds,
-- where a negative one is a ceiling that has quietly become larger.
create or replace function public.note_preview_calls(p_scan uuid, p_calls integer)
returns void
language sql
set search_path = public
as $$
  update scans
     set preview_calls   = greatest(coalesce(preview_calls, 0) + p_calls, 0),
         anthropic_calls = greatest(coalesce(anthropic_calls, 0) + p_calls, 0)
   where id = p_scan;
$$;

revoke all on function public.note_preview_calls(uuid, integer) from public;
grant execute on function public.note_preview_calls(uuid, integer) to service_role;

comment on function public.note_preview_calls(uuid, integer) is
  'Adjusts a scan preview reservation by what the model call actually billed - up when withRetry retried, down by one when nothing was sent. Service role only.';
