CREATE TABLE IF NOT EXISTS activity_totals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  activity_id text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  UNIQUE(user_id, activity_id)
);

ALTER TABLE activity_totals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own activity totals" ON activity_totals
  FOR ALL USING (auth.uid() = user_id);
