-- 30 Sep 2026. Additive only. Pricing spec section 5 (R91): "Before payment: keyword target, sector, quantity,
-- work email. Stored as Stripe metadata and in a new orders table (additive migration, RLS on with no policies,
-- the service role writes)." NOT YET APPLIED: no code reads or writes this table until it is applied and read back.
-- One row per completed Checkout Session, written by the webhook (checkout.session.completed), keyed on the Session id
-- so a replayed event cannot write a second row.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  tier text not null check (tier in ('tracked', 'mentioned', 'cited')),
  sector text,
  quantity int not null check (quantity between 1 and 100),
  market text not null check (market in ('uk', 'us')),
  email text not null,
  keyword text,
  scan_token text,
  amount_total int check (amount_total >= 0),
  currency text check (currency in ('gbp', 'usd')),
  client_domain_id uuid references public.client_domains(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
