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
import {
  saveWorkoutSessionCache,
  WORKOUT_SESSIONS_STORAGE_KEY,
  type WorkoutSessionCache,
  type WorkoutSessionOwner,
} from '@/features/workout/data/workoutStorage';
import type {
  WorkoutExercise,
  WorkoutSession,
  WorkoutSessionsByDate,
} from '@/features/workout/model/types';
import {
  useWorkoutSessions,
  type WorkoutSessionScope,
} from './useWorkoutSessions';

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

function signedIn(userId: string): WorkoutSessionScope {
  return { status: 'signed-in', userId };
}

const SIGNED_OUT: WorkoutSessionScope = { status: 'signed-out' };
const PENDING: WorkoutSessionScope = { status: 'pending' };

function seedCache(
  owner: WorkoutSessionOwner,
  sessions: WorkoutSessionsByDate,
): void {
  expect(
    saveWorkoutSessionCache({ version: 2, owner, sessions }),
  ).toBe(true);
}

function readCache(): WorkoutSessionCache {
  return JSON.parse(
    window.localStorage.getItem(WORKOUT_SESSIONS_STORAGE_KEY) ?? '',
  ) as WorkoutSessionCache;
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
    for (let index = 0; index < 8; index += 1) {
      await Promise.resolve();
    }
  });
}

