import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  fetchWorkoutSessions,
  upsertWorkoutSession,
} from '@/features/workout/data/workoutRepository';
import {
  mergeWorkoutSessions,
  sessionsToDateMap,
} from '@/features/workout/model/sessionModel';
import type {
  WorkoutSession,
  WorkoutSessionsByDate,
} from '@/features/workout/model/types';
import type { SessionsUpdater } from './useWorkoutSessionStore';

export type SyncStatus =
  | 'local'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error'
  | 'account-conflict';

type SyncRequest = {
  userId: string;
  generation: number;
  fetchRemote: boolean;
  resolve: Array<() => void>;
};

type SyncRunResult = {
  stale: boolean;
  hadError: boolean;
};

type SessionRevisionSnapshot = {
  date: string;
  revision: number;
  session: WorkoutSession;
};

type ScopedSyncStatus = {
  userId?: string;
  status: SyncStatus;
};

type LastSync = {
  userId: string;
  syncedAt: string;
};

function settleRequest(request: SyncRequest): void {
  request.resolve.forEach((resolve) => resolve());
}

function getNetworkStatus(
  scopedStatus: ScopedSyncStatus,
  userId: string | undefined,
): SyncStatus {
  if (scopedStatus.userId === userId) return scopedStatus.status;
  return userId ? 'syncing' : 'local';
}

function getLastSyncedAt(
  lastSync: LastSync | null,
  userId: string | undefined,
): string | null {
  if (!userId || lastSync?.userId !== userId) return null;
  return lastSync.syncedAt;
}

