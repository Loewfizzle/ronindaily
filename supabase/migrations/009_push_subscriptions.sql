-- Push notification subscriptions.
-- One row per user. Unique on user_id so upsert replaces the subscription
-- when the browser rotates keys or the user re-subscribes.

create table if not exists public.push_subscriptions (
  id                uuid      primary key default gen_random_uuid(),
  user_id           uuid      not null references auth.users(id) on delete cascade,
  endpoint          text      not null,
  p256dh            text      not null,
  auth              text      not null,
  notification_time time      not null default '07:00:00',
  is_active         boolean   not null default true,
  created_at        timestamptz not null default now(),
  unique (user_id)
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id);

-- NOTE: Run this file in the Supabase SQL editor:
--   Dashboard → SQL Editor → paste contents → Run
