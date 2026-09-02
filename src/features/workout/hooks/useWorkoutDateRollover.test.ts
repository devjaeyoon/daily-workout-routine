import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkoutDateRollover } from './useWorkoutDateRollover';

describe('useWorkoutDateRollover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rolls over after the 4 AM timer fires', () => {
    vi.setSystemTime(new Date(2026, 8, 2, 3, 59, 59, 900));
    const { result } = renderHook(useWorkoutDateRollover);

    expect(result.current).toBe('2026-09-01');

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(result.current).toBe('2026-09-02');
  });

  it('refreshes the workout date when the window regains focus', () => {
    vi.setSystemTime(new Date(2026, 8, 2, 3, 30));
    const { result } = renderHook(useWorkoutDateRollover);

    vi.setSystemTime(new Date(2026, 8, 2, 4, 30));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(result.current).toBe('2026-09-02');
  });
});