describe('useWorkoutSessions ownership and sync queue', () => {
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

  it('does not read, write, edit, or synchronize while auth is pending', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useWorkoutSessions(PENDING));

    await advanceTimers(1_000);
    act(() => {
      result.current.setCurrentLogs([exercise(20)]);
    });

    expect(result.current.sessions).toEqual({});
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(fetchWorkoutSessionsMock).not.toHaveBeenCalled();
    expect(upsertWorkoutSessionMock).not.toHaveBeenCalled();
  });

  it('preserves edits made during fetch and upload until the latest revision is saved', async () => {
    const workoutDate = '2026-09-02';
    const fetchGate = deferred<WorkoutSession[]>();
    const uploads: Array<{
      session: WorkoutSession;
      gate: Deferred<WorkoutSession>;
    }> = [];
    seedCache(
      { kind: 'user', userId: 'user-a' },
      {
        [workoutDate]: session(
          workoutDate,
          10,
          '2026-09-02T01:00:00.000Z',
        ),
      },
    );
    fetchWorkoutSessionsMock.mockReturnValue(fetchGate.promise);
    upsertWorkoutSessionMock.mockImplementation((value) => {
      const gate = deferred<WorkoutSession>();
      uploads.push({ session: value, gate });
      return gate.promise;
    });

    const { result } = renderHook(() =>
      useWorkoutSessions(signedIn('user-a')),
    );
    await flushAsyncWork();
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
    seedCache({ kind: 'user', userId: 'user-a' }, {});
    fetchWorkoutSessionsMock.mockImplementation(() => {
      const gate = deferred<WorkoutSession[]>();
      fetchGates.push(gate);
      activeCalls += 1;
      maximumActiveCalls = Math.max(maximumActiveCalls, activeCalls);
      return gate.promise.finally(() => {
        activeCalls -= 1;
      });
    });

    const { result } = renderHook(() =>
      useWorkoutSessions(signedIn('user-a')),
    );
    await flushAsyncWork();
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
    seedCache({ kind: 'user', userId: 'user-a' }, localSessions);
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

    const { result } = renderHook(() =>
      useWorkoutSessions(signedIn('user-a')),
    );
    await flushAsyncWork();
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

  it('discards an earlier generation and starts the next user without waiting', async () => {
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
    seedCache({ kind: 'user', userId: 'user-a' }, {});
    fetchWorkoutSessionsMock.mockImplementation((requestedUserId) => {
      return requestedUserId === 'user-a'
        ? firstUserFetch.promise
        : secondUserFetch.promise;
    });

    const { result, rerender } = renderHook(
      ({ scope }) => useWorkoutSessions(scope),
      { initialProps: { scope: signedIn('user-a') } },
    );
    await flushAsyncWork();
    await advanceTimers(0);
    expect(fetchWorkoutSessionsMock).toHaveBeenCalledWith('user-a');

    rerender({ scope: signedIn('user-b') });
    await flushAsyncWork();
    await advanceTimers(0);
    expect(fetchWorkoutSessionsMock).toHaveBeenCalledWith('user-b');

    firstUserFetch.resolve([firstUserSession]);
    await flushAsyncWork();
    expect(result.current.sessions['2026-09-01']).toBeUndefined();

    secondUserFetch.resolve([secondUserSession]);
    await flushAsyncWork();

    expect(result.current.sessions).toEqual({
      '2026-09-02': secondUserSession,
    });
    expect(result.current.syncStatus).toBe('synced');
  });

  it('assigns guest records to the first signed-in user before syncing', async () => {
    const workoutDate = '2026-09-02';
    const guestSession = session(
      workoutDate,
      50,
      '2026-09-02T01:00:00.000Z',
    );
    seedCache({ kind: 'guest' }, { [workoutDate]: guestSession });

    const { result } = renderHook(() =>
      useWorkoutSessions(signedIn('user-a')),
    );
    await flushAsyncWork();
    await advanceTimers(0);
    await flushAsyncWork();

    expect(readCache().owner).toEqual({ kind: 'user', userId: 'user-a' });
    expect(result.current.sessions[workoutDate]).toEqual(guestSession);
    expect(fetchWorkoutSessionsMock).toHaveBeenCalledWith('user-a');
    expect(upsertWorkoutSessionMock).toHaveBeenCalledWith(guestSession);
  });

  it('keeps the last owner on sign-out and uploads signed-out edits when that user returns', async () => {
    const workoutDate = '2026-09-02';
    const original = session(
      workoutDate,
      10,
      '2026-09-02T01:00:00.000Z',
    );
    seedCache(
      { kind: 'user', userId: 'user-a' },
      { [workoutDate]: original },
    );
    fetchWorkoutSessionsMock.mockResolvedValue([original]);

    const { result, rerender } = renderHook(
      ({ scope }) => useWorkoutSessions(scope),
      { initialProps: { scope: SIGNED_OUT as WorkoutSessionScope } },
    );
    await flushAsyncWork();

    act(() => {
      result.current.setCurrentLogs([exercise(40)]);
    });
    await advanceTimers(800);

    expect(readCache().owner).toEqual({ kind: 'user', userId: 'user-a' });
    expect(fetchWorkoutSessionsMock).not.toHaveBeenCalled();
    expect(upsertWorkoutSessionMock).not.toHaveBeenCalled();

    rerender({ scope: signedIn('user-a') });
    await flushAsyncWork();
    await advanceTimers(0);
    await flushAsyncWork();

    expect(fetchWorkoutSessionsMock).toHaveBeenCalledWith('user-a');
    expect(upsertWorkoutSessionMock).toHaveBeenCalledTimes(1);
    expect(
      upsertWorkoutSessionMock.mock.calls[0][0].exercises[0].sets[0]
        .weight,
    ).toBe(40);
    expect(result.current.currentLogs[0].sets[0].weight).toBe(40);
  });

  it('automatically transfers an empty cache to a different user', async () => {
    const remoteSession = session(
      '2026-09-02',
      70,
      '2026-09-02T02:00:00.000Z',
    );
    seedCache({ kind: 'user', userId: 'user-a' }, {});
    fetchWorkoutSessionsMock.mockResolvedValue([remoteSession]);

    const { result } = renderHook(() =>
      useWorkoutSessions(signedIn('user-b')),
    );
    await flushAsyncWork();
    await advanceTimers(0);
    await flushAsyncWork();

    expect(readCache().owner).toEqual({ kind: 'user', userId: 'user-b' });
    expect(fetchWorkoutSessionsMock).toHaveBeenCalledWith('user-b');
    expect(result.current.sessions).toEqual({
      [remoteSession.workoutDate]: remoteSession,
    });
  });

  it('hides and protects a non-empty cache when a different user signs in', async () => {
    const workoutDate = '2026-09-02';
    seedCache(
      { kind: 'user', userId: 'user-a' },
      {
        [workoutDate]: session(
          workoutDate,
          10,
          '2026-09-02T01:00:00.000Z',
        ),
      },
    );

    const { result, rerender } = renderHook(
      ({ scope }) => useWorkoutSessions(scope),
      { initialProps: { scope: SIGNED_OUT as WorkoutSessionScope } },
    );
    await flushAsyncWork();
    act(() => {
      result.current.setCurrentLogs([exercise(30)]);
    });

    rerender({ scope: signedIn('user-b') });
    await advanceTimers(1_000);
    act(() => {
      result.current.setCurrentLogs([exercise(90)]);
      void result.current.syncFromRemote();
    });
    await flushAsyncWork();

    expect(result.current.sessions).toEqual({});
    expect(result.current.currentLogs).toEqual([]);
    expect(result.current.syncStatus).toBe('account-conflict');
    expect(fetchWorkoutSessionsMock).not.toHaveBeenCalled();
    expect(upsertWorkoutSessionMock).not.toHaveBeenCalled();
    expect(readCache().owner).toEqual({ kind: 'user', userId: 'user-a' });
    expect(
      readCache().sessions[workoutDate].exercises[0].sets[0].weight,
    ).toBe(30);
  });

  it('replaces a conflicting cache before loading only the new user records', async () => {
    const oldSession = session(
      '2026-09-01',
      10,
      '2026-09-01T01:00:00.000Z',
    );
    const newSession = session(
      '2026-09-02',
      80,
      '2026-09-02T01:00:00.000Z',
    );
    seedCache(
      { kind: 'user', userId: 'user-a' },
      { [oldSession.workoutDate]: oldSession },
    );
    fetchWorkoutSessionsMock.mockResolvedValue([newSession]);

    const { result } = renderHook(() =>
      useWorkoutSessions(signedIn('user-b')),
    );
    await flushAsyncWork();
    expect(result.current.syncStatus).toBe('account-conflict');

    act(() => {
      expect(result.current.resolveAccountConflict()).toBe(true);
    });
    expect(readCache()).toEqual({
      version: 2,
      owner: { kind: 'user', userId: 'user-b' },
      sessions: {},
    });

    await flushAsyncWork();
    await advanceTimers(0);
    await flushAsyncWork();

    expect(fetchWorkoutSessionsMock).toHaveBeenCalledTimes(1);
    expect(fetchWorkoutSessionsMock).toHaveBeenCalledWith('user-b');
    expect(upsertWorkoutSessionMock).not.toHaveBeenCalled();
    expect(result.current.sessions).toEqual({
      [newSession.workoutDate]: newSession,
    });
    expect(result.current.sessions[oldSession.workoutDate]).toBeUndefined();
  });

  it('keeps the conflicting cache blocked when reset cannot be persisted', async () => {
    const protectedSession = session(
      '2026-09-01',
      35,
      '2026-09-01T01:00:00.000Z',
    );
    seedCache(
      { kind: 'user', userId: 'user-a' },
      { [protectedSession.workoutDate]: protectedSession },
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const { result } = renderHook(() =>
      useWorkoutSessions(signedIn('user-b')),
    );
    await flushAsyncWork();

    act(() => {
      expect(result.current.resolveAccountConflict()).toBe(false);
    });
    await advanceTimers(0);

    expect(result.current.syncStatus).toBe('account-conflict');
    expect(result.current.sessions).toEqual({});
    expect(readCache()).toEqual({
      version: 2,
      owner: { kind: 'user', userId: 'user-a' },
      sessions: { [protectedSession.workoutDate]: protectedSession },
    });
    expect(fetchWorkoutSessionsMock).not.toHaveBeenCalled();
    expect(upsertWorkoutSessionMock).not.toHaveBeenCalled();
  });

  it('reports a local storage failure as an error', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const { result } = renderHook(() =>
      useWorkoutSessions(SIGNED_OUT),
    );
    await flushAsyncWork();

    expect(result.current.syncStatus).toBe('error');
  });

  it('stays offline until an online event queues synchronization', async () => {
    setOnline(false);
    seedCache({ kind: 'user', userId: 'user-a' }, {});
    const { result } = renderHook(() =>
      useWorkoutSessions(signedIn('user-a')),
    );

    await flushAsyncWork();
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
