-- 30 Sep 2026. Additive only. BRIEF-3 C0. APPLIED and read back 29 Sep (10 columns, 2 indexes, stripe_events RLS on, 14 client_domains at cluster_limit 10).
-- tracked_clusters already carries keyword_id (FK to tracked_keywords, from migration 2), so there is no tracked_keywords.cluster_id.
alter table public.client_domains add column if not exists cluster_limit int not null default 10 check (cluster_limit between 1 and 100);
alter table public.tracked_keywords add column if not exists search_volume int check (search_volume >= 0);
alter table public.tracked_keywords add column if not exists intent text check (intent in ('informational', 'navigational', 'commercial', 'transactional'));
create unique index if not exists tracked_clusters_one_live_per_keyword on public.tracked_clusters (keyword_id) where stopped_on is null and keyword_id is not null;
alter table public.tracked_questions add column if not exists angle text check (angle in ('category', 'positioning', 'sector', 'outcome', 'comparison'));
create index if not exists tracked_questions_cluster_live_idx on public.tracked_questions (cluster_id) where stopped_on is null;
alter table public.scans add column if not exists cluster_keyword text;
alter table public.scans add column if not exists cluster_keyword_volume int check (cluster_keyword_volume >= 0);
alter table public.scans add column if not exists cluster_keyword_intent text check (cluster_keyword_intent in ('informational', 'navigational', 'commercial', 'transactional'));
alter table public.scans add column if not exists cluster_keyword_rank int check (cluster_keyword_rank between 1 and 100);
alter table public.scans add column if not exists cluster_keyword_status text check (cluster_keyword_status in ('chosen', 'none_qualified', 'read_failed'));
create table if not exists public.stripe_events (id text primary key, type text not null, received_at timestamptz not null default now(), client_domain_id uuid references public.client_domains(id) on delete set null);
alter table public.stripe_events enable row level security;
