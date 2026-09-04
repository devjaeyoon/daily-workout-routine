import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WORKOUT_SESSIONS_STORAGE_KEY } from '@/features/workout/data/workoutStorage';
import { AccountDialog } from './AccountDialog';

function renderConflictDialog({
  onSignOut = vi.fn().mockResolvedValue(undefined),
  onResolveAccountConflict = vi.fn().mockReturnValue(true),
}: {
  onSignOut?: () => Promise<void>;
  onResolveAccountConflict?: () => boolean;
} = {}) {
  render(
    <AccountDialog
      open
      onOpenChange={vi.fn()}
      authStatus="signed-in"
      syncStatus="account-conflict"
      email="new@example.com"
      lastSyncedAt={null}
      onSignIn={vi.fn().mockResolvedValue(undefined)}
      onSignUp={vi.fn().mockResolvedValue(true)}
      onSignOut={onSignOut}
      onSync={vi.fn().mockResolvedValue(undefined)}
      onResolveAccountConflict={onResolveAccountConflict}
    />,
  );

  return { onSignOut, onResolveAccountConflict };
}

describe('AccountDialog account conflict', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('keeps the original cache when reset confirmation is cancelled', () => {
    const originalPayload = JSON.stringify({ protected: 'cache' });
    window.localStorage.setItem(
      WORKOUT_SESSIONS_STORAGE_KEY,
      originalPayload,
    );
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { onResolveAccountConflict } = renderConflictDialog();

    fireEvent.click(
      screen.getByRole('button', {
        name: '이 기기 기록 초기화 후 계속',
      }),
    );

    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining('이 기기에만 남아 있는 이전 계정의 운동 기록'),
    );
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining('서버에 저장된 기록은 삭제되지 않아요'),
    );
    expect(onResolveAccountConflict).not.toHaveBeenCalled();
    expect(
      window.localStorage.getItem(WORKOUT_SESSIONS_STORAGE_KEY),
    ).toBe(originalPayload);
  });

  it('resets only after confirmation and offers signing back into the old account', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onSignOut = vi.fn().mockResolvedValue(undefined);
    const onResolveAccountConflict = vi.fn().mockReturnValue(true);
    renderConflictDialog({ onSignOut, onResolveAccountConflict });

    fireEvent.click(
      screen.getByRole('button', {
        name: '이 기기 기록 초기화 후 계속',
      }),
    );
    expect(onResolveAccountConflict).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole('button', {
        name: '로그아웃 후 기존 계정으로 다시 로그인',
      }),
    );
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
