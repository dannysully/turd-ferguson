-- Model calls that no scan row can be billed for.
--
-- anthropic_calls_per_day is summed off scans.anthropic_calls, so it can only
-- see calls that reached a scan row. /api/scan/start makes its calls before
-- the row exists: readBrand runs first, and the insert that would carry its
-- cost is six lines further down. A request that dies in between - the model
-- throwing, or the insert failing - bills its calls to nothing, and the daily
-- ceiling counts them as zero.
--
-- That is not a rounding error. withRetry makes up to three requests before it
-- gives up, so one failed attempt can be three uncounted calls, and the
-- failure that produces them is the one that repeats: Anthropic answered 529
-- for a stretch on 19 September, every attempt through it threw after three
-- requests, and every visitor who tried again made three more. The ceiling
-- that exists to stop exactly that could not see any of it.
--
-- So the calls with no row to land on get a row of their own. The day's total
-- is the sum of both, which is what "what we spent at Anthropic today" has
-- always meant and what the column alone could never answer.
--
-- Rows are written only on a failure, so this table stays near empty on a
-- healthy day and fills only when there is something to look at. `reason` is
-- there to be read rather than matched on: a day of read_failed is the model
-- being down, a day of store_failed is ours.
--
-- Additive: one new table, one index, and RLS enabled on it at creation. No
-- existing table, column, policy or function is touched. RLS with no policy
-- means no anon or authenticated access at all, which is the right default for
-- a table only the service role writes - the same shape phase 1 gave scans and
-- leads.
--
-- Authorised by Danny on 19 September 2026, in chat, awake: additive
-- migrations are the agent's to apply, destructive DDL is not.

create table if not exists public.model_call_debits (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  calls       int not null check (calls > 0),
  reason      text not null,
  domain      text,
  ip_hash     text
);

alter table public.model_call_debits enable row level security;

-- The only read this table has is "since 24 hours ago".
create index if not exists model_call_debits_created_at_idx
  on public.model_call_debits (created_at desc);

comment on table public.model_call_debits is
  'Anthropic calls billed to no scan row, because the request failed before the row existed. Summed alongside scans.anthropic_calls by anthropicCallsSince so the daily model ceiling sees the whole bill.';

comment on column public.model_call_debits.reason is
  'Where the attempt died - read_failed, store_failed. For reading in the log, not for matching on.';

comment on column public.model_call_debits.ip_hash is
  'Who the attempt was for, in the same hashed form scans.ip_hash uses. Recorded so a loop is attributable; no limit counts off it today.';
