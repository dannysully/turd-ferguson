-- "Do not have time to wait? We will email it to you."
--
-- Danny, 20 Sep 12:30, item 5, and his own idea: everybody who gives up at
-- ninety seconds is currently lost silently. This is not a speed fix - it
-- converts a bounce into a captured address.
--
-- Three columns, because the three facts are separate and the middle one is
-- what makes the promise keepable:
--
--   report_email          the address, asked for while the scan was running
--   report_email_at       when they asked
--   report_email_sent_at  when the message went, or null
--
-- ## Why the address is on the row rather than held by the tab
--
-- **Leaving must not cancel the pass**, which is the whole point: the visitor
-- who asks for this has already decided to go. The pass is server-side and a
-- closed tab has never affected it, so what was missing was somewhere for the
-- address to live that outlives the browser. The scan row is that place - it is
-- already the thing the pass writes its result to, so the send needs no queue,
-- no second table and no cron.
--
-- ## Why `report_email_sent_at` is a column and not a boolean
--
-- It is the claim, not a record. The one sender is
-- `sendRequestedReport`, and it takes the send by stamping this column with a
-- filtered update - `where report_email is not null and report_email_sent_at is
-- null` - and reading the address back out of what it stamped. Two callers can
-- reach it at once: the pipeline, the moment the pass completes, and the route,
-- when the address arrives after the scan has already finished. Exactly one of
-- them gets a row back, which is the same compare-and-swap the confirm route
-- and both passes already use to stop a duplicate. A boolean would do as well;
-- the timestamp costs nothing and answers "when" for an operator who is asked.
--
-- Stamped BEFORE the message is handed to Resend, deliberately, so the failure
-- mode is one lost message rather than a loop that sends the same report every
-- time the pipeline runs. That is the trade the unlock's own report email
-- already makes - it is fire-and-forget and never retried - and it is the right
-- way round: this address was given by somebody who has left, and mailing them
-- the same report repeatedly is worse than not mailing them at all.
--
-- ## What is NOT here
--
-- No `leads` row and no `accounts` row. Those are what unlocking creates,
-- because unlocking is an address traded for the gated report. This is a copy
-- of the free result, which is already on the visitor's screen and behind no
-- gate - so the address is kept for the one purpose it was given for, and
-- /legal says so in the same commit.
--
-- Additive: three nullable columns, no backfill, no constraint, no index. Null
-- across all three is every scan before today and every scan nobody asked this
-- of, which is the ordinary case.

alter table public.scans
  add column if not exists report_email text,
  add column if not exists report_email_at timestamptz,
  add column if not exists report_email_sent_at timestamptz;

comment on column public.scans.report_email is
  'An address given while the scan was still running, by a visitor who did not '
  'want to wait, so the free result can be mailed to them when the pass ends. '
  'Kept for that purpose only - it creates no lead and no account, which is '
  'what distinguishes it from the address an unlock trades for. Null on every '
  'scan nobody asked this of.';

comment on column public.scans.report_email_sent_at is
  'The claim on the one report message this row may send, not a record of it. '
  'sendRequestedReport stamps it with a filtered update and reads the address '
  'back out, so the pipeline and the route cannot both send. Stamped before '
  'the message is handed to Resend, so a failed send is one lost message '
  'rather than a report mailed on every later pass.';
