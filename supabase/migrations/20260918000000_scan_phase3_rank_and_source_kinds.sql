-- alwayscited free scan, phase 3: Google rank per question, and what kind of
-- site each source is.
-- Run against the `alwayscited` Supabase project. Never against nomada-dashboards.
--
-- Safe to run twice: every statement is guarded.

-- ---------- Google rank ----------
-- The AI Overview read is a full Google SERP at depth 20. The subject's own
-- organic position was in every one of those responses and thrown away.
-- Null means not in the top twenty, or not measured yet.
alter table scan_questions add column if not exists google_rank int;

-- ---------- what kind of site each source is ----------
-- own         the subject's own domain
-- competitor  a company selling the same thing to the same buyers
-- review      a review or directory site (G2, Capterra, Trustpilot). Reached
--             through reviews and listings, not placements
-- placement   a publication, blog or industry site an article can be placed on
-- other       community, encyclopaedia, government, marketplace, the engine's
--             own property
create table if not exists scan_sources (
  id        uuid primary key default gen_random_uuid(),
  scan_id   uuid not null references scans(id) on delete cascade,
  domain    text not null,
  kind      text not null check (kind in ('own','competitor','review','placement','other')),
  note      text,
  unique (scan_id, domain)
);
alter table scan_sources enable row level security;
-- No policies. The service role writes; scan_teaser is the only public reader.

-- ---------- the public read path, extended ----------
-- Same shape as before, plus: each of the top four sources carries its kind
-- and note, and source_kinds counts every classified source by kind so the
-- gate can say how many placement opportunities sit behind it.
-- Google rank is deliberately NOT here. Rankings are what the email buys.
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
    -- cited twice inside one answer counts once for that answer. The kind is
    -- one row per domain by construction, so max() just reads it.
    'top_sources',  (select jsonb_agg(t) from (
                        select d.source_domain as source,
                               count(*) as mentions,
                               count(distinct d.engine) as engines,
                               sum(d.search_volume) as ai_search_volume,
                               bool_or(d.is_own) as is_own_domain,
                               max(ss.kind) as kind,
                               max(ss.note) as note
                        from (
                          select distinct c.source_domain, c.question_id, c.engine,
                                 q.search_volume, (c.source_domain = s.domain) as is_own
                          from scan_citations c
                          join scan_questions q on q.id = c.question_id
                          where c.scan_id = s.id
                        ) d
                        left join scan_sources ss on ss.scan_id = s.id and ss.domain = d.source_domain
                        group by d.source_domain
                        order by count(*) desc, sum(d.search_volume) desc nulls last
                        limit 4) t),
    'total_sources',(select count(distinct source_domain)
                       from scan_citations where scan_id = s.id),

    -- How many sources of each kind, across every source not just the top four.
    'source_kinds', (select coalesce(jsonb_object_agg(k.kind, k.n), '{}'::jsonb) from (
                        select kind, count(*) as n from scan_sources
                        where scan_id = s.id group by kind) k),

    -- The questions themselves, with tallies but not the answers. Free on
    -- purpose: a number with no visible working is an assertion, and the list
    -- of questions a brand is missing from sells harder than its rank does.
    'questions',    (select jsonb_agg(t order by t.idx) from (
                        select q.idx, q.question, q.kind, q.search_volume,
                               count(*) filter (where a.answered)    as answered,
                               count(*) filter (where a.brand_named) as named
                        from scan_questions q
                        left join scan_answers a on a.question_id = q.id
                        where q.scan_id = s.id
                        group by q.idx, q.question, q.kind, q.search_volume) t)
  )
  from scans s where s.public_token = p_token;
$$;
revoke all on function public.scan_teaser(text) from public;
grant execute on function public.scan_teaser(text) to anon, authenticated;
