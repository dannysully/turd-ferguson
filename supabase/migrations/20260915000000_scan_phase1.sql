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
  ('domain_cache_days',  '30'::jsonb),
  -- What an anonymous visitor gets. Measured DataForSEO cost for fourteen
  -- questions: google_aio $0.077, chatgpt $0.056, gemini $0.056. About $0.19.
  ('scan_engines_free',  '["google_aio","chatgpt","gemini"]'::jsonb),
  -- What the email buys, run once after the address is captured: perplexity
  -- $0.084 and claude $0.659, about $0.74 more. Worth it for an address, not
  -- for an anonymous visitor. Editing either row takes effect on the next
  -- request, no deploy.
  ('scan_engines_gated', '["perplexity","claude"]'::jsonb),
  -- Second safety net behind daily_scan_cap, covering free and gated spend
  -- together. Trips before the count cap if unlocks run hot.
  ('daily_cost_cap_usd', '60'::jsonb);

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

-- The surfaces a scan reads. google_aio, chatgpt and gemini are scraped from
-- the consumer product a buyer actually uses; perplexity and claude are the
-- models asked directly, which is a slightly different question.
create type scan_engine as enum ('google_aio','chatgpt','gemini','perplexity','claude');

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
  -- Frozen at start so a settings change mid-scan cannot leave a result
  -- claiming engines it never read.
  engines           scan_engine[] not null default '{google_aio}',
  gated_engines     scan_engine[] not null default '{}',
  engines_answered  scan_engine[],
  -- The second, email-gated pass over the same questions.
  gated_status      text not null default 'none'
                      check (gated_status in ('none','queued','running','complete','failed')),
  gated_error       text,
  gated_completed_at timestamptz,
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
  unique (scan_id, idx)
);

-- One row per question per engine. Whether an engine answered at all is a
-- measured fact and is stored as one: "did not answer" and "answered without
-- naming them" are different findings and must stay distinguishable.
create table scan_answers (
  id              uuid primary key default gen_random_uuid(),
  scan_id         uuid not null references scans(id) on delete cascade,
  question_id     uuid not null references scan_questions(id) on delete cascade,
  engine          scan_engine not null,
  answered        boolean not null default false,
  brand_named     boolean not null default false,
  error           text,
  cost            numeric(10,5) not null default 0,
  unique (question_id, engine)
);
create index on scan_answers (scan_id, engine);

create table scan_citations (
  id              uuid primary key default gen_random_uuid(),
  scan_id         uuid not null references scans(id) on delete cascade,
  question_id     uuid not null references scan_questions(id) on delete cascade,
  engine          scan_engine not null,
  source_domain   text not null,
  url             text,
  title           text,
  position        int
);
create index on scan_citations (scan_id, source_domain);

-- Leaderboard per engine. The overall leaderboard is the sum across engines,
-- computed on read, so "who does ChatGPT recommend" stays answerable.
create table scan_brands (
  id              uuid primary key default gen_random_uuid(),
  scan_id         uuid not null references scans(id) on delete cascade,
  engine          scan_engine not null,
  brand           text not null,
  mentions        int not null default 0,
  is_subject      boolean not null default false,
  unique (scan_id, engine, brand)
);
create index on scan_brands (scan_id, brand);

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
alter table scan_answers   enable row level security;
alter table scan_citations enable row level security;
alter table scan_brands    enable row level security;
alter table leads          enable row level security;
-- No policies. Server-side service role only, plus the RPC below.

-- ---------- the one public read path ----------
-- Teaser only. Exposes per-engine COUNTS and the top four sources, never the
-- brand list and never the full source list: that gap is what the email gate
-- trades on.
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
    'engines',          to_jsonb(s.engines),
    'engines_answered', to_jsonb(coalesce(s.engines_answered, '{}'::scan_engine[])),
    'of',           (select count(*) from scan_questions q where q.scan_id = s.id),

    -- Named anywhere: distinct questions where at least one engine named them.
    'named',        (select count(distinct a.question_id) from scan_answers a
                       where a.scan_id = s.id and a.brand_named),

    -- Per engine: how many questions it answered, and of those how many named
    -- the brand. An engine that answered nothing shows as answered 0, which is
    -- a measured absence rather than a zero score.
    'by_engine',    (select jsonb_agg(t order by t.engine) from (
                        select a.engine::text as engine,
                               count(*) filter (where a.answered) as answered,
                               count(*) filter (where a.brand_named) as named,
                               count(*) as asked
                        from scan_answers a
                        where a.scan_id = s.id
                        group by a.engine) t),

    -- Rank across the combined leaderboard, summing mentions over engines.
    'rank',         (select count(*) + 1 from (
                        select brand, sum(mentions) as m, bool_or(is_subject) as subj
                        from scan_brands where scan_id = s.id group by brand) agg
                       where agg.m > coalesce((select sum(mentions) from scan_brands b3
                              where b3.scan_id = s.id and b3.is_subject), 0)
                         and not agg.subj),
    'brand_count',  (select count(distinct brand) from scan_brands where scan_id = s.id),

    -- One row per (source, question, engine) before aggregating, so a source
    -- cited twice inside one answer counts once for that answer.
    'top_sources',  (select jsonb_agg(t) from (
                        select source_domain as source,
                               count(*) as mentions,
                               count(distinct engine) as engines,
                               sum(search_volume) as ai_search_volume,
                               bool_or(is_own) as is_own_domain
                        from (
                          select distinct c.source_domain, c.question_id, c.engine,
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
