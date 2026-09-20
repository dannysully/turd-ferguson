-- The free result listed every page every answer cited, and it was too long.
--
-- Danny, on a live result, 20 Sep 2026 (item 4): "Show only the first-cited
-- source per prompt response, then dedupe by domain across the list."
--
-- scan_citations already carries `position`, so this needs no new data and the
-- pass writes exactly what it wrote before. It is a display filter living in
-- the view, which is the whole point: the unlock payload, the coverage count
-- and the campaign reading all read the same table and none of them may start
-- seeing a truncated set.
--
-- ## What "per prompt response" means here
--
-- Per question AND per engine, not per question. Fourteen questions across four
-- engines is up to 56 answers, so up to 56 first-sources before the dedupe by
-- domain - and it is the dedupe that makes the list short. Without it this
-- barely shrinks.
--
-- ## Why `distinct on` rather than `where position = 1`
--
-- `position` is assigned in `citationsOf` as `out.length + 1`, so it is 1-based
-- and contiguous per answer, and `position = 1` is well defined today. It is
-- not robust to the one thing this table is known to do: scan_citations has no
-- unique constraint and cannot enforce one, and a retried reading has already
-- once written a second full set of rows for the same (question, engine) - the
-- correction carried at the top of the working notes. Two rows would then both
-- be position 1, from different passes, and `where position = 1` would hand two
-- domains to one prompt response.
--
--   distinct on (c.question_id, c.engine) ... order by c.question_id, c.engine,
--                                                    c.position, c.id
--
-- returns exactly one row per response whatever the table holds, which is what
-- the sentence "the first-cited source per prompt response" actually says. The
-- `c.id` tiebreak makes it deterministic when a retry duplicated position 1:
-- the earlier row wins, which is the pass that was read first.
--
-- ## What position 1 is, and what it is not
--
-- It is order of citation, not importance. On AI Overviews the order tracks
-- prominence reasonably well; on a chat engine it may be nothing more than
-- order of mention. Nothing rendered from this may call it "the top source" or
-- imply a ranking - the copy shipped alongside says what it is: the source that
-- answer reached for first. `mentions` on these rows is no longer "answers it
-- fed", it is "answers that reached for it first", and the column header
-- changes with it.
--
-- ## What is deliberately NOT filtered
--
--   * `total_sources` - still count(distinct source_domain) over every citation
--     row. It is the denominator behind "the rest come with the report", and
--     that sentence is only true because the unlock payload is unfiltered.
--   * buildUnlockPayload in src/lib/scan/unlock.ts - reads scan_citations
--     directly, no position anywhere in it.
--   * the campaign benchmark and the coverage count - different readers of the
--     same table, untouched.
--
-- `src/lib/supabase/citations.test.mts` holds that split, so the day something
-- else grows a position filter it fails rather than quietly shortening a list
-- somebody paid for.
--
-- ## Also in this replacement: ai_search_volume comes out
--
-- The search volume step was removed earlier today, so `scan_questions
-- .search_volume` is null on every scan from here on and this function was
-- summing nulls into a key nothing renders. The join to scan_questions existed
-- only to reach that column and goes with it. `top_sources` ordered by that sum
-- as its tiebreak; it now falls back to the domain name, which is arbitrary but
-- stable, where a sum of nulls was arbitrary and not.
--
-- Additive per the 19 Sep carve-out: create or replace, no schema change, no
-- data touched. A deploy landing either side of this is harmless - the keys
-- that change are already `number | null` on the client, and a shorter list is
-- a shorter list.

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

    -- CHANGED: q.search_volume is gone with the search volume step.
    'questions',    (select jsonb_agg(t order by t.idx) from (
                        select q.idx, q.question, q.kind, q.google_rank,
                               count(*) filter (where a.answered)    as answered,
                               count(*) filter (where a.brand_named) as named
                        from scan_questions q
                        left join scan_answers a on a.question_id = q.id
                        where q.scan_id = s.id
                        group by q.idx, q.question, q.kind, q.google_rank) t)
  )
  from scans s where s.public_token = p_token;
$$;
revoke all on function public.scan_teaser(text) from public;
grant execute on function public.scan_teaser(text) to anon, authenticated;
