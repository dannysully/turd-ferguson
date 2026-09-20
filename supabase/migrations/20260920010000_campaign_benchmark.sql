-- The campaign benchmark: a campaign, its coverage list, and its readings.
--
-- Danny accepted six proposals for this on 20 September 2026 - "your six
-- proposals are accepted, take them" - against the six questions recorded in
-- docs/blocked.md on 19 September at 08:40. This migration is proposals 1, 2,
-- 4 and 5. Proposal 3, the fixed prompt template, is code and lives in
-- src/lib/coverage/prompts.ts with a test that pins the five strings.
-- Proposal 6, the email field, is deliberately not here: taking an address for
-- a report that cannot be produced is the one thing that page must not do, so
-- the column goes in when the sending does, together with its line in the
-- privacy policy.
--
-- ## Why a reading is a scan row rather than a table of its own
--
-- Proposals 4 and 5 were "does it reuse the scan's engine set" and "is it rate
-- limited, and by what". Danny answered both with the scan's own: the scan's
-- engine set, and the same IP-hash and daily-cap shape. Taken together those
-- are not two settings to copy across - they say a reading IS a scan. So there
-- is no campaign_readings table. `scans.campaign_id` points a scan at the
-- campaign it was run for, and everything the scan already has comes with it:
-- the frozen engine set, the question and answer and citation tables, the
-- spend columns, the ip_hash, and every ceiling in spend.ts that reads them.
--
-- A second table would have meant a second set of ceilings, and the day this
-- repo has spent on holes in the first set is the argument against having two.
--
-- ## Proposal 2: a re-run writes a new reading
--
-- The campaign id is the stable thing. A re-run inserts a NEW scans row
-- against the same campaign_id and never touches the old one, which is what
-- makes "ask the same five again after the campaign" a comparison rather than
-- an overwrite. The board's promise - a dated starting line - is only worth
-- anything if the first reading is still there afterwards.
--
-- Nothing in this migration can edit a past reading, and that is on purpose:
-- the delete rule on campaign_id is `set null`, not `cascade`. Removing a
-- campaign must not take its readings with it. They are dated measurements
-- that were true when they were taken, and a scan that has lost its campaign
-- is still a scan somebody ran.
--
-- ## Proposal 1: where the uploaded coverage list lives
--
-- Its own table, not a JSONB column, because a re-run has to compare against
-- the same list. A column would be edited in place by the next upload and the
-- earlier reading's comparison would quietly change meaning months later. Rows
-- are appended and dated instead, so what a given reading was judged against
-- can still be reconstructed from added_at.
--
-- source_domain is stored beside the url rather than derived at read time. The
-- match that matters is "did an engine cite a page we placed", which is done
-- on the domain, and the pipeline already learned this week that parsing a URL
-- in steps is where a domain quietly becomes a different company's.
--
-- Additive only. Two new tables, one nullable column, and a foreign key every
-- existing row satisfies because every existing row has null. Danny authorised
-- additive migrations in chat on 19 September 2026, awake, after the absence
-- of any restore in this setup was put to him in plain terms. Everything
-- destructive stays absolute.

create table if not exists campaigns (
  id              uuid primary key default gen_random_uuid(),
  -- The credential the results page reads by, the same shape scans use.
  public_token    text not null unique default encode(gen_random_bytes(16),'hex'),
  -- The four inputs the board collects. brand and topic fill the prompt
  -- template; segment is optional and the category question asks its broader
  -- form without it, which is a worse question but still a real one.
  brand           text not null,
  domain          text not null,
  topic           text not null,
  segment         text,
  market          text check (market in ('UK','US')),
  -- Proposal 5. Same hash and same shape as scans.ip_hash, so the per-address
  -- limit can be counted across both without two ways of identifying a caller.
  ip_hash         text,
  created_at      timestamptz not null default now()
);

-- A re-run is found by what was typed, not by asking the visitor to keep a
-- token. Matches the (domain, topic, market) lookup shape scans already uses
-- for the domain cache.
create index if not exists campaigns_lookup_idx
  on campaigns (domain, topic, market, created_at desc);
-- Supports the per-address limit, which runs before anything is paid for.
create index if not exists campaigns_ip_idx
  on campaigns (ip_hash, created_at desc);

create table if not exists campaign_coverage (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns(id) on delete cascade,
  url             text not null,
  -- The registrable domain of url, stored rather than derived, because the
  -- comparison against a cited source is made on this.
  source_domain   text not null,
  -- Appended and dated, never edited. This is what lets a reading taken in
  -- March still be understood in June: the list as it stood then is the rows
  -- whose added_at is before that reading.
  added_at        timestamptz not null default now()
);

create index if not exists campaign_coverage_campaign_idx
  on campaign_coverage (campaign_id, added_at);
-- The join the comparison actually makes: did any cited source match a
-- domain we placed.
create index if not exists campaign_coverage_domain_idx
  on campaign_coverage (campaign_id, source_domain);

-- A reading. Null for every scan that exists today and for every free scan
-- from now on, which is why it is nullable and why the foreign key is
-- satisfied by the whole table as it stands.
--
-- `on delete set null` rather than cascade, for the reason written above: a
-- reading outlives its campaign.
alter table scans add column if not exists campaign_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'scans_campaign_id_fkey'
  ) then
    alter table scans
      add constraint scans_campaign_id_fkey
      foreign key (campaign_id) references campaigns(id) on delete set null;
  end if;
end
$$;

comment on column scans.campaign_id is
  'The campaign this scan is a reading of, or null for an ordinary free scan. '
  'A re-run inserts a new row against the same campaign rather than editing '
  'this one, so the earlier reading survives to be compared against.';

-- Every reading of one campaign, newest first. Partial, because the rows this
-- is ever asked about are the tiny minority that belong to a campaign.
create index if not exists scans_campaign_idx
  on scans (campaign_id, created_at desc)
  where campaign_id is not null;

-- Deny by default, exactly as every other table in this schema does: RLS on,
-- no policies, service role only. This is not a change to anyone's access - it
-- is how these two tables are born, and the alternative is two new tables
-- readable by the anon key.
alter table campaigns          enable row level security;
alter table campaign_coverage  enable row level security;
