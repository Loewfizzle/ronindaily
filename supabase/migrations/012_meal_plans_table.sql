-- Auto-rotated weekly meal plans, generated every Monday by the rotate-meal-plan cron.
-- One row per user (unique on user_id). The cron upserts on user_id so each rotation
-- replaces the previous week's plan.

create table if not exists public.meal_plans (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  plan         jsonb       not null,
  generated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.meal_plans enable row level security;

create policy "meal_plans_select_own"
  on public.meal_plans for select
  using (auth.uid() = user_id);

-- Cron uses service role key (bypasses RLS). Users never insert/update directly.

-- Add meal_prefs column to profiles so the cron can read each user's preferences.
alter table public.profiles
  add column if not exists meal_prefs jsonb;

-- NOTE: Run this file in the Supabase SQL editor:
--   Dashboard → SQL Editor → paste contents → Run
