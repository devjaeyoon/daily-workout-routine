create table if not exists public.workout_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_date date not null,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, workout_date),
  constraint workout_sessions_exercises_is_array
    check (jsonb_typeof(exercises) = 'array')
);

alter table public.workout_sessions enable row level security;

revoke all on table public.workout_sessions from anon;
grant select, insert, update, delete on table public.workout_sessions
  to authenticated;

drop policy if exists "Users can read own workout sessions"
  on public.workout_sessions;
create policy "Users can read own workout sessions"
  on public.workout_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own workout sessions"
  on public.workout_sessions;
create policy "Users can insert own workout sessions"
  on public.workout_sessions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own workout sessions"
  on public.workout_sessions;
create policy "Users can update own workout sessions"
  on public.workout_sessions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own workout sessions"
  on public.workout_sessions;
create policy "Users can delete own workout sessions"
  on public.workout_sessions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
