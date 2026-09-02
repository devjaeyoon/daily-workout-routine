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
}) {
  const authPresentation = AUTH_STATUS_PRESENTATION[authStatus];
  const syncPresentation = SYNC_STATUS_PRESENTATION[syncStatus];
  const description = authPresentation.isSignedIn
    ? syncPresentation.accountDescription
    : '로그인 전에도 기록은 이 기기에 자동 저장돼요.';

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
                    disabled={syncStatus === 'syncing'}
                    onClick={() => void onSync()}
                  >
                    다시 동기화
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
