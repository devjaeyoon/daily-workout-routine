import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadWorkoutSessions,
  saveWorkoutSessions,
} from '@/features/workout/data/workoutStorage';
import type { WorkoutSessionsByDate } from '@/features/workout/model/types';

export type SessionsUpdater =
  | WorkoutSessionsByDate
  | ((previous: WorkoutSessionsByDate) => WorkoutSessionsByDate);

export function useWorkoutSessionStore() {
  const [sessions, setSessionsState] =
    useState<WorkoutSessionsByDate>(loadWorkoutSessions);
  const [storageError, setStorageError] = useState(false);
  const sessionsRef = useRef(sessions);

  const setSessions = useCallback((updater: SessionsUpdater) => {
    const nextSessions =
      typeof updater === 'function'
        ? updater(sessionsRef.current)
        : updater;

    sessionsRef.current = nextSessions;
    setSessionsState(nextSessions);
  }, []);

  useEffect(() => {
    let active = true;
    const hasStorageError = !saveWorkoutSessions(sessions);

    queueMicrotask(() => {
      if (active) setStorageError(hasStorageError);
    });

    return () => {
      active = false;
    };
  }, [sessions]);

  return {
    sessions,
    sessionsRef,
    setSessions,
    storageError,
  };
}
