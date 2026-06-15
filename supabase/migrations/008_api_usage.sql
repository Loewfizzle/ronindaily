-- API usage tracking for server-side rate limiting.
-- Primary key on (user_id, action, usage_date) so upsert increments naturally.

create table if not exists public.api_usage (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  action      text not null,
  usage_date  date not null,
  count       integer not null default 1,
  unique (user_id, action, usage_date)
);

alter table public.api_usage enable row level security;

-- Users may only read their own rows
create policy "api_usage_select_own"
  on public.api_usage for select
  using (auth.uid() = user_id);

-- Users may insert their own rows
create policy "api_usage_insert_own"
  on public.api_usage for insert
  with check (auth.uid() = user_id);

-- Users may update their own rows (to increment count)
create policy "api_usage_update_own"
  on public.api_usage for update
  using (auth.uid() = user_id);

-- NOTE: Run this file in the Supabase SQL editor:
--   Dashboard → SQL Editor → paste contents → Run
