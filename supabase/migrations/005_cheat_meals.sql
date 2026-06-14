CREATE TABLE IF NOT EXISTS cheat_meals (
  id           uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   timestamptz  DEFAULT now(),
  user_id      uuid         REFERENCES profiles ON DELETE CASCADE NOT NULL,
  logged_date  date         NOT NULL,
  description  text,
  calories     integer      NOT NULL
);

ALTER TABLE cheat_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cheat meals"
  ON cheat_meals FOR ALL
  USING (auth.uid() = user_id);
