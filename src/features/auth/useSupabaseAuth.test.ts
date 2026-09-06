import { act, renderHook } from '@testing-library/react';
import { AuthRetryableFetchError } from '@supabase/supabase-js';
import type {
  AuthChangeEvent,
  Session,
  User,
} from '@supabase/supabase-js';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn<() => Promise<unknown>>(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
      signOut: authMocks.signOut,
    },
  },
}));

import { useSupabaseAuth } from './useSupabaseAuth';

type AuthStateCallback = (
  event: AuthChangeEvent,
  session: Session | null,
) => void;

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

function createUser(id: string): User {
  return {
    id,
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-09-04T00:00:00.000Z',
    email: `${id}@example.com`,
  } as User;
}

function createSession(id: string): Session {
  return {
    access_token: `access-${id}`,
    refresh_token: `refresh-${id}`,
    expires_in: 3_600,
    token_type: 'bearer',
    user: createUser(id),
  } as Session;
}

function sessionResponse(
  session: Session | null,
  error: Error | null = null,
) {
  return { data: { session }, error };
}

async function flushAsyncWork(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
    for (let index = 0; index < 4; index += 1) {
      await Promise.resolve();
    }
  });
}

async function advanceTimers(milliseconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

describe('useSupabaseAuth initialization recovery', () => {
  let emitAuthState: AuthStateCallback;

  beforeEach(() => {
    vi.useFakeTimers();
    authMocks.getSession.mockReset();
    authMocks.onAuthStateChange.mockReset();
    authMocks.signInWithPassword.mockReset();
    authMocks.signUp.mockReset();
    authMocks.signOut.mockReset();
    authMocks.unsubscribe.mockReset();
    authMocks.onAuthStateChange.mockImplementation(
      (callback: AuthStateCallback) => {
        emitAuthState = callback;
        return {
          data: {
            subscription: { unsubscribe: authMocks.unsubscribe },
          },
        };
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('initializes with an existing session', async () => {
    const session = createSession('signed-in-user');
    authMocks.getSession.mockResolvedValue(sessionResponse(session));

    const { result } = renderHook(() => useSupabaseAuth());
    await flushAsyncWork();

    expect(result.current.status).toBe('signed-in');
    expect(result.current.user).toBe(session.user);
  });

  it('initializes without a session as signed out', async () => {
    authMocks.getSession.mockResolvedValue(sessionResponse(null));

    const { result } = renderHook(() => useSupabaseAuth());
    await flushAsyncWork();

    expect(result.current.status).toBe('signed-out');
    expect(result.current.user).toBeNull();
  });

  it('moves to error with no user when getSession returns an error', async () => {
    authMocks.getSession.mockResolvedValue(
      sessionResponse(null, new Error('session lookup failed')),
    );

    const { result } = renderHook(() => useSupabaseAuth());
    await flushAsyncWork();

    expect(result.current.status).toBe('error');
    expect(result.current.user).toBeNull();
  });

  it('moves to error with no user when getSession rejects', async () => {
    authMocks.getSession.mockRejectedValue(new Error('network failed'));

    const { result } = renderHook(() => useSupabaseAuth());
    await flushAsyncWork();

    expect(result.current.status).toBe('error');
    expect(result.current.user).toBeNull();
  });

  it('does not treat an INITIAL_SESSION event with no session as sign-out', async () => {
    const initialRequest = deferred<unknown>();
    authMocks.getSession.mockReturnValue(initialRequest.promise);
    const { result } = renderHook(() => useSupabaseAuth());
    await flushAsyncWork();

    act(() => {
      emitAuthState('INITIAL_SESSION', null);
    });

    expect(result.current.status).toBe('loading');
    expect(result.current.user).toBeNull();
  });

  it('lets a later auth event supersede the pending initialization', async () => {
    const initialRequest = deferred<unknown>();
    const eventSession = createSession('event-user');
    authMocks.getSession.mockReturnValue(initialRequest.promise);
    const { result } = renderHook(() => useSupabaseAuth());
    await flushAsyncWork();

    act(() => {
      emitAuthState('SIGNED_IN', eventSession);
    });
    initialRequest.resolve(sessionResponse(null));
    await flushAsyncWork();

    expect(result.current.status).toBe('signed-in');
    expect(result.current.user).toBe(eventSession.user);
  });

  it('times out after ten seconds while leaving the request recoverable', async () => {
    const initialRequest = deferred<unknown>();
    authMocks.getSession.mockReturnValue(initialRequest.promise);
    const { result } = renderHook(() => useSupabaseAuth());
    await flushAsyncWork();

    await advanceTimers(9_999);
    expect(result.current.status).toBe('loading');

    await advanceTimers(1);
    expect(result.current.status).toBe('error');
    expect(result.current.user).toBeNull();

    const lateSession = createSession('late-user');
    initialRequest.resolve(sessionResponse(lateSession));
    await flushAsyncWork();

    expect(result.current.status).toBe('signed-in');
    expect(result.current.user).toBe(lateSession.user);
  });

  it('starts a fresh loading attempt when retried manually', async () => {
    const retryRequest = deferred<unknown>();
    authMocks.getSession
      .mockResolvedValueOnce(
        sessionResponse(null, new Error('temporary failure')),
      )
      .mockReturnValueOnce(retryRequest.promise);
    const { result } = renderHook(() => useSupabaseAuth());
    await flushAsyncWork();
    expect(result.current.status).toBe('error');

    act(() => {
      result.current.retryAuth();
    });
    expect(result.current.status).toBe('loading');
    expect(authMocks.getSession).toHaveBeenCalledTimes(2);

    const session = createSession('retry-user');
    retryRequest.resolve(sessionResponse(session));
    await flushAsyncWork();

    expect(result.current.status).toBe('signed-in');
    expect(result.current.user).toBe(session.user);
  });

  it('retries automatically when the browser comes online from error', async () => {
    const onlineRequest = deferred<unknown>();
    authMocks.getSession
      .mockRejectedValueOnce(new Error('offline'))
      .mockReturnValueOnce(onlineRequest.promise);
    const { result } = renderHook(() => useSupabaseAuth());
    await flushAsyncWork();
    expect(result.current.status).toBe('error');

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.status).toBe('loading');
    expect(authMocks.getSession).toHaveBeenCalledTimes(2);

    onlineRequest.resolve(sessionResponse(null));
    await flushAsyncWork();
    expect(result.current.status).toBe('signed-out');
  });

  it('ignores a response from before the latest retry', async () => {
    const firstRequest = deferred<unknown>();
    const retryRequest = deferred<unknown>();
    authMocks.getSession
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(retryRequest.promise);
    const { result } = renderHook(() => useSupabaseAuth());
    await flushAsyncWork();
    await advanceTimers(10_000);
    expect(result.current.status).toBe('error');

    act(() => {
      result.current.retryAuth();
    });
    const staleSession = createSession('stale-user');
    firstRequest.resolve(sessionResponse(staleSession));
    await flushAsyncWork();

    expect(result.current.status).toBe('loading');
    expect(result.current.user).toBeNull();

    const currentSession = createSession('current-user');
    retryRequest.resolve(sessionResponse(currentSession));
    await flushAsyncWork();

    expect(result.current.status).toBe('signed-in');
    expect(result.current.user).toBe(currentSession.user);
  });

  it('cleans up its subscription and timer and ignores work after unmount', async () => {
    const initialRequest = deferred<unknown>();
    authMocks.getSession.mockReturnValue(initialRequest.promise);
    const { unmount } = renderHook(() => useSupabaseAuth());
    await flushAsyncWork();
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(authMocks.unsubscribe).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    initialRequest.resolve(sessionResponse(createSession('late-user')));
    window.dispatchEvent(new Event('online'));
    await flushAsyncWork();

    expect(authMocks.getSession).toHaveBeenCalledTimes(1);
  });

  it('does not automatically retry the first network failure', async () => {
    authMocks.getSession.mockResolvedValue(
      sessionResponse(null, new AuthRetryableFetchError('offline', 0)),
    );
    const { result } = renderHook(() => useSupabaseAuth());
    await flushAsyncWork();
    await advanceTimers(60_000);

    expect(result.current.status).toBe('error');
    expect(authMocks.getSession).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('waits once after a retryable rejection and does not extend the wait on repeated retries', async () => {
    const networkError = new AuthRetryableFetchError('offline', 0);
    authMocks.getSession
      .mockResolvedValueOnce(sessionResponse(null, networkError))
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(sessionResponse(null));
    const { result } = renderHook(() => useSupabaseAuth());
    await flushAsyncWork();
    act(() => result.current.retryAuth());
    await flushAsyncWork();
    expect(result.current.status).toBe('retry-wait');

    await advanceTimers(30_000);
    act(() => {
      result.current.retryAuth();
      window.dispatchEvent(new Event('online'));
    });
    expect(authMocks.getSession).toHaveBeenCalledTimes(2);

    await advanceTimers(30_000);
    expect(result.current.status).toBe('signed-out');
    expect(authMocks.getSession).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('returns to error when the scheduled retry fails without creating a retry loop', async () => {
    authMocks.getSession.mockResolvedValue(
      sessionResponse(null, new AuthRetryableFetchError('offline', 0)),
    );
    const { result } = renderHook(() => useSupabaseAuth());
    await flushAsyncWork();
    act(() => result.current.retryAuth());
    await flushAsyncWork();

    await advanceTimers(60_000);
    expect(result.current.status).toBe('error');
    expect(result.current.user).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    await advanceTimers(120_000);
    expect(authMocks.getSession).toHaveBeenCalledTimes(3);

    act(() => result.current.retryAuth());
    await flushAsyncWork();
    expect(result.current.status).toBe('retry-wait');
  });

  it('applies the ten-second timeout to the scheduled request and still accepts its late success', async () => {
    const scheduledRequest = deferred<unknown>();
    const networkError = new AuthRetryableFetchError('offline', 0);
    authMocks.getSession
      .mockResolvedValueOnce(sessionResponse(null, networkError))
      .mockResolvedValueOnce(sessionResponse(null, networkError))
      .mockReturnValueOnce(scheduledRequest.promise);
    const { result } = renderHook(() => useSupabaseAuth());
    await flushAsyncWork();
    act(() => result.current.retryAuth());
    await flushAsyncWork();

    await advanceTimers(60_000);
    expect(result.current.status).toBe('loading');
    await advanceTimers(10_000);
    expect(result.current.status).toBe('error');

    scheduledRequest.resolve(sessionResponse(createSession('late-user')));
    await flushAsyncWork();
    expect(result.current.status).toBe('signed-in');
    expect(result.current.user?.id).toBe('late-user');
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED'] as const)(
    'cancels the scheduled retry when %s arrives',
    async (event) => {
      authMocks.getSession.mockResolvedValue(
        sessionResponse(null, new AuthRetryableFetchError('offline', 0)),
      );
      const { result } = renderHook(() => useSupabaseAuth());
      await flushAsyncWork();
      act(() => result.current.retryAuth());
      await flushAsyncWork();

      const session = event === 'SIGNED_OUT'
        ? null
        : createSession('event-user');
      act(() => emitAuthState(event, session));
      expect(vi.getTimerCount()).toBe(0);
      await advanceTimers(60_000);

      expect(result.current.status).toBe(
        session ? 'signed-in' : 'signed-out',
      );
      expect(result.current.user).toBe(session?.user ?? null);
      expect(authMocks.getSession).toHaveBeenCalledTimes(2);
    },
  );

  it('cleans up a scheduled retry on unmount in StrictMode', async () => {
    authMocks.getSession.mockResolvedValue(
      sessionResponse(null, new AuthRetryableFetchError('offline', 0)),
    );
    const { result, unmount } = renderHook(() => useSupabaseAuth(), {
      reactStrictMode: true,
    });
    await flushAsyncWork();
    act(() => result.current.retryAuth());
    await flushAsyncWork();
    expect(result.current.status).toBe('retry-wait');

    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(authMocks.unsubscribe).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new Event('online'));
    await advanceTimers(60_000);
    expect(authMocks.getSession).toHaveBeenCalledTimes(2);
  });

  it('ignores an old rejection without cancelling the latest scheduled retry', async () => {
    const firstRequest = deferred<unknown>();
    const networkError = new AuthRetryableFetchError('offline', 0);
    authMocks.getSession
      .mockReturnValueOnce(firstRequest.promise)
      .mockResolvedValueOnce(sessionResponse(null, networkError))
      .mockResolvedValueOnce(sessionResponse(createSession('latest-user')));
    const { result } = renderHook(() => useSupabaseAuth());
    await flushAsyncWork();
    await advanceTimers(10_000);
    act(() => result.current.retryAuth());
    await flushAsyncWork();

    firstRequest.reject(networkError);
    await flushAsyncWork();
    expect(result.current.status).toBe('retry-wait');
    expect(vi.getTimerCount()).toBe(1);

    await advanceTimers(60_000);
    expect(result.current.status).toBe('signed-in');
    expect(result.current.user?.id).toBe('latest-user');
    expect(authMocks.getSession).toHaveBeenCalledTimes(3);
  });
});
