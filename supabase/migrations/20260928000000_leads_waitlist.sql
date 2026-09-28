-- Project: alwayscited (ref bhvjmlrekrwlrabpysja). NOT nomada-dashboards.
--
-- The alwaystracked platform waitlist, pricing spec section 6 (28 Sep 2026):
-- "Capture work email, sector and keyword target into `leads`, with a
-- `source` of `waitlist`." No migration in this folder makes `leads`, but the
-- spec names it as if it exists, so it may have been made by hand. Written
-- to be right either way, and additive either way:
--
--   - `create table if not exists` makes it, RLS on with no policies as on
--     every other table here (the service role is the only writer), only
--     when it is not already there.
--   - Every column is then `add column if not exists`, so a hand-made table
--     gains what the waitlist writes and keeps everything it had. Nothing is
--     dropped, renamed or retyped, and an existing table's RLS is not touched.
--
-- Not applied by the builder: no apply path in this setup (docs/blocked.md).

do $$
begin
  if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'leads') then
    create table leads (
      id         uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now()
    );
    alter table leads enable row level security;
  end if;
end $$;

alter table leads add column if not exists created_at timestamptz not null default now();
alter table leads add column if not exists email   text;
alter table leads add column if not exists sector  text;
alter table leads add column if not exists keyword text;
alter table leads add column if not exists market  text;
alter table leads add column if not exists source  text;
alter table leads add column if not exists ip_hash text;

create index if not exists leads_source_recent on leads (source, created_at);
