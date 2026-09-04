import type {
  SetLog,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSessionsByDate,
} from '@/features/workout/model/types';

export const WORKOUT_SESSIONS_STORAGE_KEY =
  'daily-workout:sessions:v2';
export const LEGACY_WORKOUT_SESSIONS_STORAGE_KEY =
  'daily-workout:sessions:v1';

export type WorkoutSessionOwner =
  | { kind: 'guest' }
  | { kind: 'user'; userId: string };

export type WorkoutSessionCache = {
  version: 2;
  owner: WorkoutSessionOwner;
  sessions: WorkoutSessionsByDate;
};

export type WorkoutSessionCacheLoadResult = {
  cache: WorkoutSessionCache;
  persisted: boolean;
  storageError: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSetLog(value: unknown): value is SetLog {
  if (!isRecord(value)) return false;

  return (
    isNumber(value.setNumber) &&
    isNumber(value.weight) &&
    isNumber(value.reps) &&
    isNumber(value.rir) &&
    isNumber(value.restTime)
  );
}

function isWorkoutExercise(value: unknown): value is WorkoutExercise {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.exerciseName === 'string' &&
    typeof value.category === 'string' &&
    Array.isArray(value.sets) &&
    value.sets.every(isSetLog)
  );
}

export function isWorkoutExercises(value: unknown): value is WorkoutExercise[] {
  return Array.isArray(value) && value.every(isWorkoutExercise);
}

function isWorkoutSession(value: unknown): value is WorkoutSession {
  if (!isRecord(value)) return false;

  return (
    typeof value.workoutDate === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    isWorkoutExercises(value.exercises)
  );
}

function parseSessions(value: unknown): WorkoutSessionsByDate | null {
  if (!isRecord(value)) return null;

  const sessions: WorkoutSessionsByDate = {};
  for (const [date, session] of Object.entries(value)) {
    if (isWorkoutSession(session) && session.workoutDate === date) {
      sessions[date] = session;
    }
  }

  return sessions;
}

function parseOwner(value: unknown): WorkoutSessionOwner | null {
  if (!isRecord(value)) return null;
  if (value.kind === 'guest') return { kind: 'guest' };
  if (
    value.kind === 'user' &&
    typeof value.userId === 'string' &&
    value.userId.length > 0
  ) {
    return { kind: 'user', userId: value.userId };
  }

  return null;
}

function parseCache(raw: string | null): WorkoutSessionCache | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 2) return null;

    const owner = parseOwner(parsed.owner);
    const sessions = parseSessions(parsed.sessions);
    if (!owner || !sessions) return null;

    return { version: 2, owner, sessions };
  } catch {
    return null;
  }
}

function parseLegacySessions(
  raw: string | null,
): WorkoutSessionsByDate | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return null;
    return parseSessions(parsed.sessions);
  } catch {
    return null;
  }
}

export function saveWorkoutSessionCache(
  cache: WorkoutSessionCache,
): boolean {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(
      WORKOUT_SESSIONS_STORAGE_KEY,
      JSON.stringify(cache),
    );
  } catch {
    return false;
  }

  try {
    window.localStorage.removeItem(LEGACY_WORKOUT_SESSIONS_STORAGE_KEY);
  } catch {
    // The v2 cache is already durable. A stale v1 payload is safe to retry later.
  }

  return true;
}

export function loadWorkoutSessionCache(
  initialOwner: WorkoutSessionOwner,
): WorkoutSessionCacheLoadResult {
  const emptyCache: WorkoutSessionCache = {
    version: 2,
    owner: initialOwner,
    sessions: {},
  };

  if (typeof window === 'undefined') {
    return { cache: emptyCache, persisted: false, storageError: false };
  }

  let storedCache: WorkoutSessionCache | null;
  let legacySessions: WorkoutSessionsByDate | null;

  try {
    storedCache = parseCache(
      window.localStorage.getItem(WORKOUT_SESSIONS_STORAGE_KEY),
    );
    if (storedCache) {
      return {
        cache: storedCache,
        persisted: true,
        storageError: false,
      };
    }

    legacySessions = parseLegacySessions(
      window.localStorage.getItem(LEGACY_WORKOUT_SESSIONS_STORAGE_KEY),
    );
  } catch {
    return { cache: emptyCache, persisted: false, storageError: true };
  }

  const cache: WorkoutSessionCache = {
    ...emptyCache,
    sessions: legacySessions ?? {},
  };
  const persisted = saveWorkoutSessionCache(cache);

  return {
    cache,
    persisted,
    storageError: !persisted,
  };
}

export function isEmptyWorkoutSessionCache(
  cache: WorkoutSessionCache,
): boolean {
  return Object.keys(cache.sessions).length === 0;
}

export function isOwnerUser(
  owner: WorkoutSessionOwner,
  userId: string,
): boolean {
  return owner.kind === 'user' && owner.userId === userId;
}
