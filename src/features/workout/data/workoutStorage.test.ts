import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutSession } from '@/features/workout/model/types';
import {
  LEGACY_WORKOUT_SESSIONS_STORAGE_KEY,
  loadWorkoutSessionCache,
  WORKOUT_SESSIONS_STORAGE_KEY,
  type WorkoutSessionOwner,
} from './workoutStorage';

function session(workoutDate = '2026-09-02'): WorkoutSession {
  return {
    workoutDate,
    exercises: [
      {
        id: 'squat',
        exerciseName: '스쿼트',
        category: '하체',
        sets: [
          {
            setNumber: 1,
            weight: 60,
            reps: 10,
            rir: 2,
            restTime: 90,
          },
        ],
      },
    ],
    createdAt: '2026-09-02T01:00:00.000Z',
    updatedAt: '2026-09-02T01:00:00.000Z',
  };
}

function seedLegacy(workoutSession: WorkoutSession): void {
  window.localStorage.setItem(
    LEGACY_WORKOUT_SESSIONS_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      sessions: { [workoutSession.workoutDate]: workoutSession },
    }),
  );
}

describe('workoutStorage v2', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each<{
    name: string;
    owner: WorkoutSessionOwner;
  }>([
    { name: 'the confirmed signed-in user', owner: { kind: 'user', userId: 'user-a' } },
    { name: 'a guest', owner: { kind: 'guest' } },
  ])('migrates v1 to $name and removes v1 after saving v2', ({ owner }) => {
    const legacySession = session();
    seedLegacy(legacySession);

    const result = loadWorkoutSessionCache(owner);

    expect(result).toEqual({
      cache: {
        version: 2,
        owner,
        sessions: { [legacySession.workoutDate]: legacySession },
      },
      persisted: true,
      storageError: false,
    });
    expect(
      window.localStorage.getItem(LEGACY_WORKOUT_SESSIONS_STORAGE_KEY),
    ).toBeNull();
    expect(
      JSON.parse(
        window.localStorage.getItem(WORKOUT_SESSIONS_STORAGE_KEY) ?? '',
      ),
    ).toEqual(result.cache);
  });

  it('preserves v1 when writing the migrated v2 payload fails', () => {
    const legacySession = session();
    seedLegacy(legacySession);
    const legacyPayload = window.localStorage.getItem(
      LEGACY_WORKOUT_SESSIONS_STORAGE_KEY,
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const result = loadWorkoutSessionCache({
      kind: 'user',
      userId: 'user-a',
    });

    expect(result.persisted).toBe(false);
    expect(result.storageError).toBe(true);
    expect(result.cache.sessions).toEqual({
      [legacySession.workoutDate]: legacySession,
    });
    expect(
      window.localStorage.getItem(LEGACY_WORKOUT_SESSIONS_STORAGE_KEY),
    ).toBe(legacyPayload);
    expect(
      window.localStorage.getItem(WORKOUT_SESSIONS_STORAGE_KEY),
    ).toBeNull();
  });

  it('ignores malformed payloads and invalid session entries safely', () => {
    const validSession = session();
    window.localStorage.setItem(
      WORKOUT_SESSIONS_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        owner: { kind: 'guest' },
        sessions: {
          [validSession.workoutDate]: validSession,
          broken: { workoutDate: 'broken', exercises: 'not-an-array' },
        },
      }),
    );

    expect(
      loadWorkoutSessionCache({ kind: 'user', userId: 'user-a' }).cache,
    ).toEqual({
      version: 2,
      owner: { kind: 'guest' },
      sessions: { [validSession.workoutDate]: validSession },
    });

    window.localStorage.setItem(WORKOUT_SESSIONS_STORAGE_KEY, '{broken json');
    const recovered = loadWorkoutSessionCache({ kind: 'guest' });
    expect(recovered.cache).toEqual({
      version: 2,
      owner: { kind: 'guest' },
      sessions: {},
    });
    expect(recovered.storageError).toBe(false);
  });
});
