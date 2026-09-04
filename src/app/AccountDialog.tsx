import * as Dialog from '@radix-ui/react-dialog';
import { AuthCard } from '@/features/auth/AuthCard';
import type { AuthStatus } from '@/features/auth/useSupabaseAuth';
import type { SyncStatus } from '@/features/workout/hooks/useWorkoutSessions';
import { Button } from '@/shared/ui/button';
import {
  AUTH_STATUS_PRESENTATION,
  SYNC_STATUS_PRESENTATION,
} from './presentation';

export function AccountDialog({
  open,
  onOpenChange,
  authStatus,
  syncStatus,
  email,
  lastSyncedAt,
  onSignIn,
  onSignUp,
  onSignOut,
  onSync,
  onResolveAccountConflict,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authStatus: AuthStatus;
  syncStatus: SyncStatus;
  email?: string;
  lastSyncedAt: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<boolean>;
  onSignOut: () => Promise<void>;
  onSync: () => Promise<void>;
  onResolveAccountConflict: () => boolean;
}) {
  const authPresentation = AUTH_STATUS_PRESENTATION[authStatus];
  const syncPresentation = SYNC_STATUS_PRESENTATION[syncStatus];
  const description = authPresentation.isSignedIn
    ? syncPresentation.accountDescription
    : '로그인 전에도 기록은 이 기기에 자동 저장돼요.';
  const hasAccountConflict = syncStatus === 'account-conflict';

  const handleResetAccount = () => {
    const confirmed = window.confirm(
      '이 기기에만 남아 있는 이전 계정의 운동 기록이 삭제될 수 있어요. 서버에 저장된 기록은 삭제되지 않아요. 이 기기 기록을 초기화하고 계속할까요?',
    );
    if (confirmed) onResolveAccountConflict();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed inset-x-4 top-[8vh] z-50 mx-auto flex max-h-[84vh] max-w-lg flex-col rounded-[28px] bg-[#F2F4F6] p-5 shadow-[0_16px_48px_rgb(0_0_0/0.18)] focus:outline-none"
          aria-describedby={undefined}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-[22px] font-bold tracking-tight text-[#191F28]">
                계정 및 동기화
              </Dialog.Title>
              <p className="mt-1 text-[14px] text-[#8B95A1]">
                {description}
              </p>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                className="shrink-0 rounded-full"
              >
                닫기
              </Button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
            {authPresentation.isSignedIn ? (
              <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_2px_12px_rgb(0_0_0/0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[#8B95A1]">
                      저장 상태
                    </p>
                    <p className="mt-0.5 text-[15px] font-bold text-[#191F28]">
                      {syncPresentation.accountLabel}
                    </p>
                    {lastSyncedAt ? (
                      <p className="mt-0.5 text-[12px] text-[#8B95A1]">
                        마지막 동기화{' '}
                        {new Date(lastSyncedAt).toLocaleString('ko-KR')}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0 px-4 py-2.5 text-[13px]"
                    disabled={
                      syncStatus === 'syncing' || hasAccountConflict
                    }
                    onClick={() => void onSync()}
                  >
                    다시 동기화
                  </Button>
                </div>
              </div>
            ) : null}

            {hasAccountConflict ? (
              <div
                className="rounded-2xl border border-[#FECACA] bg-[#FFF5F5] p-4"
                role="alert"
              >
                <p className="text-[16px] font-bold text-[#191F28]">
                  다른 계정의 기록이 있어요
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-[#6B7684]">
                  기록을 섞지 않기 위해 조회, 편집, 동기화를 잠시 막았어요.
                  기존 계정으로 다시 로그인하거나 이 기기의 기록을 초기화해
                  주세요.
                </p>
                <div className="mt-4 space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => void onSignOut()}
                  >
                    로그아웃 후 기존 계정으로 다시 로그인
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-[#FECACA] text-[#D92D20]"
                    onClick={handleResetAccount}
                  >
                    이 기기 기록 초기화 후 계속
                  </Button>
                </div>
              </div>
            ) : null}

            <AuthCard
              status={authStatus}
              email={email}
              onSignIn={onSignIn}
              onSignUp={onSignUp}
              onSignOut={onSignOut}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
