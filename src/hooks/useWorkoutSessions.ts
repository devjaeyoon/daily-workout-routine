import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  getNextWorkoutDayCutoff,
  getWorkoutDate,
} from '../lib/workoutDate';
import {
  fetchWorkoutSessions,
  upsertWorkoutSession,
} from '../lib/workoutRepository';
import {
  loadWorkoutSessions,
  saveWorkoutSessions,
} from '../lib/workoutStorage';
import type {
  WorkoutExercise,
  WorkoutSession,
  WorkoutSessionsByDate,
} from '../types/workout';

export type SyncStatus =
  | 'local'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error';

function sessionMap(sessions: WorkoutSession[]): WorkoutSessionsByDate {
  return Object.fromEntries(
    sessions.map((session) => [session.workoutDate, session]),
  );
}

function mergeSessions(
  local: WorkoutSessionsByDate,
  remote: WorkoutSessionsByDate,
): {
  merged: WorkoutSessionsByDate;
  shouldUpload: WorkoutSession[];
} {
  const merged = { ...local };
  const shouldUpload: WorkoutSession[] = [];

  for (const [date, remoteSession] of Object.entries(remote)) {
    const localSession = local[date];
    if (
      !localSession ||
      Date.parse(remoteSession.updatedAt) > Date.parse(localSession.updatedAt)
    ) {
      merged[date] = remoteSession;
    }
  }

  for (const [date, localSession] of Object.entries(local)) {
    const remoteSession = remote[date];
    if (
      !remoteSession ||
      Date.parse(localSession.updatedAt) > Date.parse(remoteSession.updatedAt)
    ) {
      shouldUpload.push(localSession);
    }
  }

  return { merged, shouldUpload };
}

export function useWorkoutSessions(userId?: string) {
  const [sessions, setSessions] =
    useState<WorkoutSessionsByDate>(loadWorkoutSessions);
  const [currentDate, setCurrentDate] = useState(getWorkoutDate);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const dirtyDatesRef = useRef(new Set<string>());
  const sessionsRef = useRef(sessions);

  useEffect(() => {
    sessionsRef.current = sessions;
    if (!saveWorkoutSessions(sessions)) {
      queueMicrotask(() => setSyncStatus('error'));
    }
  }, [sessions]);

  useEffect(() => {
    const refreshWorkoutDate = () => {
      setCurrentDate(getWorkoutDate());
    };

    const delay = Math.max(
      1_000,
      getNextWorkoutDayCutoff().getTime() - Date.now() + 100,
    );
    const timeoutId = window.setTimeout(refreshWorkoutDate, delay);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshWorkoutDate();
    };
    window.addEventListener('focus', refreshWorkoutDate);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('focus', refreshWorkoutDate);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentDate]);

  const syncFromRemote = useCallback(async () => {
    if (!userId) {
      setSyncStatus('local');
      return;
    }

    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    try {
      const remoteSessions = sessionMap(await fetchWorkoutSessions(userId));
      const { merged, shouldUpload } = mergeSessions(
        sessionsRef.current,
        remoteSessions,
      );

      for (const session of shouldUpload) {
        const saved = await upsertWorkoutSession(userId, session);
        merged[saved.workoutDate] = saved;
      }

      dirtyDatesRef.current.clear();
      setSessions(merged);
      setLastSyncedAt(new Date().toISOString());
      setSyncStatus('synced');
    } catch {
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
    }
  }, [userId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void syncFromRemote();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [syncFromRemote]);

  useEffect(() => {
    if (!userId || dirtyDatesRef.current.size === 0) return;

    const timeoutId = window.setTimeout(async () => {
      if (!navigator.onLine) {
        setSyncStatus('offline');
        return;
      }

      const dates = [...dirtyDatesRef.current];
      dirtyDatesRef.current.clear();
      setSyncStatus('syncing');

      try {
        for (const date of dates) {
          const session = sessionsRef.current[date];
          if (session) await upsertWorkoutSession(userId, session);
        }
        setLastSyncedAt(new Date().toISOString());
        setSyncStatus('synced');
      } catch {
        dates.forEach((date) => dirtyDatesRef.current.add(date));
        setSyncStatus(navigator.onLine ? 'error' : 'offline');
      }
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [sessions, userId]);

  useEffect(() => {
    const handleOnline = () => {
      void syncFromRemote();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncFromRemote]);

  const currentLogs = sessions[currentDate]?.exercises ?? [];

  const setCurrentLogs = useCallback(
    (
      updater:
        | WorkoutExercise[]
        | ((previous: WorkoutExercise[]) => WorkoutExercise[]),
    ) => {
      setSessions((previousSessions) => {
        const previousSession = previousSessions[currentDate];
        const previousLogs = previousSession?.exercises ?? [];
        const nextLogs =
          typeof updater === 'function' ? updater(previousLogs) : updater;
        const now = new Date().toISOString();

        dirtyDatesRef.current.add(currentDate);
        return {
          ...previousSessions,
          [currentDate]: {
            workoutDate: currentDate,
            exercises: nextLogs,
            createdAt: previousSession?.createdAt ?? now,
            updatedAt: now,
          },
        };
      });
    },
    [currentDate],
  );

  return {
    currentDate,
    currentLogs,
    sessions,
    setCurrentLogs,
    syncStatus,
    lastSyncedAt,
    syncFromRemote,
  };
}
