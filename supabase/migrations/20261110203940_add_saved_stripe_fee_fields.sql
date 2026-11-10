-- These fields were already expected by the webhook but missing from the live database.
-- Keep old amounts unknown until Stripe details are explicitly retrieved.
alter table public.orders add column if not exists stripe_charge_id text;
alter table public.orders add column if not exists stripe_fee_cents integer;
alter table public.orders add column if not exists stripe_net_cents integer;
