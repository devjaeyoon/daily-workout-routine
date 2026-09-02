begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(13);

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-000000000001', 'first@example.com'),
  ('00000000-0000-4000-8000-000000000002', 'second@example.com');

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000001';

select extensions.is(
  (
    public.upsert_workout_session_if_newer(
      '2026-09-01',
      '[{"weight": 10}]'::jsonb,
      '2026-09-01 01:00:00+00'::timestamptz
    )
  ).user_id,
  '00000000-0000-4000-8000-000000000001'::uuid,
  'the first insert belongs to the authenticated user'
);

select extensions.is(
  (
    select exercises
    from public.workout_sessions
    where workout_date = '2026-09-01'
  ),
  '[{"weight": 10}]'::jsonb,
  'the first insert stores the exercises'
);

select extensions.is(
  (
    select updated_at
    from public.workout_sessions
    where workout_date = '2026-09-01'
  ),
  '2026-09-01 01:00:00+00'::timestamptz,
  'the first insert stores the client timestamp'
);

select extensions.is(
  (
    public.upsert_workout_session_if_newer(
      '2026-09-01',
      '[{"weight": 20}]'::jsonb,
      '2026-09-01 02:00:00+00'::timestamptz
    )
  ).exercises,
  '[{"weight": 20}]'::jsonb,
  'a newer write returns the updated row'
);

select extensions.is(
  (
    select updated_at
    from public.workout_sessions
    where workout_date = '2026-09-01'
  ),
  '2026-09-01 02:00:00+00'::timestamptz,
  'a newer write updates the stored timestamp'
);

select extensions.is(
  (
    public.upsert_workout_session_if_newer(
      '2026-09-01',
      '[{"weight": 5}]'::jsonb,
      '2026-09-01 00:30:00+00'::timestamptz
    )
  ).exercises,
  '[{"weight": 20}]'::jsonb,
  'an older write returns the canonical row'
);

select extensions.is(
  (
    select exercises
    from public.workout_sessions
    where workout_date = '2026-09-01'
  ),
  '[{"weight": 20}]'::jsonb,
  'an older write does not change the stored row'
);

select extensions.is(
  (
    public.upsert_workout_session_if_newer(
      '2026-09-01',
      '[{"weight": 30}]'::jsonb,
      '2026-09-01 02:00:00+00'::timestamptz
    )
  ).exercises,
  '[{"weight": 20}]'::jsonb,
  'an equal timestamp returns the canonical row'
);

select extensions.is(
  (
    select exercises
    from public.workout_sessions
    where workout_date = '2026-09-01'
  ),
  '[{"weight": 20}]'::jsonb,
  'an equal timestamp does not change the stored row'
);

set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000002';

select extensions.is(
  (
    public.upsert_workout_session_if_newer(
      '2026-09-01',
      '[{"weight": 99}]'::jsonb,
      '2026-09-01 03:00:00+00'::timestamptz
    )
  ).user_id,
  '00000000-0000-4000-8000-000000000002'::uuid,
  'the function always writes for the current authenticated user'
);

select extensions.is(
  (
    with changed as (
      update public.workout_sessions
      set exercises = '[{"weight": 100}]'::jsonb
      where user_id = '00000000-0000-4000-8000-000000000001'
      returning 1
    )
    select count(*)::integer from changed
  ),
  0,
  'an authenticated user cannot update another user row'
);

reset role;

select extensions.is(
  (
    select exercises
    from public.workout_sessions
    where user_id = '00000000-0000-4000-8000-000000000001'
      and workout_date = '2026-09-01'
  ),
  '[{"weight": 20}]'::jsonb,
  'the first user row remains unchanged after the second user writes'
);

select extensions.is(
  (
    select exercises
    from public.workout_sessions
    where user_id = '00000000-0000-4000-8000-000000000002'
      and workout_date = '2026-09-01'
  ),
  '[{"weight": 99}]'::jsonb,
  'the second user receives a separate row'
);

select * from extensions.finish();

rollback;
