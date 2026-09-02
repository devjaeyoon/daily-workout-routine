import { describe, expect, it } from 'vitest';
import type { WorkoutExercise, WorkoutSession } from './types';
import {
  mergeWorkoutSessions,
  sessionsToDateMap,
  updateWorkoutSession,
} from './sessionModel';

const exercise: WorkoutExercise = {
  id: 'squat',
  exerciseName: '스쿼트',
  category: '하체',
  sets: [],
};

function session(
  workoutDate: string,
  updatedAt: string,
  exercises: WorkoutExercise[] = [],
): WorkoutSession {
  return {
    workoutDate,
    exercises,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt,
  };
}

describe('sessionModel', () => {
  it('indexes session arrays by workout date', () => {
    const first = session('2026-08-01', '2026-08-01T01:00:00.000Z');
    const second = session('2026-08-02', '2026-08-02T01:00:00.000Z');

    expect(sessionsToDateMap([first, second])).toEqual({
      '2026-08-01': first,
      '2026-08-02': second,
    });
  });

  it('merges the newest timestamp and selects newer local sessions to upload', () => {
    const localOnly = session(
      '2026-08-01',
      '2026-08-01T02:00:00.000Z',
    );
    const newerLocal = session(
      '2026-08-02',
      '2026-08-02T03:00:00.000Z',
      [exercise],
    );
    const olderRemote = session(
      '2026-08-02',
      '2026-08-02T02:00:00.000Z',
    );
    const newerRemote = session(
      '2026-08-03',
      '2026-08-03T03:00:00.000Z',
      [exercise],
    );

    const result = mergeWorkoutSessions(
      sessionsToDateMap([localOnly, newerLocal]),
      sessionsToDateMap([olderRemote, newerRemote]),
    );

    expect(result.merged).toEqual({
      '2026-08-01': localOnly,
      '2026-08-02': newerLocal,
      '2026-08-03': newerRemote,
    });
    expect(result.shouldUpload).toEqual([localOnly, newerLocal]);
  });

  it('updates only the selected workout date', () => {
    const previous = session(
      '2026-08-01',
      '2026-08-01T02:00:00.000Z',
    );
    const sessions = sessionsToDateMap([previous]);

    const updated = updateWorkoutSession(
      sessions,
      '2026-08-01',
      [exercise],
      new Date('2026-08-01T03:00:00.000Z'),
    );

    expect(updated).not.toBe(sessions);
    expect(updated['2026-08-01']).toEqual({
      ...previous,
      exercises: [exercise],
      updatedAt: '2026-08-01T03:00:00.000Z',
    });
  });
});
