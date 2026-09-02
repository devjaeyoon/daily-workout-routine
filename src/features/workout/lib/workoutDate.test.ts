import { describe, expect, it } from 'vitest';
import { getNextWorkoutDayCutoff, getWorkoutDate } from './workoutDate';

describe('workoutDate', () => {
  it('changes the workout date at local 4 AM', () => {
    expect(getWorkoutDate(new Date(2026, 8, 2, 3, 59, 59))).toBe(
      '2026-09-01',
    );
    expect(getWorkoutDate(new Date(2026, 8, 2, 4, 0, 0))).toBe(
      '2026-09-02',
    );
  });

  it('keeps the cutoff policy across year boundaries', () => {
    expect(getWorkoutDate(new Date(2027, 0, 1, 3, 30))).toBe(
      '2026-12-31',
    );
    expect(getNextWorkoutDayCutoff(new Date(2026, 11, 31, 23, 0))).toEqual(
      new Date(2027, 0, 1, 4, 0),
    );
  });
});
