-- alwayscited free scan, phase 1.
-- Run against the `alwayscited` Supabase project. Never against nomada-dashboards.

create extension if not exists pgcrypto;

-- ---------- settings and safety ----------
create table app_settings (
  key            text primary key,
  value          jsonb not null,
  updated_at     timestamptz not null default now()
);
insert into app_settings (key, value) values
  ('scans_enabled',      'true'::jsonb),
  ('daily_scan_cap',     '200'::jsonb),
  ('ip_scans_per_day',   '3'::jsonb),
  ('domain_cache_days',  '30'::jsonb);

-- ---------- accounts ----------
create table accounts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid unique references auth.users(id) on delete cascade,
  email          text not null,
  agency_name    text,
  agency_domain  text,
  created_at     timestamptz not null default now()
);
create unique index accounts_email_key on accounts (lower(email));

create table client_domains (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references accounts(id) on delete cascade,
  domain         text not null,
  brand_name     text,
  topic          text,
  market         text not null check (market in ('UK','US')),
  created_at     timestamptz not null default now(),
  unique (account_id, domain, topic, market)
);

-- ---------- scans ----------
create type scan_status as enum ('pending_topic','queued','running','complete','failed');

create table scans (
  id                uuid primary key default gen_random_uuid(),
  public_token      text not null unique default encode(gen_random_bytes(16),'hex'),
  domain            text not null,
  brand_name        text,
  positioning       text,
  topic             text,
  market            text check (market in ('UK','US')),
  status            scan_status not null default 'pending_topic',
  step              text,                 -- 'questions' | 'reading' | 'sources'
  error             text,
  account_id        uuid references accounts(id) on delete set null,
  client_domain_id  uuid references client_domains(id) on delete set null,
  unlocked_at       timestamptz,
  ip_hash           text,
  is_tracking_run   boolean not null default false,
  dfs_calls         int not null default 0,
  dfs_cost          numeric(10,4) not null default 0,
  anthropic_calls   int not null default 0,
  started_at        timestamptz,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);
create index on scans (domain, topic, market, completed_at desc);
create index on scans (ip_hash, created_at desc);
-- Supports the daily cap count, which runs before every paid call.
create index on scans (created_at desc) where is_tracking_run = false;

create table scan_questions (
  id              uuid primary key default gen_random_uuid(),
  scan_id         uuid not null references scans(id) on delete cascade,
  idx             int not null,
  question        text not null,
  kind            text not null,          -- category | positioning | sector | outcome | comparison
  search_volume   int,
  aio_shown       boolean,
  brand_named     boolean,
  raw             jsonb,                  -- trimmed DataForSEO item
  unique (scan_id, idx)
);

create table scan_citations (
  id              uuid primary key default gen_random_uuid(),
  scan_id         uuid not null references scans(id) on delete cascade,
  question_id     uuid not null references scan_questions(id) on delete cascade,
  source_domain   text not null,
  url             text,
  title           text,
  position        int
);
create index on scan_citations (scan_id, source_domain);

create table scan_brands (
  id              uuid primary key default gen_random_uuid(),
  scan_id         uuid not null references scans(id) on delete cascade,
  brand           text not null,
  mentions        int not null default 0,
  is_subject      boolean not null default false,
  unique (scan_id, brand)
);

-- ---------- leads ----------
create table leads (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  scan_id         uuid references scans(id) on delete set null,
  account_id      uuid references accounts(id) on delete set null,
  marketing_ok    boolean not null default false,
  created_at      timestamptz not null default now()
);
create index on leads (email);

alter table app_settings   enable row level security;
alter table accounts       enable row level security;
alter table client_domains enable row level security;
alter table scans          enable row level security;
alter table scan_questions enable row level security;
alter table scan_citations enable row level security;
alter table scan_brands    enable row level security;
alter table leads          enable row level security;
-- No policies. Server-side service role only, plus the RPC below.

-- ---------- the one public read path ----------
-- Teaser only. Exposes the COUNT of sources but never the list: that gap is
-- what the email gate trades on.
create or replace function public.scan_teaser(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'brand',        s.brand_name,
    'topic',        s.topic,
    'market',       s.market,
    'status',       s.status,
    'step',         s.step,
    'read_at',      s.completed_at,
    'named',        (select count(*) from scan_questions q
                       where q.scan_id = s.id and q.brand_named),
    'of',           (select count(*) from scan_questions q where q.scan_id = s.id),
    'aio_shown',    (select count(*) from scan_questions q
                       where q.scan_id = s.id and q.aio_shown),
    'rank',         (select count(*) + 1 from scan_brands b2
                       where b2.scan_id = s.id
                         and b2.mentions > coalesce((select mentions from scan_brands b3
                              where b3.scan_id = s.id and b3.is_subject), 0)),
    'brand_count',  (select count(*) from scan_brands b4 where b4.scan_id = s.id),
    -- One row per (source, question) before aggregating, so a source cited
    -- twice inside the same answer counts once and two questions that happen
    -- to share a search volume both contribute.
    'top_sources',  (select jsonb_agg(t) from (
                        select source_domain as source,
                               count(*) as mentions,
                               sum(search_volume) as ai_search_volume,
                               bool_or(is_own) as is_own_domain
                        from (
                          select distinct c.source_domain, c.question_id,
                                 q.search_volume, (c.source_domain = s.domain) as is_own
                          from scan_citations c
                          join scan_questions q on q.id = c.question_id
                          where c.scan_id = s.id
                        ) d
                        group by source_domain
                        order by count(*) desc, sum(search_volume) desc nulls last
                        limit 4) t),
    'total_sources',(select count(distinct source_domain)
                       from scan_citations where scan_id = s.id)
  )
  from scans s where s.public_token = p_token;
$$;
revoke all on function public.scan_teaser(text) from public;
grant execute on function public.scan_teaser(text) to anon, authenticated;
