import type { AuthStatus } from '@/features/auth/useSupabaseAuth';
import { formatWorkoutDate } from '@/features/workout/lib/workoutDate';
import type { SyncStatus } from '@/features/workout/hooks/useWorkoutSessions';
import { cn } from '@/shared/lib/cn';
import type { AppTab } from './BottomNavigation';

function syncStatusLabel(status: SyncStatus): string {
  switch (status) {
    case 'syncing':
      return '동기화 중';
    case 'synced':
      return '동기화됨';
    case 'offline':
      return '오프라인 저장';
    case 'error':
      return '저장 확인 필요';
    default:
      return '이 기기에 저장됨';
  }
}

function syncStatusIndicatorClass(
  authStatus: AuthStatus,
  syncStatus: SyncStatus,
): string {
  if (authStatus !== 'signed-in') return 'bg-[#B0B8C1]';

  switch (syncStatus) {
    case 'error':
      return 'bg-[#F04452]';
    case 'syncing':
    case 'offline':
      return 'bg-[#FFB020]';
    default:
      return 'bg-[#20C997]';
  }
}

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
              {activeTab === 'today' ? '오늘의 운동' : '운동 기록'}
            </h1>
            <p className="mt-0.5 text-[14px] font-semibold text-[#8B95A1]">
              {activeTab === 'today'
                ? `${formatWorkoutDate(currentDate)} · 새벽 4시 기준`
                : '운동한 날과 세트 기록을 모아봤어요'}
            </p>
          </div>
          <button
            type="button"
            className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-[#4E5968] shadow-sm transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3182F6]"
            aria-label={`계정 및 동기화 열기, ${syncStatusLabel(syncStatus)}`}
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
                syncStatusIndicatorClass(authStatus, syncStatus),
              )}
            />
          </button>
        </div>
        {activeTab === 'today' && authStatus !== 'signed-in' ? (
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
