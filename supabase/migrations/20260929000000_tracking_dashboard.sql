-- alwaystracked: daily tracking and the client dashboard.
-- Additive only: new columns with defaults, new tables with RLS enabled in
-- this migration and no policies (service role is the only reader/writer,
-- as everywhere else), new indexes. Nothing dropped, renamed or retyped;
-- no existing table's RLS touched; auth and storage schemas untouched.

alter table client_domains add column if not exists slug text unique;
alter table client_domains add column if not exists status text not null default 'active'
  check (status in ('active', 'paused', 'ended'));
alter table client_domains add column if not exists tier text not null default 'tracked'
  check (tier in ('tracked', 'mentioned', 'cited', 'everywhere'));
alter table client_domains add column if not exists question_limit int not null default 20;
alter table client_domains add column if not exists keyword_limit int not null default 10;
alter table client_domains add column if not exists started_on date;
alter table client_domains add column if not exists brand_aliases text[] not null default '{}';
alter table client_domains add column if not exists source_scan_id uuid references scans(id) on delete set null;

create table if not exists tracked_questions (
  id              uuid primary key default gen_random_uuid(),
  client_domain_id uuid not null references client_domains(id) on delete cascade,
  text            text not null check (char_length(text) between 8 and 300),
  source          text not null default 'client' check (source in ('scan', 'client', 'nomada')),
  added_on        date not null,
  stopped_on      date,
  added_by        text,
  stopped_by      text,
  created_at      timestamptz not null default now()
);
create index if not exists tracked_questions_client_idx on tracked_questions (client_domain_id) where stopped_on is null;
alter table tracked_questions enable row level security;

create table if not exists tracked_keywords (
  id              uuid primary key default gen_random_uuid(),
  client_domain_id uuid not null references client_domains(id) on delete cascade,
  keyword         text not null check (char_length(keyword) between 2 and 120),
  added_on        date not null,
  stopped_on      date,
  added_by        text,
  stopped_by      text,
  created_at      timestamptz not null default now()
);
create index if not exists tracked_keywords_client_idx on tracked_keywords (client_domain_id) where stopped_on is null;
alter table tracked_keywords enable row level security;

create table if not exists tracking_runs (
  id              uuid primary key default gen_random_uuid(),
  client_domain_id uuid not null references client_domains(id) on delete cascade,
  run_date        date not null,
  status          text not null default 'queued' check (status in ('queued', 'running', 'complete', 'partial', 'failed')),
  engines         text[] not null,
  dfs_cost        numeric(10,4) not null default 0,
  model_calls     int not null default 0,
  step_ms         jsonb,
  error           text,
  started_at      timestamptz,
  finished_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (client_domain_id, run_date)
);
alter table tracking_runs enable row level security;

create table if not exists tracking_answers (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null references tracking_runs(id) on delete cascade,
  client_domain_id uuid not null references client_domains(id) on delete cascade,
  run_date        date not null,
  question_id     uuid not null references tracked_questions(id) on delete cascade,
  engine          text not null check (engine in ('google_aio', 'chatgpt', 'gemini', 'perplexity', 'claude')),
  answered        boolean not null,
  named           boolean not null default false,
  response_text   text,
  brands          jsonb not null default '[]',
  citations       jsonb not null default '[]',
  cost            numeric(10,4) not null default 0,
  created_at      timestamptz not null default now(),
  unique (run_id, question_id, engine)
);
create index if not exists tracking_answers_client_date_idx on tracking_answers (client_domain_id, run_date);
create index if not exists tracking_answers_question_idx on tracking_answers (question_id, run_date);
alter table tracking_answers enable row level security;

create table if not exists tracking_serp (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null references tracking_runs(id) on delete cascade,
  client_domain_id uuid not null references client_domains(id) on delete cascade,
  run_date        date not null,
  keyword_id      uuid not null references tracked_keywords(id) on delete cascade,
  position        int,
  url             text,
  cost            numeric(10,4) not null default 0,
  created_at      timestamptz not null default now(),
  unique (run_id, keyword_id)
);
create index if not exists tracking_serp_client_date_idx on tracking_serp (client_domain_id, run_date);
alter table tracking_serp enable row level security;

create table if not exists tracking_notes (
  id              uuid primary key default gen_random_uuid(),
  client_domain_id uuid not null references client_domains(id) on delete cascade,
  note_date       date not null,
  text            text not null check (char_length(text) between 1 and 200),
  question_id     uuid references tracked_questions(id) on delete set null,
  author_email    text not null,
  created_at      timestamptz not null default now()
);
create index if not exists tracking_notes_client_idx on tracking_notes (client_domain_id, note_date);
alter table tracking_notes enable row level security;

create table if not exists dashboard_members (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references accounts(id) on delete cascade,
  email           text not null,
  name            text,
  role            text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  created_at      timestamptz not null default now(),
  unique (account_id, email)
);
alter table dashboard_members enable row level security;

create table if not exists dashboard_login_tokens (
  token_hash      text primary key,
  email           text not null,
  ip_hash         text,
  expires_at      timestamptz not null,
  used_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists dashboard_login_tokens_email_idx on dashboard_login_tokens (email, created_at desc);
alter table dashboard_login_tokens enable row level security;

create table if not exists dashboard_sessions (
  token_hash      text primary key,
  email           text not null,
  expires_at      timestamptz not null,
  last_seen_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
alter table dashboard_sessions enable row level security;

insert into app_settings (key, value) values
  ('tracking_enabled', 'true'::jsonb),
  ('tracking_daily_cost_cap_usd', '25'::jsonb)
on conflict (key) do nothing;
