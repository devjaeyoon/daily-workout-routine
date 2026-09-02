import { useCallback } from 'react';
import {
  updateWorkoutSession,
  type WorkoutLogsUpdater,
} from '@/features/workout/model/sessionModel';
import { useWorkoutDateRollover } from './useWorkoutDateRollover';
import { useWorkoutSessionStore } from './useWorkoutSessionStore';
import { useWorkoutSync } from './useWorkoutSync';

export type { SyncStatus } from './useWorkoutSync';

export function useWorkoutSessions(userId?: string) {
  const currentDate = useWorkoutDateRollover();
  const { sessions, sessionsRef, setSessions, storageError } =
    useWorkoutSessionStore();
  const {
    syncStatus,
    lastSyncedAt,
    syncFromRemote,
    markDirty,
  } = useWorkoutSync({
    userId,
    sessionsRef,
    setSessions,
    storageError,
  });

  const setCurrentLogs = useCallback(
    (updater: WorkoutLogsUpdater) => {
      setSessions((previousSessions) =>
        updateWorkoutSession(previousSessions, currentDate, updater),
      );
      markDirty(currentDate);
    },
    [currentDate, markDirty, setSessions],
  );

  return {
    currentDate,
    currentLogs: sessions[currentDate]?.exercises ?? [],
    sessions,
    setCurrentLogs,
    syncStatus,
    lastSyncedAt,
    syncFromRemote,
  };
}
