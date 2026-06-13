CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  logged_date date NOT NULL,
  activity_id text NOT NULL,
  planned_amount numeric NOT NULL,
  actual_amount numeric NOT NULL,
  unit text NOT NULL,
  UNIQUE(user_id, logged_date, activity_id)
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own activity logs"
  ON activity_logs FOR ALL
  USING (auth.uid() = user_id);
