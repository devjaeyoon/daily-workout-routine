import type { AuthStatus } from '@/features/auth/useSupabaseAuth';
import type { SyncStatus } from '@/features/workout/hooks/useWorkoutSessions';
import { cn } from '@/shared/lib/cn';
import type { AppTab } from './BottomNavigation';
import {
  APP_TAB_PRESENTATION,
  AUTH_STATUS_PRESENTATION,
  SYNC_STATUS_PRESENTATION,
} from './presentation';

export function Header({
  activeTab,
  currentDate,
  authStatus,
  syncStatus,
  onOpenAccount,
}: {
  activeTab: AppTab;
  currentDate: string;
  authStatus: AuthStatus;
  syncStatus: SyncStatus;
  onOpenAccount: () => void;
}) {
  const authPresentation = AUTH_STATUS_PRESENTATION[authStatus];
  const syncPresentation = SYNC_STATUS_PRESENTATION[syncStatus];
  const tabPresentation = APP_TAB_PRESENTATION[activeTab];

  return (
    <header
      className={cn(
        'border-b border-[#E5E8EB]/80 bg-[#F2F4F6] px-4 py-4',
        activeTab === 'history' &&
          'sticky top-0 z-30 bg-[#F2F4F6]/90 backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[#191F28]">
              {tabPresentation.headerTitle}
            </h1>
            <p className="mt-0.5 text-[14px] font-semibold text-[#8B95A1]">
              {tabPresentation.headerDescription(currentDate)}
            </p>
          </div>
          <button
            type="button"
            className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-[#4E5968] shadow-sm transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3182F6]"
            aria-label={`계정 및 동기화 열기, ${syncPresentation.headerLabel}`}
            onClick={onOpenAccount}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-6"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
            <span
              className={cn(
                'absolute bottom-0.5 right-0.5 size-3 rounded-full border-2 border-white',
                authPresentation.isSignedIn
                  ? syncPresentation.indicatorClassName
                  : 'bg-[#B0B8C1]',
              )}
            />
          </button>
        </div>
        {activeTab === 'today' && authPresentation.showBackupPrompt ? (
          <button
            type="button"
            className="w-fit rounded-3xl px-3 py-2 text-[13px] font-semibold text-[#8B95A1] hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3182F6]"
            onClick={onOpenAccount}
          >
            로그인하고 백업
          </button>
        ) : null}
      </div>
    </header>
  );
}
