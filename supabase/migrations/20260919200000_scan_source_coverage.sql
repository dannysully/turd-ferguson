-- How much of a scan's cited-source list was ever sorted.
--
-- Source classification is wrapped in never-fatal in pipeline.ts, which
-- AGENTS.md lists as a standing gotcha: the try/catch that stops a scan dying
-- also hides that it broke. When it breaks, no row lands in scan_sources, and
-- the consequence is not cosmetic - deriveOpportunities drops any cited page
-- whose kind is null, so a scan that classified nothing derives no placements
-- however many pages it cited. That is the half of the report a visitor trades
-- an email for.
--
-- 7408e7e made the report say so honestly rather than call the gap a finding.
-- What nothing does is count how often it happens, and one in fifty and one in
-- five want different answers. This is the count: two numbers per scan that the
-- ops page can print beside the cost.
--
-- Two grouped reads rather than the rows themselves. Citations are the one
-- per-scan table with no small bound - 564 on a single scan in production - so
-- fifty scans is tens of thousands of rows, past the PostgREST ceiling and far
-- too much to count in the page.
--
-- Additive: one create-or-replace of a function that does not exist yet, with
-- the revoke and grant the rest of this directory uses. It reads two tables and
-- writes nothing. No table, column, policy or row is touched, and a deploy
-- landing before this is applied gets a missing-function error from the RPC,
-- which the admin page renders as a dash rather than failing.
--
-- Authorised by Danny on 19 September 2026, in chat, awake: additive
-- migrations are the agent's to apply, destructive DDL is not.

create or replace function public.scan_source_coverage(p_scans uuid[])
returns table (scan_id uuid, cited_domains integer, classified_domains integer)
language sql
stable
set search_path = public
as $$
  select s.id,
         coalesce(cit.n, 0)::integer,
         coalesce(src.n, 0)::integer
    from scans s
    left join (
      select c.scan_id as sid, count(distinct c.source_domain) as n
        from scan_citations c
       where c.scan_id = any(p_scans)
         and coalesce(c.source_domain, '') <> ''
       group by c.scan_id
    ) cit on cit.sid = s.id
    left join (
      select k.scan_id as sid, count(distinct k.domain) as n
        from scan_sources k
       where k.scan_id = any(p_scans)
       group by k.scan_id
    ) src on src.sid = s.id
   where s.id = any(p_scans);
$$;

revoke all on function public.scan_source_coverage(uuid[]) from public;
grant execute on function public.scan_source_coverage(uuid[]) to service_role;

comment on function public.scan_source_coverage(uuid[]) is
  'Per scan, how many distinct domains the engines cited and how many of those have a kind stored. Equal is a sorted scan; a cited count with nothing classified is a silent classification failure, which produces a report with no placement list. Read by /admin/scans. Service role only.';
