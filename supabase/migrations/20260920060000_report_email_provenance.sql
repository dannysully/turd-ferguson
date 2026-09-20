-- The two facts an unverified send endpoint has to record about itself.
--
-- Danny, 20 September 2026 19:45, settling item 5: the report mail goes
-- straight out with no verify step, because "a verify mail they never open is
-- the failure mode that matters" on a feature whose whole job is to reach
-- somebody who has already left the page. Four conditions came with that
-- decision, and two of them are columns.
--
--   report_email_ip_hash    who asked, hashed - the rate limit reads this
--   report_email_message_id what the provider called the message it accepted
--
-- ## Why the caller is stamped here rather than read off `scans.ip_hash`
--
-- `scans.ip_hash` is who started the scan, and the two are **not the same
-- caller**. `/api/scan/start` holds a 30-day `(domain, market)` cache, so a
-- visitor who scans a domain somebody else already scanned is handed that
-- scan's row and that scan's token without inserting anything of their own. A
-- cooldown keyed on `scans.ip_hash` would therefore find no rows for the one
-- caller it most wants to find rows for - the one working through tokens they
-- did not create. This column is written by the route that takes the address,
-- from the request that took it, so the limit counts the caller who actually
-- asked for a message to be sent.
--
-- Hashed with the same `hashIp` every other per-caller limit on this site uses.
-- A raw address is never stored, here or anywhere.
--
-- ## Why the provider's message id is worth a column
--
-- Danny accepted the no-verify send on the condition that we "revisit if the
-- bounce rate is ugly", and that condition is worth nothing if nobody can see
-- the number. A bounce is asynchronous: `emails.send` returns only whether the
-- message was *accepted*, so the rejection this tree already logs is a
-- different event from the bounce that happens minutes later.
--
-- What makes the bounce answerable is the join key. With the id on the row,
-- any later reading - a webhook, a scheduled reconciliation, or one operator
-- with the dashboard open - can attribute a bounce back to the scan that
-- caused it. **Without it there is nothing to join on and the question needs a
-- migration before it can even be asked**, which is the state this column
-- exists to avoid. Storing it now costs one text field on a row that already
-- holds the address.
--
-- ## The index
--
-- The cooldown asks one question on every request to that route: has this
-- caller asked for a message recently. `(report_email_ip_hash,
-- report_email_at desc)` answers it from the index. Partial on a non-null
-- hash, because every scan before today and every scan nobody asked this of
-- has null in it, and those are the overwhelming majority of rows.
--
-- Additive: two nullable columns, one partial index, no backfill, no
-- constraint, nothing dropped or altered.

alter table public.scans
  add column if not exists report_email_ip_hash text,
  add column if not exists report_email_message_id text;

create index if not exists scans_report_email_caller_idx
  on public.scans (report_email_ip_hash, report_email_at desc)
  where report_email_ip_hash is not null;

comment on column public.scans.report_email_ip_hash is
  'The salted hash of the caller who asked for this report to be emailed - not '
  'the caller who started the scan, which is ip_hash and can be a different '
  'person entirely because the domain cache hands one visitor another '
  'visitor''s completed scan. The cooldown in /api/scan/[token]/email-report '
  'counts on this column, so the limit follows whoever asked for a message '
  'rather than whoever paid for the pass.';

comment on column public.scans.report_email_message_id is
  'What Resend called the message it accepted for this row. The send itself is '
  'claimed by report_email_sent_at; this is the key a bounce can be joined '
  'back on, because a bounce arrives long after the send returns. Null where '
  'no message was accepted, which includes every send that was rejected '
  'outright.';
