-- The free result carries the leaderboard and every source.
--
-- state.md is the intent: leaderboard, all sources and share of voice are
-- free, and only the placement opportunities sit behind the email. The teaser
-- deliberately omitted the leaderboard and sent only the top four sources, so
-- the UI had to blur the whole dashboard to hide them.
--
-- Additive: two new keys, nothing removed and nothing changed. top_sources
-- stays for anything still reading it, so a deploy landing before this is
-- applied keeps working.
--
--   brands      - the whole leaderboard, summed across engines, for the
--                 leaderboard table and share of voice.
--   all_sources - every cited source with its kind and note, so the source
--                 table is free rather than the top four.

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
    'named',        (select count(distinct a.question_id) from scan_answers a
                       where a.scan_id = s.id and a.brand_named),
    'by_engine',    (select jsonb_agg(t order by t.engine) from (
                        select a.engine::text as engine,
                               count(*) filter (where a.answered) as answered,
                               count(*) filter (where a.brand_named) as named,
                               count(*) as asked
                        from scan_answers a
                        where a.scan_id = s.id
                        group by a.engine) t),
    'rank',         (select count(*) + 1 from (
                        select brand, sum(mentions) as m, bool_or(is_subject) as subj
                        from scan_brands where scan_id = s.id group by brand) agg
                       where agg.m > coalesce((select sum(mentions) from scan_brands b3
                              where b3.scan_id = s.id and b3.is_subject), 0)
                         and not agg.subj),
    'brand_count',  (select count(distinct brand) from scan_brands where scan_id = s.id),

    -- NEW. The whole leaderboard, summed across engines. Free from here on.
    'brands',       (select jsonb_agg(t order by t.mentions desc) from (
                        select brand,
                               sum(mentions) as mentions,
                               bool_or(is_subject) as is_subject
                        from scan_brands
                        where scan_id = s.id
                        group by brand) t),

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

    -- NEW. Every cited source, same shape as top_sources, no limit.
    'all_sources',  (select jsonb_agg(t order by t.mentions desc) from (
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
                        group by d.source_domain) t),

    'total_sources',(select count(distinct source_domain)
                       from scan_citations where scan_id = s.id),
    'source_kinds', (select coalesce(jsonb_object_agg(k.kind, k.n), '{}'::jsonb) from (
                        select kind, count(*) as n from scan_sources
                        where scan_id = s.id group by kind) k),
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
