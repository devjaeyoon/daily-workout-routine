import { act, cleanup, renderHook } from '@testing-library/react';
import {
  createClient,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { useSupabaseAuth } from './useSupabaseAuth';

const testSupabase = vi.hoisted(() => ({
  client: null as SupabaseClient | null,
}));

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: true,
  get supabase() {
    return testSupabase.client;
  },
}));

async function advanceTimers(milliseconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

function createExpiredSession(): Session {
  return {
    access_token: 'test-access',
    refresh_token: 'test-refresh',
    token_type: 'bearer',
    expires_in: 3_600,
    expires_at: Math.floor(Date.now() / 1_000) - 60,
    user: {
      id: 'test-user',
      aud: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-09-01T00:00:00.000Z',
    },
  };
}

describe('useSupabaseAuth with the real Supabase SDK', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-06T10:00:00.000Z'));
    vi.stubGlobal('BroadcastChannel', undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    cleanup();
    await testSupabase.client?.auth.stopAutoRefresh();
    testSupabase.client = null;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it.each(['manual', 'online'] as const)(
    'recovers automatically after a %s retry hits the SDK failure cache',
    async (trigger) => {
      const storageKey = 'test-auth-session';
      const expiredSession = createExpiredSession();
      const storage = new Map([
        [storageKey, JSON.stringify(expiredSession)],
      ]);
      let serverAvailable = false;
      const fetcher = vi.fn<typeof fetch>(async () => {
        if (!serverAvailable) {
          return new Response('{}', { status: 503 });
        }

        return new Response(
          JSON.stringify({
            ...expiredSession,
            access_token: 'recovered-access',
            refresh_token: 'recovered-refresh',
            expires_at: Math.floor(Date.now() / 1_000) + 3_600,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      });
      const client = createClient('https://auth-test.invalid', 'test-key', {
        global: { fetch: fetcher },
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          storageKey,
          storage: {
            getItem: (key) => storage.get(key) ?? null,
            setItem: (key, value) => {
              storage.set(key, value);
            },
            removeItem: (key) => {
              storage.delete(key);
            },
          },
        },
      });
      testSupabase.client = client;
      const { result } = renderHook(() => useSupabaseAuth());

      // Let the SDK exhaust its built-in network retries and cache the 503.
      await advanceTimers(26_000);
      expect(result.current.status).toBe('error');
      const failedRequestCount = fetcher.mock.calls.length;
      expect(failedRequestCount).toBeGreaterThan(0);

      // Prove that the hook's scheduled retry, not the SDK's ticker, recovers.
      await client.auth.stopAutoRefresh();
      serverAvailable = true;
      act(() => {
        if (trigger === 'manual') {
          result.current.retryAuth();
        } else {
          window.dispatchEvent(new Event('online'));
        }
      });
      await advanceTimers(0);

      expect(result.current.status).toBe('retry-wait');
      expect(result.current.user).toBeNull();
      expect(fetcher).toHaveBeenCalledTimes(failedRequestCount);

      await advanceTimers(59_999);
      expect(result.current.status).toBe('retry-wait');
      expect(fetcher).toHaveBeenCalledTimes(failedRequestCount);

      await advanceTimers(1);
      expect(result.current.status).toBe('signed-in');
      expect(result.current.user?.id).toBe(expiredSession.user.id);
      expect(fetcher).toHaveBeenCalledTimes(failedRequestCount + 1);
    },
  );
});
