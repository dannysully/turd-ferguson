-- R159 part 3 (Danny, 1 Oct 2026, danny.md line 159): one app_settings flag
-- per lifecycle email, all off. Danny turns each on only after approving its
-- preview at /admin/emails. Additive: rows only, and an existing row is kept.
-- The code reads a missing row as off, so this landing after the deploy is harmless.
insert into app_settings (key, value) values
  ('email_welcome_enabled', 'false'::jsonb),
  ('email_setup_reminder_enabled', 'false'::jsonb),
  ('email_setup_confirmed_enabled', 'false'::jsonb),
  ('email_first_reading_enabled', 'false'::jsonb),
  ('email_invite_enabled', 'false'::jsonb),
  ('email_plan_ended_enabled', 'false'::jsonb)
on conflict (key) do nothing;
