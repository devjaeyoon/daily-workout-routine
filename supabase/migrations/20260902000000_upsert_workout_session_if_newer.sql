create or replace function public.upsert_workout_session_if_newer(
  p_workout_date date,
  p_exercises jsonb,
  p_updated_at timestamptz
)
returns public.workout_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_session public.workout_sessions;
begin
  insert into public.workout_sessions as current_session (
    user_id,
    workout_date,
    exercises,
    updated_at
  )
  values (
    (select auth.uid()),
    p_workout_date,
    p_exercises,
    p_updated_at
  )
  on conflict (user_id, workout_date) do update
    set exercises = excluded.exercises,
        updated_at = excluded.updated_at
    where current_session.updated_at < excluded.updated_at
  returning current_session.* into saved_session;

  if saved_session.user_id is null then
    select current_session.*
    into saved_session
    from public.workout_sessions as current_session
    where current_session.user_id = (select auth.uid())
      and current_session.workout_date = p_workout_date;
  end if;

  return saved_session;
end;
$$;

revoke all on function public.upsert_workout_session_if_newer(
  date,
  jsonb,
  timestamptz
) from public, anon;

grant execute on function public.upsert_workout_session_if_newer(
  date,
  jsonb,
  timestamptz
) to authenticated;