export function useWorkoutSync({
  userId,
  sessionsRef,
  setSessions,
  storageError,
  accountConflict,
}: {
  userId?: string;
  sessionsRef: RefObject<WorkoutSessionsByDate>;
  setSessions: (updater: SessionsUpdater) => void;
  storageError: boolean;
  accountConflict: boolean;
}) {
  const [scopedStatus, setScopedStatus] = useState<ScopedSyncStatus>({
    userId,
    status: userId ? 'syncing' : 'local',
  });
  const [lastSync, setLastSync] = useState<LastSync | null>(null);
  const [localEditVersion, setLocalEditVersion] = useState(0);
  const mountedRef = useRef(true);
  const userIdRef = useRef(userId);
  const accountConflictRef = useRef(accountConflict);
  const generationRef = useRef(0);
  const revisionsRef = useRef(new Map<string, number>());
  const dirtyRevisionsRef = useRef(new Map<string, number>());
  const pendingRequestRef = useRef<SyncRequest | null>(null);
  const runningGenerationsRef = useRef(new Set<number>());
  const remoteFetchErrorGenerationRef = useRef<number | null>(null);

  userIdRef.current = userId;
  accountConflictRef.current = accountConflict;

  const isActive = useCallback(
    (requestUserId: string, requestGeneration: number) =>
      mountedRef.current &&
      userIdRef.current === requestUserId &&
      generationRef.current === requestGeneration,
    [],
  );

  const updateStatus = useCallback(
    (
      requestUserId: string | undefined,
      requestGeneration: number,
      status: SyncStatus,
    ) => {
      if (
        mountedRef.current &&
        userIdRef.current === requestUserId &&
        generationRef.current === requestGeneration
      ) {
        setScopedStatus({ userId: requestUserId, status });
      }
    },
    [],
  );

  const markSessionForUpload = useCallback((date: string) => {
    if (dirtyRevisionsRef.current.has(date)) return;

    dirtyRevisionsRef.current.set(
      date,
      revisionsRef.current.get(date) ?? 0,
    );
  }, []);

  const runRequest = useCallback(
    async (request: SyncRequest): Promise<SyncRunResult> => {
      let hadError = false;

      if (request.fetchRemote) {
        try {
          const remoteSessions = sessionsToDateMap(
            await fetchWorkoutSessions(request.userId),
          );
          if (!isActive(request.userId, request.generation)) {
            return { stale: true, hadError: false };
          }

          const { shouldUpload } = mergeWorkoutSessions(
            sessionsRef.current,
            remoteSessions,
          );
          shouldUpload.forEach((session) => {
            markSessionForUpload(session.workoutDate);
          });
          setSessions((latestSessions) =>
            mergeWorkoutSessions(latestSessions, remoteSessions).merged,
          );
          remoteFetchErrorGenerationRef.current = null;
        } catch {
          if (!isActive(request.userId, request.generation)) {
            return { stale: true, hadError: false };
          }
          remoteFetchErrorGenerationRef.current = request.generation;
          hadError = true;
        }
      }

      if (!isActive(request.userId, request.generation)) {
        return { stale: true, hadError: false };
      }

      const snapshots = [...dirtyRevisionsRef.current.entries()]
        .sort(([firstDate], [secondDate]) =>
          firstDate.localeCompare(secondDate),
        )
        .flatMap<SessionRevisionSnapshot>(([date, revision]) => {
          const session = sessionsRef.current[date];
          return session ? [{ date, revision, session }] : [];
        });

      for (const snapshot of snapshots) {
        try {
          const saved = await upsertWorkoutSession(snapshot.session);
          if (!isActive(request.userId, request.generation)) {
            return { stale: true, hadError: false };
          }

          const revisionIsCurrent =
            dirtyRevisionsRef.current.get(snapshot.date) ===
            snapshot.revision;
          setSessions((latestSessions) => {
            if (revisionIsCurrent) {
              return {
                ...latestSessions,
                [snapshot.date]: saved,
              };
            }

            return mergeWorkoutSessions(latestSessions, {
              [saved.workoutDate]: saved,
            }).merged;
          });

          if (revisionIsCurrent) {
            dirtyRevisionsRef.current.delete(snapshot.date);
          }
        } catch {
          if (!isActive(request.userId, request.generation)) {
            return { stale: true, hadError: false };
          }
          hadError = true;
        }
      }

      return { stale: false, hadError };
    },
    [isActive, markSessionForUpload, sessionsRef, setSessions],
  );

  const drainQueue = useCallback(async (generation: number) => {
    if (runningGenerationsRef.current.has(generation)) return;

    runningGenerationsRef.current.add(generation);
    let completedGeneration: number | null = null;
    let lastRunHadError = false;

    try {
      while (pendingRequestRef.current?.generation === generation) {
        const request = pendingRequestRef.current;
        pendingRequestRef.current = null;

        const result = await runRequest(request);
        settleRequest(request);

        if (!result.stale) {
          completedGeneration = request.generation;
          lastRunHadError = result.hadError;
        }
      }
    } finally {
      runningGenerationsRef.current.delete(generation);

      const activeUserId = userIdRef.current;
      const activeGeneration = generationRef.current;
      const canUpdateStatus =
        mountedRef.current &&
        Boolean(activeUserId) &&
        completedGeneration === activeGeneration;

      if (canUpdateStatus && activeUserId) {
        if (!navigator.onLine) {
          updateStatus(activeUserId, activeGeneration, 'offline');
        } else if (
          lastRunHadError ||
          remoteFetchErrorGenerationRef.current === activeGeneration
        ) {
          updateStatus(activeUserId, activeGeneration, 'error');
        } else if (dirtyRevisionsRef.current.size > 0) {
          updateStatus(activeUserId, activeGeneration, 'syncing');
        } else {
          setLastSync({
            userId: activeUserId,
            syncedAt: new Date().toISOString(),
          });
          updateStatus(activeUserId, activeGeneration, 'synced');
        }
      }
    }
  }, [runRequest, updateStatus]);

  const enqueueSync = useCallback(
    (fetchRemote: boolean): Promise<void> => {
      const requestUserId = userIdRef.current;
      const requestGeneration = generationRef.current;

      if (!requestUserId || accountConflictRef.current) {
        updateStatus(undefined, requestGeneration, 'local');
        return Promise.resolve();
      }

      if (!navigator.onLine) {
        updateStatus(requestUserId, requestGeneration, 'offline');
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        const pendingRequest = pendingRequestRef.current;
        if (
          pendingRequest &&
          pendingRequest.userId === requestUserId &&
          pendingRequest.generation === requestGeneration
        ) {
          pendingRequest.fetchRemote ||= fetchRemote;
          pendingRequest.resolve.push(resolve);
        } else {
          if (pendingRequest) settleRequest(pendingRequest);
          pendingRequestRef.current = {
            userId: requestUserId,
            generation: requestGeneration,
            fetchRemote,
            resolve: [resolve],
          };
        }

        updateStatus(requestUserId, requestGeneration, 'syncing');
        void drainQueue(requestGeneration);
      });
    },
    [drainQueue, updateStatus],
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      const pendingRequest = pendingRequestRef.current;
      pendingRequestRef.current = null;
      if (pendingRequest) settleRequest(pendingRequest);
    };
  }, []);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    remoteFetchErrorGenerationRef.current = null;
    revisionsRef.current.clear();
    dirtyRevisionsRef.current.clear();
    const timeoutId = userId
      ? window.setTimeout(() => {
          void enqueueSync(true);
        }, 0)
      : null;

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (generationRef.current === generation) {
        generationRef.current += 1;
      }

      const pendingRequest = pendingRequestRef.current;
      if (pendingRequest?.generation === generation) {
        pendingRequestRef.current = null;
        settleRequest(pendingRequest);
      }
    };
  }, [accountConflict, enqueueSync, userId]);

  useEffect(() => {
    if (!userId || dirtyRevisionsRef.current.size === 0) return;

    const timeoutId = window.setTimeout(() => {
      if (dirtyRevisionsRef.current.size > 0) {
        void enqueueSync(false);
      }
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [enqueueSync, localEditVersion, userId]);

  useEffect(() => {
    const handleOnline = () => {
      void enqueueSync(true);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [enqueueSync]);

  const markDirty = useCallback(
    (date: string) => {
      const nextRevision = (revisionsRef.current.get(date) ?? 0) + 1;
      revisionsRef.current.set(date, nextRevision);
      dirtyRevisionsRef.current.set(date, nextRevision);
      setLocalEditVersion((version) => version + 1);

      const activeUserId = userIdRef.current;
      if (activeUserId) {
        updateStatus(
          activeUserId,
          generationRef.current,
          navigator.onLine ? 'syncing' : 'offline',
        );
      }
    },
    [updateStatus],
  );

  const syncFromRemote = useCallback(
    () => enqueueSync(true),
    [enqueueSync],
  );
  const networkStatus = getNetworkStatus(scopedStatus, userId);
  let syncStatus = networkStatus;
  if (storageError) syncStatus = 'error';
  if (accountConflict) syncStatus = 'account-conflict';

  return {
    syncStatus,
    lastSyncedAt: getLastSyncedAt(lastSync, userId),
    syncFromRemote,
    markDirty,
  };
}
