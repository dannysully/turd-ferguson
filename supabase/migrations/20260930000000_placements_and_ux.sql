-- Placements for alwaysmentioned / alwayscited / alwayseverywhere, in-app
-- upgrade prompts, and first-party usage events for UX review.
-- Additive only: new columns with defaults, new tables with RLS enabled here
-- and no policies, new indexes. No price or cost column anywhere, on purpose.

alter table accounts add column if not exists upsell_mode text not null default 'nomada'
  check (upsell_mode in ('nomada', 'agency', 'off'));
alter table accounts add column if not exists upsell_contact_email text;

create table if not exists tracked_clusters (
  id               uuid primary key default gen_random_uuid(),
  client_domain_id uuid not null references client_domains(id) on delete cascade,
  name             text not null check (char_length(name) between 2 and 120),
  keyword_id       uuid references tracked_keywords(id) on delete set null,
  -- Original check below. Danny widened it in production on 29 Sep 2026 to allow 'tracked' (danny.md line 100); not re-run from here.
  tier             text not null check (tier in ('mentioned', 'cited', 'everywhere')),
  started_on       date not null,
  stopped_on       date,
  created_at       timestamptz not null default now()
);
create index if not exists tracked_clusters_client_idx on tracked_clusters (client_domain_id);
alter table tracked_clusters enable row level security;

alter table tracked_questions add column if not exists cluster_id uuid references tracked_clusters(id) on delete set null;

create table if not exists placements (
  id               uuid primary key default gen_random_uuid(),
  client_domain_id uuid not null references client_domains(id) on delete cascade,
  cluster_id       uuid not null references tracked_clusters(id) on delete cascade,
  kind             text not null check (kind in ('guest_post', 'link_insertion', 'on_site', 'coverage')),
  url              text not null,
  url_key          text not null,
  domain           text not null,
  status           text not null default 'pitched'
    check (status in ('pitched', 'writing', 'scheduled', 'live', 'removed')),
  scheduled_on     date,
  live_on          date,
  anchor_text      text,
  internal_note    text,
  last_checked_on  date,
  link_present     boolean,
  created_by       text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists placements_client_live_idx on placements (client_domain_id, live_on);
create index if not exists placements_cluster_idx on placements (cluster_id);
create index if not exists placements_url_key_idx on placements (url_key);
alter table placements enable row level security;

create table if not exists cta_events (
  id               uuid primary key default gen_random_uuid(),
  client_domain_id uuid not null references client_domains(id) on delete cascade,
  member_email     text not null,
  cta              text not null check (cta in ('mentioned', 'cited', 'everywhere', 'pack', 'cluster')),
  action           text not null check (action in ('shown', 'clicked', 'asked', 'hidden')),
  trigger          jsonb not null default '{}',
  created_at       timestamptz not null default now()
);
create index if not exists cta_events_member_idx on cta_events (member_email, cta, created_at desc);
alter table cta_events enable row level security;

create table if not exists dashboard_events (
  id               bigint generated always as identity primary key,
  client_domain_id uuid references client_domains(id) on delete cascade,
  member_email     text,
  event            text not null check (char_length(event) between 2 and 60),
  path             text,
  props            jsonb not null default '{}',
  created_at       timestamptz not null default now()
);
create index if not exists dashboard_events_created_idx on dashboard_events (created_at desc);
alter table dashboard_events enable row level security;
