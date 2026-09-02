import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  fetchWorkoutSessions,
  upsertWorkoutSession,
} from '@/features/workout/data/workoutRepository';
import { saveWorkoutSessions } from '@/features/workout/data/workoutStorage';
import type {
  WorkoutExercise,
  WorkoutSession,
} from '@/features/workout/model/types';
import { useWorkoutSessions } from './useWorkoutSessions';

vi.mock('@/features/workout/data/workoutRepository', () => ({
  fetchWorkoutSessions: vi.fn(),
  upsertWorkoutSession: vi.fn(),
}));

const fetchWorkoutSessionsMock = vi.mocked(fetchWorkoutSessions);
const upsertWorkoutSessionMock = vi.mocked(upsertWorkoutSession);

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function exercise(weight: number): WorkoutExercise {
  return {
    id: 'squat',
    exerciseName: '스쿼트',
    category: '하체',
    sets: [
      {
        setNumber: 1,
        weight,
        reps: 10,
        rir: 2,
        restTime: 90,
      },
    ],
  };
}

function session(
  workoutDate: string,
  weight: number,
  updatedAt: string,
): WorkoutSession {
  return {
    workoutDate,
    exercises: [exercise(weight)],
    createdAt: updatedAt,
    updatedAt,
  };
}

function setOnline(online: boolean): void {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: online,
  });
}

