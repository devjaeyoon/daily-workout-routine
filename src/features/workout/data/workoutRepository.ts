import type { WorkoutSession } from '@/features/workout/model/types';
import { supabase } from '@/shared/lib/supabase';
import { isWorkoutExercises } from './workoutStorage';

type WorkoutSessionRow = {
  user_id: string;
  workout_date: string;
  exercises: unknown;
  created_at: string;
  updated_at: string;
};

function rowToSession(row: WorkoutSessionRow): WorkoutSession | null {
  if (!isWorkoutExercises(row.exercises)) return null;

  return {
    workoutDate: row.workout_date,
    exercises: row.exercises,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchWorkoutSessions(
  userId: string,
): Promise<WorkoutSession[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('workout_sessions')
    .select('user_id, workout_date, exercises, created_at, updated_at')
    .eq('user_id', userId)
    .order('workout_date', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as WorkoutSessionRow[])
    .map(rowToSession)
    .filter((session): session is WorkoutSession => session !== null);
}

export async function upsertWorkoutSession(
  userId: string,
  session: WorkoutSession,
): Promise<WorkoutSession> {
  if (!supabase) return session;

  const { data, error } = await supabase
    .from('workout_sessions')
    .upsert(
      {
        user_id: userId,
        workout_date: session.workoutDate,
        exercises: session.exercises,
        updated_at: session.updatedAt,
      },
      { onConflict: 'user_id,workout_date' },
    )
    .select('user_id, workout_date, exercises, created_at, updated_at')
    .single();

  if (error) throw error;

  return rowToSession(data as WorkoutSessionRow) ?? session;
}
