-- The rewrite ceiling needs a counter of its own.
--
-- /api/scan/[token]/questions bounds how many times one scan may have its
-- question set written before it runs anything. There is nothing else holding
-- that route: it is public, it takes one model call per request, and an
-- Anthropic call is not covered by daily_cost_cap_usd, which sums DataForSEO
-- spend only.
--
-- It counted off scans.anthropic_calls, and that column stopped meaning
-- "previews" the day the pipeline started billing onto it. A free pass writes
-- one call for the question set, one per engine for brand extraction, one to
-- judge the leaderboard and one for source kinds - so any scan that has run
-- is already past a ceiling of six. The visible effect is on the retry a
-- failed scan offers: the screen comes back, asks for its preview, and is
-- told "we have rewritten these a few times now" by somebody who has
-- rewritten nothing.
--
-- So the ceiling gets its own counter and anthropic_calls goes back to being
-- what the admin page reads it as: what this scan cost. The preview route
-- adds to both.
--
-- Additive: one column with a constant default, which Postgres records as
-- metadata rather than rewriting the table. Nothing is removed and nothing
-- changes meaning. Existing scans start at 0, which is correct for every one
-- of them - a scan that has already run cannot reach this route at all, and
-- one that has not has made no previews this column would be missing.
--
-- Authorised by Danny on 19 September 2026, in chat, awake: additive
-- migrations are the agent to apply, destructive DDL is not.

alter table scans add column if not exists preview_calls int not null default 0;

comment on column scans.preview_calls is
  'Model calls spent writing the question set before the scan ran. Bounds the rewrite ceiling in /api/scan/[token]/questions. Cost lives in anthropic_calls, which counts these too.';
