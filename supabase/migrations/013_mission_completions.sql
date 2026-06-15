-- Mission completion log — one row per completed mission per user.
-- Intentionally NOT deleted by handleReset (Start Over). This is the permanent record.
-- Deduplication: unique on (user_id, mission_start_date) prevents double-counting.

create table mission_completions (
  id                 uuid          primary key default gen_random_uuid(),
  user_id            uuid          not null references auth.users(id) on delete cascade,
  completed_at       timestamptz   not null default now(),
  mission_start_date date          null,
  lost_amount        numeric(6,2)  null,
  unit               text          null,
  constraint mission_completions_once_per_mission
    unique (user_id, mission_start_date)
);

alter table mission_completions enable row level security;

create policy "Users can read own mission completions"
  on mission_completions for select
  using (auth.uid() = user_id);

create policy "Users can insert own mission completions"
  on mission_completions for insert
  with check (auth.uid() = user_id);
