-- The unlock send cap has a door next to it that nothing counts.
--
-- f631cbc bounded how much branded mail one scan link may put in somebody's
-- inbox in a day, and it counts rows in `leads`: one unlock, one lead, one
-- message. /api/scan/[token]/resend sends the same verification email again
-- and inserts nothing, so it never increments that count and is never checked
-- against it. Its only guard is a 60-second cooldown, which is a ceiling on
-- rate and not on volume - a token is enough to send the same address roughly
-- fourteen hundred messages a day, all from our domain, past a cap that says
-- five.
--
-- The route is inert today because require_email_verification is off, so a
-- lead is born verified and the resend answers 409. It stops being inert the
-- day DMARC is published and that switch is thrown, which is the plan written
-- into settings.ts. Cheaper to hold the door shut now than to remember then.
--
-- A count of sends is not derivable from what is already stored:
-- leads.verify_sent_at holds the most recent send and nothing holds the rest.
-- So the counter is two columns and a rolling window, and the increment is a
-- function rather than a read-then-write in the route, because two requests
-- arriving together on one lead is ordinary here rather than exotic - it is
-- the same mail-scanner-and-recipient pattern that made the verify link, the
-- gated claim and the account insert each need an arbiter they could read
-- back.
--
-- Additive: two columns with constant defaults, which Postgres records as
-- metadata rather than rewriting the table, and one create-or-replace. Every
-- existing lead starts at zero sends with a null window, which is correct -
-- a lead that has already been mailed can only be resent to while it is still
-- unverified, and opening it with a fresh allowance is the forgiving
-- direction. A deploy landing before this is applied gets a missing-function
-- error from the RPC, which the route reads as do-not-send.
--
-- Authorised by Danny on 19 September 2026, in chat, awake: additive
-- migrations are the agent to apply, destructive DDL is not.

alter table public.leads
  add column if not exists verify_sends integer not null default 0;

alter table public.leads
  add column if not exists verify_sends_since timestamptz;

comment on column public.leads.verify_sends is
  'Verification emails sent for this lead inside the window that opened at verify_sends_since. Bounds /api/scan/[token]/resend against app_settings.unlock_emails_per_day. Written only by note_verify_send.';

comment on column public.leads.verify_sends_since is
  'When the current verify_sends window opened. Null means no send has been counted yet.';

-- Counts a send and returns the running total for the window, in one
-- statement so that concurrent callers cannot both read the same number.
--
-- The window is rolling in the coarse sense: it opens on the first counted
-- send and resets whole once it has expired, rather than sliding per message.
-- That is deliberate. A sliding window needs a row per send, and this is a
-- volume ceiling on our own sending reputation rather than an audit trail -
-- the cheaper shape is the one that cannot itself become a table that grows
-- with every press of a button a stranger controls.
--
-- Returns 0 for a lead that does not exist, which the caller reads as nothing
-- to count and refuses on.
create or replace function public.note_verify_send(p_lead uuid, p_window_hours integer)
returns integer
language plpgsql
security definer
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

comment on function public.note_verify_send(uuid, integer) is
  'Counts one verification email against a lead rolling window and returns the new total. The update is the arbiter: two concurrent sends cannot read the same count.';
