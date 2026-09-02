import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccountDialog } from './components/AccountDialog';
import {
  BottomNavigation,
  type AppTab,
} from './components/BottomNavigation';
import { ExerciseLogCard } from './components/ExerciseLogCard';
import { ExercisePicker } from './components/ExercisePicker';
import { ExerciseQuickNav } from './components/ExerciseQuickNav';
import { RecentWorkouts } from './components/RecentWorkouts';
import { WorkoutHeatmap } from './components/WorkoutHeatmap';
import { WorkoutHistoryDialog } from './components/WorkoutHistoryDialog';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import {
  useWorkoutSessions,
  type SyncStatus,
} from './hooks/useWorkoutSessions';
import { buildPromptText } from './lib/format';
import { cn } from './lib/utils';
import { formatWorkoutDate, parseDateKey } from './lib/workoutDate';
import type { SetLog } from './types/workout';

function createDefaultSet(setNumber: number, prev?: SetLog): SetLog {
  return {
    setNumber,
    weight: prev?.weight ?? 20,
    reps: prev?.reps ?? 10,
    rir: prev?.rir ?? 2,
    restTime: prev?.restTime ?? 90,
  };
}

function renumberSets(sets: SetLog[]): SetLog[] {
  return sets.map((s, i) => ({ ...s, setNumber: i + 1 }));
}

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

function exerciseCardId(exerciseId: string): string {
  return `exercise-card-${exerciseId}`;
}

type ScrollRequest = {
  exerciseId: string;
  sequence: number;
};

