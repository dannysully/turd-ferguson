-- note_verify_send was left open to anon, and did not need to be definer.
--
-- Caught by reading the migration next to the ones already in this directory
-- rather than on its own. Every other function here is followed by
--
--   revoke all on function ... from public;
--   grant execute on function ... to <the roles that need it>;
--
-- and 20260919160000 had neither. Postgres grants EXECUTE on a new function
-- to PUBLIC by default, and PostgREST exposes what anon may execute, so the
-- counter behind the verification resend ceiling was callable from the open
-- internet - as security definer, which is how it would have got past the
-- row-level security on leads.
--
-- What that was worth to somebody: a lead id is a uuid4 and so is not
-- guessable, which is the only reason this is a door left unlocked rather
-- than a door left open. Anyone who did hold one could spend that lead
-- allowance from outside and turn a ceiling written to stop a mailbomb into
-- a resend button that refuses the person waiting on the email.
--
-- Two changes, both narrowing:
--
-- - security invoker, which is the default and which this never needed. The
--   only caller is the resend route on the service role key, and the service
--   role bypasses row-level security on its own. Definer bought nothing and
--   cost the property that a future loosening of the grant cannot escalate.
-- - the revoke and grant the rest of this directory uses, naming service_role
--   and nothing else. anon and authenticated get scan_teaser, which is the
--   one public read path, and they do not get this.
--
-- Additive: a create-or-replace of a function shipped an hour ago and a
-- narrowing of its privileges. Nothing is dropped, no row is touched, and a
-- deploy that predates it calls the same function with the same signature.
--
-- Authorised by Danny on 19 September 2026, in chat, awake: additive
-- migrations are the agent to apply, destructive DDL is not.

create or replace function public.note_verify_send(p_lead uuid, p_window_hours integer)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_count integer;
begin
  update leads
     set verify_sends =
           case when verify_sends_since is null
                  or verify_sends_since < now() - make_interval(hours => p_window_hours)
                then 1
                else verify_sends + 1
           end,
         verify_sends_since =
           case when verify_sends_since is null
                  or verify_sends_since < now() - make_interval(hours => p_window_hours)
                then now()
                else verify_sends_since
           end
   where id = p_lead
   returning verify_sends into v_count;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.note_verify_send(uuid, integer) from public;
grant execute on function public.note_verify_send(uuid, integer) to service_role;

comment on function public.note_verify_send(uuid, integer) is
  'Counts one verification email against a lead rolling window and returns the new total. The update is the arbiter: two concurrent sends cannot read the same count. Service role only - the resend route is the sole caller.';