async function advanceTimers(milliseconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

async function flushAsyncWork(): Promise<void> {
  await act(async () => {
    for (let index = 0; index < 5; index += 1) {
      await Promise.resolve();
    }
  });
}

describe('useWorkoutSessions sync queue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 2, 12));
    setOnline(true);
    window.localStorage.clear();
    fetchWorkoutSessionsMock.mockReset();
    upsertWorkoutSessionMock.mockReset();
    fetchWorkoutSessionsMock.mockResolvedValue([]);
    upsertWorkoutSessionMock.mockImplementation(async (value) => value);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('preserves edits made during fetch and upload until the latest revision is saved', async () => {
    const workoutDate = '2026-09-02';
    const fetchGate = deferred<WorkoutSession[]>();
    const uploads: Array<{
      session: WorkoutSession;
      gate: Deferred<WorkoutSession>;
    }> = [];
    expect(
      saveWorkoutSessions({
        [workoutDate]: session(
          workoutDate,
          10,
          '2026-09-02T01:00:00.000Z',
        ),
      }),
    ).toBe(true);
    fetchWorkoutSessionsMock.mockReturnValue(fetchGate.promise);
    upsertWorkoutSessionMock.mockImplementation((value) => {
      const gate = deferred<WorkoutSession>();
      uploads.push({ session: value, gate });
      return gate.promise;
    });

    const { result } = renderHook(() => useWorkoutSessions('user-a'));
    await advanceTimers(0);
    expect(fetchWorkoutSessionsMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.setCurrentLogs([exercise(20)]);
    });
    await flushAsyncWork();

    fetchGate.resolve([]);
    await flushAsyncWork();
    expect(uploads).toHaveLength(1);
    expect(uploads[0].session.exercises[0].sets[0].weight).toBe(20);

    act(() => {
      result.current.setCurrentLogs([exercise(30)]);
    });
    await advanceTimers(800);
    expect(result.current.syncStatus).toBe('syncing');

    uploads[0].gate.resolve(uploads[0].session);
    await flushAsyncWork();
    expect(uploads).toHaveLength(2);
    expect(uploads[1].session.exercises[0].sets[0].weight).toBe(30);

    uploads[1].gate.resolve(uploads[1].session);
    await flushAsyncWork();

    expect(result.current.currentLogs[0].sets[0].weight).toBe(30);
    expect(result.current.syncStatus).toBe('synced');
    expect(result.current.lastSyncedAt).not.toBeNull();
    expect(Date.parse(uploads[1].session.updatedAt)).toBeGreaterThan(
      Date.parse(uploads[0].session.updatedAt),
    );
  });

  it('serializes overlapping initial, manual, and online sync requests', async () => {
    const fetchGates: Array<Deferred<WorkoutSession[]>> = [];
    let activeCalls = 0;
    let maximumActiveCalls = 0;
    fetchWorkoutSessionsMock.mockImplementation(() => {
      const gate = deferred<WorkoutSession[]>();
      fetchGates.push(gate);
      activeCalls += 1;
      maximumActiveCalls = Math.max(maximumActiveCalls, activeCalls);
      return gate.promise.finally(() => {
        activeCalls -= 1;
      });
    });

    const { result } = renderHook(() => useWorkoutSessions('user-a'));
    await advanceTimers(0);
    expect(fetchGates).toHaveLength(1);

    let manualSync!: Promise<void>;
    act(() => {
      manualSync = result.current.syncFromRemote();
      window.dispatchEvent(new Event('online'));
    });
    expect(fetchGates).toHaveLength(1);
    expect(maximumActiveCalls).toBe(1);

    fetchGates[0].resolve([]);
    await flushAsyncWork();
    expect(fetchGates).toHaveLength(2);
    expect(maximumActiveCalls).toBe(1);

    fetchGates[1].resolve([]);
    await act(async () => {
      await manualSync;
    });
    await flushAsyncWork();

    expect(maximumActiveCalls).toBe(1);
    expect(fetchWorkoutSessionsMock).toHaveBeenCalledTimes(2);
    expect(result.current.syncStatus).toBe('synced');
  });

  it('retries only dates whose upload failed', async () => {
    const firstDate = '2026-09-01';
    const secondDate = '2026-09-02';
    const localSessions = {
      [firstDate]: session(
        firstDate,
        10,
        '2026-09-02T01:00:00.000Z',
      ),
      [secondDate]: session(
        secondDate,
        20,
        '2026-09-02T02:00:00.000Z',
      ),
    };
    const remoteSessions = new Map<string, WorkoutSession>();
    const attempts = new Map<string, number>();
    expect(saveWorkoutSessions(localSessions)).toBe(true);
    fetchWorkoutSessionsMock.mockImplementation(async () => [
      ...remoteSessions.values(),
    ]);
    upsertWorkoutSessionMock.mockImplementation(async (value) => {
      const attempt = (attempts.get(value.workoutDate) ?? 0) + 1;
      attempts.set(value.workoutDate, attempt);
      if (value.workoutDate === secondDate && attempt === 1) {
        throw new Error('temporary failure');
      }
      remoteSessions.set(value.workoutDate, value);
      return value;
    });

    const { result } = renderHook(() => useWorkoutSessions('user-a'));
    await advanceTimers(0);
    await flushAsyncWork();

    expect(result.current.syncStatus).toBe('error');
    expect(attempts.get(firstDate)).toBe(1);
    expect(attempts.get(secondDate)).toBe(1);

    await act(async () => {
      await result.current.syncFromRemote();
    });
    await flushAsyncWork();

    expect(attempts.get(firstDate)).toBe(1);
    expect(attempts.get(secondDate)).toBe(2);
    expect(result.current.syncStatus).toBe('synced');
  });

  it('ignores an earlier user generation after the user changes', async () => {
    const firstUserFetch = deferred<WorkoutSession[]>();
    const secondUserFetch = deferred<WorkoutSession[]>();
    const firstUserSession = session(
      '2026-09-01',
      10,
      '2026-09-02T01:00:00.000Z',
    );
    const secondUserSession = session(
      '2026-09-02',
      20,
      '2026-09-02T02:00:00.000Z',
    );
    fetchWorkoutSessionsMock.mockImplementation((requestedUserId) => {
      return requestedUserId === 'user-a'
        ? firstUserFetch.promise
        : secondUserFetch.promise;
    });

    const { result, rerender } = renderHook(
      ({ currentUserId }) => useWorkoutSessions(currentUserId),
      { initialProps: { currentUserId: 'user-a' } },
    );
    await advanceTimers(0);
    expect(fetchWorkoutSessionsMock).toHaveBeenCalledWith('user-a');

    rerender({ currentUserId: 'user-b' });
    await advanceTimers(0);
    firstUserFetch.resolve([firstUserSession]);
    await flushAsyncWork();

    expect(fetchWorkoutSessionsMock).toHaveBeenCalledWith('user-b');
    expect(result.current.sessions['2026-09-01']).toBeUndefined();

    secondUserFetch.resolve([secondUserSession]);
    await flushAsyncWork();

    expect(result.current.sessions).toEqual({
      '2026-09-02': secondUserSession,
    });
    expect(result.current.syncStatus).toBe('synced');
  });

  it('reports a local storage failure as an error', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const { result } = renderHook(() => useWorkoutSessions());
    await flushAsyncWork();

    expect(result.current.syncStatus).toBe('error');
  });

  it('stays offline until an online event queues synchronization', async () => {
    setOnline(false);
    const { result } = renderHook(() => useWorkoutSessions('user-a'));

    await advanceTimers(0);
    expect(fetchWorkoutSessionsMock).not.toHaveBeenCalled();
    expect(result.current.syncStatus).toBe('offline');

    setOnline(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await flushAsyncWork();

    expect(fetchWorkoutSessionsMock).toHaveBeenCalledTimes(1);
    expect(result.current.syncStatus).toBe('synced');
  });
});
