import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isEmptyWorkoutSessionCache,
  isOwnerUser,
  loadWorkoutSessionCache,
  saveWorkoutSessionCache,
  type WorkoutSessionCache,
  type WorkoutSessionOwner,
} from '@/features/workout/data/workoutStorage';
import type { WorkoutSessionsByDate } from '@/features/workout/model/types';

export type WorkoutSessionScope =
  | { status: 'pending' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; userId: string };

export type SessionsUpdater =
  | WorkoutSessionsByDate
  | ((previous: WorkoutSessionsByDate) => WorkoutSessionsByDate);

type StoreAccess = 'pending' | 'ready' | 'account-conflict';

type StoreSnapshot = {
  access: StoreAccess;
  cache: WorkoutSessionCache | null;
  ownerPersisted: boolean;
  resolvedScopeKey: string | null;
  storageError: boolean;
};

const EMPTY_SESSIONS: WorkoutSessionsByDate = {};

function getScopeKey(scope: WorkoutSessionScope): string {
  if (scope.status === 'signed-in') return `signed-in:${scope.userId}`;
  return scope.status;
}

function reconcileCache(
  cache: WorkoutSessionCache,
  ownerPersisted: boolean,
  storageError: boolean,
  scope: Exclude<WorkoutSessionScope, { status: 'pending' }>,
  resolvedScopeKey: string,
): StoreSnapshot {
  if (scope.status === 'signed-out') {
    return {
      access: 'ready',
      cache,
      ownerPersisted,
      resolvedScopeKey,
      storageError,
    };
  }

  if (isOwnerUser(cache.owner, scope.userId)) {
    return {
      access: 'ready',
      cache,
      ownerPersisted,
      resolvedScopeKey,
      storageError,
    };
  }

  const canTransferOwnership =
    cache.owner.kind === 'guest' || isEmptyWorkoutSessionCache(cache);
  if (!canTransferOwnership) {
    return {
      access: 'account-conflict',
      cache,
      ownerPersisted,
      resolvedScopeKey,
      storageError,
    };
  }

  const transferredCache: WorkoutSessionCache = {
    ...cache,
    owner: { kind: 'user', userId: scope.userId },
  };
  const persisted = saveWorkoutSessionCache(transferredCache);

  return {
    access: 'ready',
    cache: transferredCache,
    ownerPersisted: persisted,
    resolvedScopeKey,
    storageError: !persisted,
  };
}

export function useWorkoutSessionStore(scope: WorkoutSessionScope) {
  const [snapshot, setSnapshot] = useState<StoreSnapshot>({
    access: 'pending',
    cache: null,
    ownerPersisted: false,
    resolvedScopeKey: null,
    storageError: false,
  });
  const snapshotRef = useRef(snapshot);
  const sessionsRef = useRef<WorkoutSessionsByDate>(EMPTY_SESSIONS);
  const scopeKey = getScopeKey(scope);
  const scopeStatus = scope.status;
  const signedInUserId =
    scope.status === 'signed-in' ? scope.userId : undefined;

  const applySnapshot = useCallback((nextSnapshot: StoreSnapshot) => {
    snapshotRef.current = nextSnapshot;
    sessionsRef.current =
      nextSnapshot.access === 'ready' && nextSnapshot.cache
        ? nextSnapshot.cache.sessions
        : EMPTY_SESSIONS;
    setSnapshot(nextSnapshot);
  }, []);

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (!active) return;

      if (scopeStatus === 'pending') {
        applySnapshot({
          ...snapshotRef.current,
          access: 'pending',
          resolvedScopeKey: scopeKey,
        });
        return;
      }

      let currentSnapshot = snapshotRef.current;
      if (!currentSnapshot.cache) {
        const initialOwner: WorkoutSessionOwner = signedInUserId
          ? { kind: 'user', userId: signedInUserId }
          : { kind: 'guest' };
        const loaded = loadWorkoutSessionCache(initialOwner);
        currentSnapshot = {
          access: 'pending',
          cache: loaded.cache,
          ownerPersisted: loaded.persisted,
          resolvedScopeKey: null,
          storageError: loaded.storageError,
        };
      }

      const cache = currentSnapshot.cache;
      if (!cache) return;

      const activeScope: Exclude<
        WorkoutSessionScope,
        { status: 'pending' }
      > = signedInUserId
        ? { status: 'signed-in', userId: signedInUserId }
        : { status: 'signed-out' };

      applySnapshot(
        reconcileCache(
          cache,
          currentSnapshot.ownerPersisted,
          currentSnapshot.storageError,
          activeScope,
          scopeKey,
        ),
      );
    });

    return () => {
      active = false;
    };
  }, [applySnapshot, scopeKey, scopeStatus, signedInUserId]);

  const scopeIsResolved = snapshot.resolvedScopeKey === scopeKey;
  const canEdit = scopeIsResolved && snapshot.access === 'ready';
  const sessions = canEdit
    ? (snapshot.cache?.sessions ?? EMPTY_SESSIONS)
    : EMPTY_SESSIONS;

  const setSessions = useCallback(
    (updater: SessionsUpdater): boolean => {
      const currentSnapshot = snapshotRef.current;
      if (
        currentSnapshot.access !== 'ready' ||
        currentSnapshot.resolvedScopeKey !== scopeKey ||
        !currentSnapshot.cache ||
        scopeStatus === 'pending'
      ) {
        return false;
      }

      if (
        signedInUserId &&
        !isOwnerUser(currentSnapshot.cache.owner, signedInUserId)
      ) {
        return false;
      }

      const nextSessions =
        typeof updater === 'function'
          ? updater(currentSnapshot.cache.sessions)
          : updater;
      const nextCache: WorkoutSessionCache = {
        ...currentSnapshot.cache,
        sessions: nextSessions,
      };
      const persisted = saveWorkoutSessionCache(nextCache);

      applySnapshot({
        ...currentSnapshot,
        cache: nextCache,
        ownerPersisted: currentSnapshot.ownerPersisted || persisted,
        storageError: !persisted,
      });
      return true;
    },
    [applySnapshot, scopeKey, scopeStatus, signedInUserId],
  );

  const resolveAccountConflict = useCallback((): boolean => {
    const currentSnapshot = snapshotRef.current;
    if (
      !signedInUserId ||
      currentSnapshot.access !== 'account-conflict' ||
      currentSnapshot.resolvedScopeKey !== scopeKey
    ) {
      return false;
    }

    const nextCache: WorkoutSessionCache = {
      version: 2,
      owner: { kind: 'user', userId: signedInUserId },
      sessions: {},
    };
    if (!saveWorkoutSessionCache(nextCache)) {
      applySnapshot({ ...currentSnapshot, storageError: true });
      return false;
    }

    applySnapshot({
      access: 'ready',
      cache: nextCache,
      ownerPersisted: true,
      resolvedScopeKey: scopeKey,
      storageError: false,
    });
    return true;
  }, [applySnapshot, scopeKey, signedInUserId]);

  let syncUserId: string | undefined;
  if (
    canEdit &&
    snapshot.ownerPersisted &&
    scope.status === 'signed-in' &&
    snapshot.cache &&
    isOwnerUser(snapshot.cache.owner, scope.userId)
  ) {
    syncUserId = scope.userId;
  }

  return {
    sessions,
    sessionsRef,
    setSessions,
    storageError: snapshot.storageError,
    canEdit,
    syncUserId,
    accountConflict:
      scopeIsResolved && snapshot.access === 'account-conflict',
    resolveAccountConflict,
  };
}
