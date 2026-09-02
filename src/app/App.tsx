import { useState } from 'react';
import { useSupabaseAuth } from '@/features/auth/useSupabaseAuth';
import { WorkoutHistoryScreen } from '@/features/workout/history/WorkoutHistoryScreen';
import { useWorkoutSessions } from '@/features/workout/hooks/useWorkoutSessions';
import { TodayWorkoutScreen } from '@/features/workout/today/TodayWorkoutScreen';
import { AccountDialog } from './AccountDialog';
import { BottomNavigation, type AppTab } from './BottomNavigation';
import { Header } from './Header';
import { usePersistentStorage } from './usePersistentStorage';

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
  const {
    currentDate,
    currentLogs: workoutLogs,
    sessions,
    setCurrentLogs: setWorkoutLogs,
    syncStatus,
    lastSyncedAt,
    syncFromRemote,
  } = useWorkoutSessions(user?.id);

  usePersistentStorage();

  const changeTab = (tab: AppTab) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  };

  return (
    <div className="min-h-dvh pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <Header
        activeTab={activeTab}
        currentDate={currentDate}
        authStatus={authStatus}
        syncStatus={syncStatus}
        onOpenAccount={() => setAccountOpen(true)}
      />

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
      />

      <BottomNavigation activeTab={activeTab} onTabChange={changeTab} />
    </div>
  );
}
