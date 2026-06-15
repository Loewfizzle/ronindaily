-- Add timezone column to push_subscriptions.
-- Stores the user's IANA timezone (e.g. 'America/New_York') so the cron job
-- can compare notification_time against the user's local time rather than UTC.

alter table public.push_subscriptions
  add column if not exists timezone text not null default 'America/New_York';

-- NOTE: Run this file in the Supabase SQL editor:
--   Dashboard → SQL Editor → paste contents → Run
