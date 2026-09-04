import { useCallback } from 'react';
import {
  updateWorkoutSession,
  type WorkoutLogsUpdater,
} from '@/features/workout/model/sessionModel';
import { useWorkoutDateRollover } from './useWorkoutDateRollover';
import {
  useWorkoutSessionStore,
  type WorkoutSessionScope,
} from './useWorkoutSessionStore';
import { useWorkoutSync } from './useWorkoutSync';

export type { SyncStatus } from './useWorkoutSync';
export type { WorkoutSessionScope } from './useWorkoutSessionStore';

export function useWorkoutSessions(scope: WorkoutSessionScope) {
  const currentDate = useWorkoutDateRollover();
  const {
    sessions,
    sessionsRef,
    setSessions,
    storageError,
    canEdit,
    syncUserId,
    accountConflict,
    resolveAccountConflict,
  } = useWorkoutSessionStore(scope);
  const {
    syncStatus,
    lastSyncedAt,
    syncFromRemote,
    markDirty,
  } = useWorkoutSync({
    userId: syncUserId,
    sessionsRef,
    setSessions,
    storageError,
    accountConflict,
  });

  const setCurrentLogs = useCallback(
    (updater: WorkoutLogsUpdater) => {
      if (!canEdit) return;

      const updated = setSessions((previousSessions) =>
        updateWorkoutSession(previousSessions, currentDate, updater),
      );
      if (updated) markDirty(currentDate);
    },
    [canEdit, currentDate, markDirty, setSessions],
  );

  return {
    currentDate,
    currentLogs: sessions[currentDate]?.exercises ?? [],
    sessions,
    setCurrentLogs,
    syncStatus,
    lastSyncedAt,
    syncFromRemote,
    resolveAccountConflict,
  };
}
