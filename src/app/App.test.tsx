import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSupabaseAuth } from '@/features/auth/useSupabaseAuth';
import { useWorkoutSessions } from '@/features/workout/hooks/useWorkoutSessions';
import App from './App';

vi.mock('@/features/auth/useSupabaseAuth', () => ({
  useSupabaseAuth: vi.fn(),
}));

vi.mock('@/features/workout/hooks/useWorkoutSessions', () => ({
  useWorkoutSessions: vi.fn(),
}));

vi.mock('./usePersistentStorage', () => ({
  usePersistentStorage: vi.fn(),
}));

const useSupabaseAuthMock = vi.mocked(useSupabaseAuth);
const useWorkoutSessionsMock = vi.mocked(useWorkoutSessions);

describe('App auth initialization failure', () => {
  const retryAuth = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useSupabaseAuthMock.mockReturnValue({
      user: null,
      status: 'error',
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      retryAuth,
    });
    useWorkoutSessionsMock.mockReturnValue({
      currentDate: '2026-09-04',
      currentLogs: [],
      sessions: {},
      setCurrentLogs: vi.fn(),
      syncStatus: 'local',
      lastSyncedAt: null,
      syncFromRemote: vi.fn(),
      resolveAccountConflict: vi.fn(),
    });
  });

  it('protects workout access and offers an auth retry', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: '계정을 확인하지 못했어요',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/운동 기록을 보호하기 위해/)).toBeInTheDocument();
    expect(useWorkoutSessionsMock).toHaveBeenCalledWith({
      status: 'pending',
    });

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(retryAuth).toHaveBeenCalledTimes(1);
  });

  it('protects workout access while waiting and explains the automatic retry', () => {
    useSupabaseAuthMock.mockReturnValue({
      ...useSupabaseAuthMock(),
      status: 'retry-wait',
    });
    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '잠시 후 다시 시도할게요',
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      '최대 1분 뒤 계정을 자동으로 다시 확인해요.',
    );
    const retryButton = screen.getByRole('button', {
      name: '자동 재시도 대기 중',
    });
    expect(retryButton).toBeDisabled();
    fireEvent.click(retryButton);
    expect(retryAuth).not.toHaveBeenCalled();
    expect(useWorkoutSessionsMock).toHaveBeenCalledWith({
      status: 'pending',
    });
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
