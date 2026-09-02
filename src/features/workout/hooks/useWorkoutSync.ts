import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchWorkoutSessions,
  upsertWorkoutSession,
} from '@/features/workout/data/workoutRepository';
import {
  mergeWorkoutSessions,
  sessionsToDateMap,
} from '@/features/workout/model/sessionModel';
import type { WorkoutSessionsByDate } from '@/features/workout/model/types';
import type { SessionsUpdater } from './useWorkoutSessionStore';

export type SyncStatus =
  | 'local'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error';

export function useWorkoutSync({
  userId,
  sessions,
  sessionsRef,
  setSessions,
  storageError,
}: {
  userId?: string;
  sessions: WorkoutSessionsByDate;
  sessionsRef: React.RefObject<WorkoutSessionsByDate>;
  setSessions: (updater: SessionsUpdater) => void;
  storageError: boolean;
}) {
  const [networkStatus, setNetworkStatus] = useState<SyncStatus>('local');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const dirtyDatesRef = useRef(new Set<string>());

  const syncFromRemote = useCallback(async () => {
    if (!userId) {
      setNetworkStatus('local');
      return;
    }

    if (!navigator.onLine) {
      setNetworkStatus('offline');
      return;
    }

    setNetworkStatus('syncing');
    try {
      const remoteSessions = sessionsToDateMap(
        await fetchWorkoutSessions(userId),
      );
      const { merged, shouldUpload } = mergeWorkoutSessions(
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
      setNetworkStatus('synced');
    } catch {
      setNetworkStatus(navigator.onLine ? 'error' : 'offline');
    }
  }, [sessionsRef, setSessions, userId]);

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
        setNetworkStatus('offline');
        return;
      }

      const dates = [...dirtyDatesRef.current];
      dirtyDatesRef.current.clear();
      setNetworkStatus('syncing');

      try {
        for (const date of dates) {
          const session = sessionsRef.current[date];
          if (session) await upsertWorkoutSession(userId, session);
        }
        setLastSyncedAt(new Date().toISOString());
        setNetworkStatus('synced');
      } catch {
        dates.forEach((date) => dirtyDatesRef.current.add(date));
        setNetworkStatus(navigator.onLine ? 'error' : 'offline');
      }
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [sessions, sessionsRef, userId]);

  useEffect(() => {
    const handleOnline = () => {
      void syncFromRemote();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncFromRemote]);

  const markDirty = useCallback((date: string) => {
    dirtyDatesRef.current.add(date);
  }, []);

  return {
    syncStatus: storageError ? 'error' : networkStatus,
    lastSyncedAt,
    syncFromRemote,
    markDirty,
  };
}
