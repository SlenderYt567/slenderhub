-- Enrich the existing checkout sessions so the admin dashboard can display
-- real product and delivery information. Historical sessions remain readable.
begin;
alter table public.chat_sessions
  add column if not exists cart_items jsonb not null default '[]'::jsonb,
  add column if not exists contact_email text,
  add column if not exists roblox_username text,
  add column if not exists payment_method text,
  add column if not exists delivery_status text not null default 'pending',
  add column if not exists verified_at timestamptz;
alter table public.chat_sessions
  add constraint chat_sessions_delivery_status_valid
  check (delivery_status in ('pending', 'delivering', 'delivered', 'cancelled'));
create index if not exists chat_sessions_created_at_idx on public.chat_sessions (created_at desc);
create index if not exists chat_sessions_payment_status_idx on public.chat_sessions (payment_status, created_at desc);
notify pgrst, 'reload schema';
commit;
