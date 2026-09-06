import { useEffect, useState } from 'react';
import type { AuthStatus } from '@/features/auth/useSupabaseAuth';
import { useSupabaseAuth } from '@/features/auth/useSupabaseAuth';
import { WorkoutHistoryScreen } from '@/features/workout/history/WorkoutHistoryScreen';
import {
  useWorkoutSessions,
  type WorkoutSessionScope,
} from '@/features/workout/hooks/useWorkoutSessions';
import { TodayWorkoutScreen } from '@/features/workout/today/TodayWorkoutScreen';
import { Button } from '@/shared/ui/button';
import { AccountDialog } from './AccountDialog';
import { BottomNavigation, type AppTab } from './BottomNavigation';
import { Header } from './Header';
import { usePersistentStorage } from './usePersistentStorage';

function getWorkoutSessionScope(
  authStatus: AuthStatus,
  userId: string | undefined,
): WorkoutSessionScope {
  if (
    authStatus === 'loading' ||
    authStatus === 'error' ||
    authStatus === 'retry-wait'
  ) {
    return { status: 'pending' };
  }
  if (authStatus === 'signed-in' && userId) {
    return { status: 'signed-in', userId };
  }

  return { status: 'signed-out' };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [accountOpen, setAccountOpen] = useState(false);
  const {
    user,
    status: authStatus,
    signIn,
    signUp,
    signOut,
    retryAuth,
  } = useSupabaseAuth();
  const workoutScope = getWorkoutSessionScope(authStatus, user?.id);
  const {
    currentDate,
    currentLogs: workoutLogs,
    sessions,
    setCurrentLogs: setWorkoutLogs,
    syncStatus,
    lastSyncedAt,
    syncFromRemote,
    resolveAccountConflict,
  } = useWorkoutSessions(workoutScope);

  usePersistentStorage();

  useEffect(() => {
    if (syncStatus !== 'account-conflict') return;

    let active = true;
    queueMicrotask(() => {
      if (active) setAccountOpen(true);
    });
    return () => {
      active = false;
    };
  }, [syncStatus]);

  const changeTab = (tab: AppTab) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  };

  if (authStatus === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <p
          className="text-[15px] font-semibold text-[#6B7684]"
          role="status"
        >
          저장된 운동 기록의 계정을 확인하고 있어요.
        </p>
      </main>
    );
  }

  if (authStatus === 'error') {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <div className="max-w-sm text-center" role="alert">
          <h1 className="text-[22px] font-bold text-[#191F28]">
            계정을 확인하지 못했어요
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[#6B7684]">
            저장된 운동 기록을 보호하기 위해 계정을 확인할 때까지 기록을
            숨기고 있어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.
          </p>
          <Button
            type="button"
            className="mt-5"
            onClick={retryAuth}
          >
            다시 시도
          </Button>
        </div>
      </main>
    );
  }

  if (authStatus === 'retry-wait') {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <div role="status">
            <h1 className="text-[22px] font-bold text-[#191F28]">
              잠시 후 다시 시도할게요
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-[#6B7684]">
              저장된 운동 기록은 계속 보호하고 있어요. 최대 1분 뒤 계정을
              자동으로 다시 확인해요.
            </p>
          </div>
          <Button type="button" className="mt-5" disabled>
            자동 재시도 대기 중
          </Button>
        </div>
      </main>
    );
  }

  const hasAccountConflict = syncStatus === 'account-conflict';

  return (
    <div className="min-h-dvh pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <Header
        activeTab={activeTab}
        currentDate={currentDate}
        authStatus={authStatus}
        syncStatus={syncStatus}
        onOpenAccount={() => setAccountOpen(true)}
      />

      {hasAccountConflict ? (
        <main className="mx-auto max-w-lg px-4 py-12 text-center">
          <h2 className="text-[20px] font-bold text-[#191F28]">
            기존 기록을 보호하고 있어요
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#6B7684]">
            계정을 확인하기 전에는 이 기기의 운동 기록을 보거나 수정할 수
            없어요.
          </p>
          <button
            type="button"
            className="mt-5 rounded-3xl bg-[#3182F6] px-5 py-3 text-[15px] font-semibold text-white"
            onClick={() => setAccountOpen(true)}
          >
            계정 확인하기
          </button>
        </main>
      ) : (
        <>
          <TodayWorkoutScreen
            currentDate={currentDate}
            workoutLogs={workoutLogs}
            setWorkoutLogs={setWorkoutLogs}
            active={activeTab === 'today'}
          />
          <WorkoutHistoryScreen
            currentDate={currentDate}
            sessions={sessions}
            active={activeTab === 'history'}
          />
        </>
      )}

      <AccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        authStatus={authStatus}
        syncStatus={syncStatus}
        email={user?.email}
        lastSyncedAt={lastSyncedAt}
        onSignIn={signIn}
        onSignUp={signUp}
        onSignOut={signOut}
        onSync={syncFromRemote}
        onResolveAccountConflict={resolveAccountConflict}
      />

      {hasAccountConflict ? null : (
        <BottomNavigation activeTab={activeTab} onTabChange={changeTab} />
      )}
    </div>
  );
}
