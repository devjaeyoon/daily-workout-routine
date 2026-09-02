import type {
  SetLog,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSessionsByDate,
} from '@/features/workout/model/types';

const STORAGE_KEY = 'daily-workout:sessions:v1';

type StoredWorkoutSessions = {
  version: 1;
  sessions: WorkoutSessionsByDate;
};

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSetLog(value: unknown): value is SetLog {
  if (!value || typeof value !== 'object') return false;
  const set = value as Partial<SetLog>;
  return (
    isNumber(set.setNumber) &&
    isNumber(set.weight) &&
    isNumber(set.reps) &&
    isNumber(set.rir) &&
    isNumber(set.restTime)
  );
}

function isWorkoutExercise(value: unknown): value is WorkoutExercise {
  if (!value || typeof value !== 'object') return false;
  const exercise = value as Partial<WorkoutExercise>;
  return (
    typeof exercise.id === 'string' &&
    typeof exercise.exerciseName === 'string' &&
    typeof exercise.category === 'string' &&
    Array.isArray(exercise.sets) &&
    exercise.sets.every(isSetLog)
  );
}

export function isWorkoutExercises(value: unknown): value is WorkoutExercise[] {
  return Array.isArray(value) && value.every(isWorkoutExercise);
}

function isWorkoutSession(value: unknown): value is WorkoutSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<WorkoutSession>;
  return (
    typeof session.workoutDate === 'string' &&
    typeof session.createdAt === 'string' &&
    typeof session.updatedAt === 'string' &&
    isWorkoutExercises(session.exercises)
  );
}

export function loadWorkoutSessions(): WorkoutSessionsByDate {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Partial<StoredWorkoutSessions>;
    if (
      parsed.version !== 1 ||
      !parsed.sessions ||
      typeof parsed.sessions !== 'object'
    ) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed.sessions).filter(
        ([date, session]) =>
          isWorkoutSession(session) && session.workoutDate === date,
      ),
    );
  } catch {
    return {};
  }
}

export function saveWorkoutSessions(
  sessions: WorkoutSessionsByDate,
): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const payload: StoredWorkoutSessions = {
      version: 1,
      sessions,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
