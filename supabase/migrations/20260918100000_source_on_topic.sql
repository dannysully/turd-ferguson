-- Phase 3a: is the CITED PAGE about the category, or just the domain?
--
-- The first real scan put racingpost.com, infrastructureinvestor.com and a
-- shoe-trends piece on wwd.com into a client's placement opportunities. None
-- of those are wrong about the domain - they are all publications. They are
-- wrong about the page. The engines cited them for something unrelated.
--
-- kind stays what the SITE is. on_topic records whether the pages actually
-- cited are about this category, which is what decides placeability.
--
-- Null means "not assessed" - every row written before this column existed.
-- Readers treat null as includable so existing scans keep working; only an
-- explicit false removes a row from the opportunity list.

alter table scan_sources
  add column if not exists on_topic boolean;

comment on column scan_sources.on_topic is
  'True when the cited pages are about the scan''s category. False when the domain was cited for something unrelated. Null for rows classified before this column existed.';
