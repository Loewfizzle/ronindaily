-- Migration: 003_activities
-- Adds activity preferences column to user profiles.
--
-- Run manually via the Supabase dashboard SQL editor or psql:
--   psql postgresql://... -f supabase/migrations/003_activities.sql

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activities text[];
