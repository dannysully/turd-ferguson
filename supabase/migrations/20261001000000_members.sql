-- 1 Oct 2026. BRIEF-4 P0: dashboard membership history. Additive only (add column
-- if not exists, create index if not exists). APPLIED and read back by Danny on
-- 30 Sep. Do not re-apply.
alter table dashboard_members add column if not exists removed_at timestamptz;
alter table dashboard_members add column if not exists removed_by text;
alter table dashboard_members add column if not exists invited_by text;
alter table dashboard_members add column if not exists last_login_at timestamptz;
create index if not exists dashboard_members_live_email_idx
  on dashboard_members (email) where removed_at is null;
