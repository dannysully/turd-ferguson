-- 27 September 2026. Additive only. R41, part of the search-volume reversal
-- (Danny, 27 Sep 2026 - docs/rules.md, "Search volume returns, at keyword
-- level").
--
-- scan_questions.target_keyword: the one derived Google head keyword chosen
--   for the question (R39) - e.g. "business cash flow finance providers".
-- scan_questions.keyword_rank: the scan domain's position for that keyword in
--   one organic SERP read, depth 20, in the scan's market (R40). Null when it
--   is not in the top 20, or when the read did not run.
-- scan_questions.search_volume already exists and is reused for the keyword's
--   monthly searches; it needs no DDL.
--
-- NOT YET APPLIED when committed: this run had no apply path (no supabase CLI,
-- no psql). Every statement is idempotent, so applying it in the SQL editor
-- and replaying it later are both safe. No code writes or reads these columns
-- until it has been applied and read back.
alter table public.scan_questions add column if not exists target_keyword text;
alter table public.scan_questions add column if not exists keyword_rank integer check (keyword_rank between 1 and 100);
