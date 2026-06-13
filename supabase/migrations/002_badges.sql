CREATE TABLE IF NOT EXISTS badges (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id    uuid        REFERENCES profiles ON DELETE CASCADE NOT NULL,
  badge_id   text        NOT NULL,
  earned_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY 'Users can manage their own badges'
  ON badges FOR ALL
  USING (auth.uid() = user_id);
