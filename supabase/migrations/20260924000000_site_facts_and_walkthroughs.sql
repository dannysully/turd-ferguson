-- Project: alwayscited (ref bhvjmlrekrwlrabpysja). NOT nomada-dashboards.
--
-- Two additive changes for the 24 September 2026 rework. Re-runnable: every
-- statement is guarded. Paste this BEFORE pushing the code - the brand read
-- writes `scans.site_facts` and the question routes select it.
--
-- 1. scans.site_facts
--    { services: string[], industries: string[] } read off the site, case
--    studies included. The question set narrows the category by these rather
--    than by how the company describes itself. Null on every older row, which
--    the code reads as "nothing read".
--
-- 2. walkthrough_requests
--    The result page's only call to action now: a Loom walkthrough of
--    alwaystracked, or a demo call with Danny. The email gate is gone, so this
--    is where an address is given. One row per (scan, email, kind) - a second
--    click is the same request, not a second alert to Danny.
--
-- RLS on with no policies, as on every other table: the service role is the
-- only writer and nothing reads this publicly.

alter table scans add column if not exists site_facts jsonb;

create table if not exists walkthrough_requests (
  id          uuid primary key default gen_random_uuid(),
  scan_id     uuid references scans(id) on delete set null,
  email       text not null,
  kind        text not null check (kind in ('video', 'demo')),
  ip_hash     text,
  notified_at timestamptz,
  created_at  timestamptz not null default now()
);

create unique index if not exists walkthrough_requests_once
  on walkthrough_requests (scan_id, email, kind);
create index if not exists walkthrough_requests_ip_recent
  on walkthrough_requests (ip_hash, created_at);

alter table walkthrough_requests enable row level security;

-- The alert goes to CONTACT_EMAIL_DESTINATION, where contact-form mail already
-- lands. No setting needed.
