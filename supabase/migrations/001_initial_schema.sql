-- Ronin Daily — initial schema
-- Run this entire file in the Supabase SQL editor to set up the backend.

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id              uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  unit            text        NOT NULL CHECK (unit IN ('imperial', 'metric')),
  sex             text        NOT NULL CHECK (sex IN ('M', 'F')),
  age             integer     NOT NULL,
  height_cm       numeric     NOT NULL,
  start_weight    numeric     NOT NULL,
  goal_weight     numeric     NOT NULL,
  target_weeks    integer     NOT NULL,
  start_date      date        NOT NULL
);

CREATE TABLE IF NOT EXISTS checkins (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  user_id         uuid        REFERENCES profiles ON DELETE CASCADE NOT NULL,
  week_number     integer     NOT NULL,
  weight          numeric     NOT NULL,
  checked_in_at   timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_logs (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  user_id         uuid        REFERENCES profiles ON DELETE CASCADE NOT NULL,
  logged_date     date        NOT NULL,
  UNIQUE (user_id, logged_date)
);

-- ── Row Level Security ─────────────────────────────────────────────────────────

ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins   ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profile"
  ON profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage their own checkins"
  ON checkins FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own daily logs"
  ON daily_logs FOR ALL USING (auth.uid() = user_id);
