import {
  isAuthRetryableFetchError,
  type User,
} from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/shared/lib/supabase';

export type AuthStatus =
  | 'loading'
  | 'error'
  | 'retry-wait'
  | 'signed-out'
  | 'signed-in'
  | 'unconfigured';

const AUTH_INITIALIZATION_TIMEOUT_MS = 10_000;
// auth-js 2.111 caches refresh failures for 60 seconds. Use a conservative
// delay from the returned error without reading or modifying SDK internals.
const AUTH_RETRY_WAIT_MS = 60_000;

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? 'loading' : 'unconfigured',
  );
  const mountedRef = useRef(false);
  const generationRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const statusRef = useRef(status);

  const clearAuthTimers = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (retryTimeoutRef.current !== null) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const applyAuthState = useCallback(
    (nextStatus: AuthStatus, nextUser: User | null) => {
      if (!mountedRef.current) return;
      statusRef.current = nextStatus;
      setUser(nextUser);
      setStatus(nextStatus);
    },
    [],
  );

  const initializeAuth = useCallback(function initializeAuth(
    allowScheduledRetry: boolean,
  ) {
    if (!supabase || !mountedRef.current) return;

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    clearAuthTimers();
    applyAuthState('loading', null);

    timeoutRef.current = window.setTimeout(() => {
      if (
        !mountedRef.current ||
        generationRef.current !== generation
      ) {
        return;
      }

      timeoutRef.current = null;
      applyAuthState('error', null);
    }, AUTH_INITIALIZATION_TIMEOUT_MS);

    const failInitialization = (error: unknown) => {
      if (
        !mountedRef.current ||
        generationRef.current !== generation
      ) {
        return;
      }

      clearAuthTimers();
      if (allowScheduledRetry && isAuthRetryableFetchError(error)) {
        applyAuthState('retry-wait', null);
        retryTimeoutRef.current = window.setTimeout(() => {
          if (
            mountedRef.current &&
            generationRef.current === generation
          ) {
            // One follow-up per manual/online retry, not an automatic loop.
            initializeAuth(false);
          }
        }, AUTH_RETRY_WAIT_MS);
        return;
      }

      applyAuthState('error', null);
    };

    try {
      void supabase.auth.getSession().then(
        ({ data, error }) => {
          if (
            !mountedRef.current ||
            generationRef.current !== generation
          ) {
            return;
          }

          if (error) {
            failInitialization(error);
            return;
          }

          clearAuthTimers();
          applyAuthState(
            data.session ? 'signed-in' : 'signed-out',
            data.session?.user ?? null,
          );
        },
        failInitialization,
      );
    } catch (error) {
      failInitialization(error);
    }
  }, [applyAuthState, clearAuthTimers]);

  const retryAuth = useCallback(() => {
    if (statusRef.current === 'retry-wait') return;
    initializeAuth(true);
  }, [initializeAuth]);

  useEffect(() => {
    if (!supabase) return;

    mountedRef.current = true;
    const initialGeneration = generationRef.current;
    queueMicrotask(() => {
      if (
        mountedRef.current &&
        generationRef.current === initialGeneration
      ) {
        initializeAuth(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;

      generationRef.current += 1;
      clearAuthTimers();
      applyAuthState(
        session ? 'signed-in' : 'signed-out',
        session?.user ?? null,
      );
    });

    const handleOnline = () => {
      if (statusRef.current === 'error') retryAuth();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      clearAuthTimers();
      window.removeEventListener('online', handleOnline);
      subscription.unsubscribe();
    };
  }, [applyAuthState, clearAuthTimers, initializeAuth, retryAuth]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return Boolean(data.session);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return {
    user,
    status,
    signIn,
    signUp,
    signOut,
    retryAuth,
  };
}
