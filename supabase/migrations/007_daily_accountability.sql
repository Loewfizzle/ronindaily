CREATE TABLE IF NOT EXISTS daily_accountability (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  logged_date date NOT NULL,
  result text NOT NULL CHECK (result IN ('complete', 'partial', 'failed')),
  calories_hit boolean DEFAULT false,
  movement_hit boolean DEFAULT false,
  UNIQUE(user_id, logged_date)
);

ALTER TABLE daily_accountability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own accountability logs" ON daily_accountability
  FOR ALL USING (auth.uid() = user_id);
