-- 27 September 2026. Additive only: create or replace, no schema change, no
-- data touched. R41/R43, the search-volume reversal (Danny, 27 Sep 2026 -
-- docs/rules.md, "Search volume returns, at keyword level").
--
-- The free result's question rows gain the three keyword fields the pipeline
-- now writes (20260927000000_question_target_keyword.sql added two of the
-- columns; search_volume already existed): target_keyword, search_volume and
-- keyword_rank. The result screen shows "<keyword> - <volume>/mo - <rank>"
-- where target_keyword is set, and the old question-level Google line where
-- it is not - which is every scan before this shipped, since there is no
-- backfill.
--
-- Everything else is 20260920030000_teaser_first_cited.sql verbatim. A deploy
-- landing either side of this is harmless: the client reads the three keys as
-- optional and falls back to the unlock payload, then to the old line.

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
    'leaderboard_partial', coalesce(s.leaderboard_partial, false),
    'brands',       (select jsonb_agg(t order by t.mentions desc) from (
                        select brand,
                               sum(mentions) as mentions,
                               bool_or(is_subject) as is_subject
                        from scan_brands
                        where scan_id = s.id
                        group by brand) t),

    -- CHANGED: one citation per prompt response, the one that answer reached
    -- for first, then deduped by domain. See the header.
    'top_sources',  (select jsonb_agg(t) from (
                        select d.source_domain as source,
                               count(*) as mentions,
                               count(distinct d.engine) as engines,
                               bool_or(d.is_own) as is_own_domain,
                               max(ss.kind) as kind,
                               max(ss.note) as note
                        from (
                          select distinct on (c.question_id, c.engine)
                                 c.source_domain, c.question_id, c.engine,
                                 (c.source_domain = s.domain) as is_own
                          from scan_citations c
                          where c.scan_id = s.id
                          order by c.question_id, c.engine, c.position, c.id
                        ) d
                        left join scan_sources ss on ss.scan_id = s.id and ss.domain = d.source_domain
                        group by d.source_domain
                        order by count(*) desc, d.source_domain
                        limit 4) t),

    'all_sources',  (select jsonb_agg(t order by t.mentions desc, t.source) from (
                        select d.source_domain as source,
                               count(*) as mentions,
                               count(distinct d.engine) as engines,
                               bool_or(d.is_own) as is_own_domain,
                               max(ss.kind) as kind,
                               max(ss.note) as note
                        from (
                          select distinct on (c.question_id, c.engine)
                                 c.source_domain, c.question_id, c.engine,
                                 (c.source_domain = s.domain) as is_own
                          from scan_citations c
                          where c.scan_id = s.id
                          order by c.question_id, c.engine, c.position, c.id
                        ) d
                        left join scan_sources ss on ss.scan_id = s.id and ss.domain = d.source_domain
                        group by d.source_domain) t),

    -- UNCHANGED, deliberately: every cited domain, not the first-cited ones.
    -- This is the denominator behind "the rest come with the report".
    'total_sources',(select count(distinct source_domain)
                       from scan_citations where scan_id = s.id),
    'source_kinds', (select coalesce(jsonb_object_agg(k.kind, k.n), '{}'::jsonb) from (
                        select kind, count(*) as n from scan_sources
                        where scan_id = s.id group by kind) k),

    -- CHANGED: the derived keyword, its volume and the domain's rank for it.
    'questions',    (select jsonb_agg(t order by t.idx) from (
                        select q.idx, q.question, q.kind, q.google_rank,
                               q.target_keyword, q.search_volume, q.keyword_rank,
                               count(*) filter (where a.answered)    as answered,
                               count(*) filter (where a.brand_named) as named
                        from scan_questions q
                        left join scan_answers a on a.question_id = q.id
                        where q.scan_id = s.id
                        group by q.idx, q.question, q.kind, q.google_rank,
                                 q.target_keyword, q.search_volume, q.keyword_rank) t)
  )
  from scans s where s.public_token = p_token;
$$;
revoke all on function public.scan_teaser(text) from public;
grant execute on function public.scan_teaser(text) to anon, authenticated;
