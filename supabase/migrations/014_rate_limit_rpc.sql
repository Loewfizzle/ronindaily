-- Atomic rate-limit helper: replaces the non-atomic read-then-write pattern
-- in api/_rateLimit.ts. A single INSERT ... ON CONFLICT ... WHERE statement
-- ensures the check and increment happen atomically, so two concurrent requests
-- cannot both slip through at the daily limit boundary.
--
-- Returns TRUE if the request was allowed (count was below limit and has been
-- incremented), FALSE if the daily limit was already reached.
--
-- SECURITY DEFINER so the function runs as its owner (postgres) and can write
-- to api_usage regardless of the caller's RLS context.

create or replace function public.increment_api_usage(
  p_user_id  uuid,
  p_action   text,
  p_limit    int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count integer;
begin
  insert into public.api_usage (user_id, action, usage_date, count)
  values (p_user_id, p_action, current_date, 1)
  on conflict (user_id, action, usage_date)
  do update set count = api_usage.count + 1
  where api_usage.count < p_limit
  returning count into v_new_count;

  -- v_new_count is NULL when the conflict row was NOT updated (limit already reached).
  -- When the INSERT succeeded or the UPDATE ran, v_new_count holds the new count.
  return v_new_count is not null;
end;
$$;

grant execute on function public.increment_api_usage(uuid, text, int) to service_role;

-- NOTE: Run this file in the Supabase SQL editor:
--   Dashboard → SQL Editor → paste contents → Run
