-- Add milestone_notifications_sent column to push_subscriptions.
-- Stores the day numbers (as text) of milestones already delivered to this user
-- so the cron job never sends the same milestone twice.

alter table public.push_subscriptions
  add column if not exists milestone_notifications_sent text[] not null default '{}';

-- NOTE: Run this file in the Supabase SQL editor:
--   Dashboard → SQL Editor → paste contents → Run
