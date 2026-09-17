-- alwayscited free scan, phase 2: stored responses, and email verification.
-- Run against the `alwayscited` Supabase project. Never against nomada-dashboards.
--
-- Safe to run twice: every statement is guarded.

-- ---------- what the engines actually said ----------
-- The prose was already read on every run and thrown away once brands had been
-- extracted from it. Keeping it is what makes a transcript possible. It is
-- captured on every scan and reclaimed later rather than never captured, because
-- the free pass runs before an email exists.
alter table scan_answers add column if not exists response_text text;

-- The purge sweep reads scans that were never claimed. Partial, so it stays
-- small: claimed scans leave the index as soon as they unlock.
create index if not exists scans_unclaimed_idx
  on scans (created_at) where unlocked_at is null;

-- ---------- email verification ----------
-- A lead is not a lead until the address is proven. The token is the lead's
-- own, not the scan's: one scan can be claimed by more than one address, and
-- each has to prove itself separately.
alter table leads add column if not exists verify_token text;
alter table leads add column if not exists verified_at timestamptz;
alter table leads add column if not exists verify_sent_at timestamptz;

-- Backfill before the unique index, or existing rows collide.
update leads set verify_token = encode(gen_random_bytes(16), 'hex')
  where verify_token is null;

alter table leads alter column verify_token set default encode(gen_random_bytes(16), 'hex');

create unique index if not exists leads_verify_token_key on leads (verify_token);

-- Leads that already exist predate verification. Treating them as verified is
-- the honest reading: they were unlocked under the old rules and nothing about
-- them changed.
update leads set verified_at = created_at where verified_at is null;

-- ---------- the switch ----------
-- Off by default, deliberately. Turning it on makes deliverability load-bearing
-- for the whole funnel: today an unreceived email still leaves you the lead and
-- the visitor their report, but with verification first it loses both. DMARC is
-- not published until the 23rd. Flip this to true once it is, and watch the
-- verify-click rate for a week.
insert into app_settings (key, value)
  values ('require_email_verification', 'false'::jsonb)
  on conflict (key) do nothing;

-- How long an unclaimed scan keeps its transcript.
insert into app_settings (key, value)
  values ('response_retention_days', '7'::jsonb)
  on conflict (key) do nothing;
