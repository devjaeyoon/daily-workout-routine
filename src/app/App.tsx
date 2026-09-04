import { useEffect, useState } from 'react';
import type { AuthStatus } from '@/features/auth/useSupabaseAuth';
import { useSupabaseAuth } from '@/features/auth/useSupabaseAuth';
import { WorkoutHistoryScreen } from '@/features/workout/history/WorkoutHistoryScreen';
import {
  useWorkoutSessions,
  type WorkoutSessionScope,
} from '@/features/workout/hooks/useWorkoutSessions';
import { TodayWorkoutScreen } from '@/features/workout/today/TodayWorkoutScreen';
import { AccountDialog } from './AccountDialog';
import { BottomNavigation, type AppTab } from './BottomNavigation';
import { Header } from './Header';
import { usePersistentStorage } from './usePersistentStorage';

function getWorkoutSessionScope(
  authStatus: AuthStatus,
  userId: string | undefined,
): WorkoutSessionScope {
  if (authStatus === 'loading') return { status: 'pending' };
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