type ExpansionState = {
  date: string;
  exerciseId: string | null;
  touched: boolean;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [accountOpen, setAccountOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(
    null,
  );
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
  const [expansionState, setExpansionState] = useState<ExpansionState>(
    () => ({
      date: currentDate,
      exerciseId: workoutLogs.at(-1)?.id ?? null,
      touched: false,
    }),
  );
  const [scrollRequest, setScrollRequest] = useState<ScrollRequest | null>(
    null,
  );
  const scrollSequenceRef = useRef(0);
  const copyDoneTimerRef = useRef<number | null>(null);

  const expandedExerciseId = useMemo(() => {
    const lastExerciseId = workoutLogs.at(-1)?.id ?? null;
    if (expansionState.date !== currentDate) return lastExerciseId;
    if (expansionState.exerciseId === null) {
      return expansionState.touched ? null : lastExerciseId;
    }
    return workoutLogs.some(
      (exercise) => exercise.id === expansionState.exerciseId,
    )
      ? expansionState.exerciseId
      : lastExerciseId;
  }, [currentDate, expansionState, workoutLogs]);

  useEffect(() => {
    if (!navigator.storage?.persist) return;
    void navigator.storage.persist();
  }, []);

  useEffect(() => {
    return () => {
      if (copyDoneTimerRef.current !== null) {
        window.clearTimeout(copyDoneTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      !scrollRequest ||
      expandedExerciseId !== scrollRequest.exerciseId
    ) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const card = document.getElementById(
        exerciseCardId(scrollRequest.exerciseId),
      );
      if (card) {
        const reduceMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches;
        card.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      }

      setScrollRequest((current) =>
        current?.sequence === scrollRequest.sequence ? null : current,
      );
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [expandedExerciseId, scrollRequest]);

  const alreadyAdded = useMemo(
    () => new Set(workoutLogs.map((l) => l.exerciseName)),
    [workoutLogs],
  );
  const recentSessions = useMemo(
    () =>
      Object.values(sessions)
        .filter((session) => session.exercises.length > 0)
        .sort((a, b) => b.workoutDate.localeCompare(a.workoutDate))
        .slice(0, 10),
    [sessions],
  );

  const requestExerciseScroll = useCallback((exerciseId: string) => {
    scrollSequenceRef.current += 1;
    setScrollRequest({
      exerciseId,
      sequence: scrollSequenceRef.current,
    });
  }, []);

  const addExercise = useCallback(
    (name: string, category: string) => {
      const id = crypto.randomUUID();
      setWorkoutLogs((prev) => [
        ...prev,
        {
          id,
          exerciseName: name,
          category,
          sets: [createDefaultSet(1)],
        },
      ]);
      setExpansionState({
        date: currentDate,
        exerciseId: id,
        touched: true,
      });
      requestExerciseScroll(id);
    },
    [currentDate, requestExerciseScroll, setWorkoutLogs],
  );

  const removeExercise = useCallback(
    (id: string) => {
      const removedIndex = workoutLogs.findIndex(
        (exercise) => exercise.id === id,
      );
      if (removedIndex < 0) return;

      const nextExpandedId =
        workoutLogs[removedIndex + 1]?.id ??
        workoutLogs[removedIndex - 1]?.id ??
        null;
      setExpansionState({
        date: currentDate,
        exerciseId: nextExpandedId,
        touched: true,
      });
      setWorkoutLogs((prev) => prev.filter((exercise) => exercise.id !== id));
    },
    [currentDate, setWorkoutLogs, workoutLogs],
  );

  const toggleExercise = useCallback(
    (exerciseId: string) => {
      setExpansionState({
        date: currentDate,
        exerciseId:
          expandedExerciseId === exerciseId ? null : exerciseId,
        touched: true,
      });
    },
    [currentDate, expandedExerciseId],
  );

  const selectExercise = useCallback(
    (exerciseId: string) => {
      setExpansionState({
        date: currentDate,
        exerciseId,
        touched: true,
      });
      requestExerciseScroll(exerciseId);
    },
    [currentDate, requestExerciseScroll],
  );

  const updateSet = useCallback(
    (exerciseId: string, setIndex: number, patch: Partial<SetLog>) => {
      setWorkoutLogs((prev) =>
        prev.map((ex) => {
          if (ex.id !== exerciseId) return ex;
          const sets = ex.sets.map((s, i) =>
            i === setIndex ? { ...s, ...patch } : s,
          );
          return { ...ex, sets };
        }),
      );
    },
    [setWorkoutLogs],
  );

  const addSet = useCallback((exerciseId: string) => {
    setWorkoutLogs((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const last = ex.sets[ex.sets.length - 1];
        const next = createDefaultSet(ex.sets.length + 1, last);
        return { ...ex, sets: [...ex.sets, next] };
      }),
    );
  }, [setWorkoutLogs]);

  const removeSet = useCallback((exerciseId: string, setIndex: number) => {
    setWorkoutLogs((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const filtered = ex.sets.filter((_, i) => i !== setIndex);
        return { ...ex, sets: renumberSets(filtered) };
      }),
    );
  }, [setWorkoutLogs]);

  const copyPrompt = useCallback(async () => {
    const text = buildPromptText(parseDateKey(currentDate), workoutLogs);
    if (copyDoneTimerRef.current !== null) {
      window.clearTimeout(copyDoneTimerRef.current);
      copyDoneTimerRef.current = null;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopyDone(true);
      copyDoneTimerRef.current = window.setTimeout(() => {
        setCopyDone(false);
        copyDoneTimerRef.current = null;
      }, 2000);
    } catch {
      setCopyDone(false);
    }
  }, [currentDate, workoutLogs]);

  const selectedHistory = selectedHistoryDate
    ? sessions[selectedHistoryDate] ?? null
    : null;

  const changeTab = (tab: AppTab) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  };

  return (
    <div className="min-h-dvh pb-[calc(6rem+env(safe-area-inset-bottom))]">
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
              onClick={() => setAccountOpen(true)}
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
                className={`absolute bottom-0.5 right-0.5 size-3 rounded-full border-2 border-white ${
                  authStatus !== 'signed-in'
                    ? 'bg-[#B0B8C1]'
                    : syncStatus === 'error'
                      ? 'bg-[#F04452]'
                      : syncStatus === 'syncing' || syncStatus === 'offline'
                        ? 'bg-[#FFB020]'
                        : 'bg-[#20C997]'
                }`}
              />
            </button>
          </div>
          {activeTab === 'today' && authStatus !== 'signed-in' ? (
            <button
              type="button"
              className="w-fit rounded-3xl px-3 py-2 text-[13px] font-semibold text-[#8B95A1] hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3182F6]"
              onClick={() => setAccountOpen(true)}
            >
              로그인하고 백업
            </button>
          ) : null}
        </div>
      </header>

      {activeTab === 'today' ? (
        <ExerciseQuickNav
          exercises={workoutLogs}
          expandedExerciseId={expandedExerciseId}
          copyDone={copyDone}
          onSelectExercise={selectExercise}
          onAddExercise={() => setPickerOpen(true)}
          onCopyWorkout={() => void copyPrompt()}
        />
      ) : null}

      <main className="mx-auto max-w-lg space-y-4 px-4 py-5">
        {activeTab === 'today' ? (
          workoutLogs.length === 0 ? (
            <div className="rounded-[24px] bg-white px-6 py-16 text-center shadow-[0_2px_12px_rgb(0_0_0/0.06)]">
              <p className="text-[17px] font-semibold text-[#191F28]">
                아직 추가된 운동이 없어요
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-[#8B95A1]">
                위의{' '}
                <span className="font-bold text-[#3182F6]">운동 추가</span>
                버튼으로 오늘 루틴을 만들어 보세요.
              </p>
            </div>
          ) : (
            workoutLogs.map((ex, index) => (
              <ExerciseLogCard
                key={ex.id}
                exercise={ex}
                index={index}
                expanded={expandedExerciseId === ex.id}
                cardId={exerciseCardId(ex.id)}
                onToggle={() => toggleExercise(ex.id)}
                onRemoveExercise={() => removeExercise(ex.id)}
                onUpdateSet={(i, p) => updateSet(ex.id, i, p)}
                onAddSet={() => addSet(ex.id)}
                onRemoveSet={(i) => removeSet(ex.id, i)}
              />
            ))
          )
        ) : (
          <>
            <WorkoutHeatmap
              sessions={sessions}
              currentDate={currentDate}
              onSelectDate={setSelectedHistoryDate}
            />
            <RecentWorkouts
              sessions={recentSessions}
              onSelectDate={setSelectedHistoryDate}
            />
          </>
        )}
      </main>

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        alreadyAdded={alreadyAdded}
        onPick={addExercise}
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

      <WorkoutHistoryDialog
        session={selectedHistory}
        onClose={() => setSelectedHistoryDate(null)}
      />

      <BottomNavigation activeTab={activeTab} onTabChange={changeTab} />
    </div>
  );
}
