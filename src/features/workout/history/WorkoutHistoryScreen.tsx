import { useMemo, useState } from 'react';
import type { WorkoutSessionsByDate } from '@/features/workout/model/types';
import { RecentWorkouts } from './RecentWorkouts';
import { WorkoutHeatmap } from './WorkoutHeatmap';
import { WorkoutHistoryDialog } from './WorkoutHistoryDialog';

type WorkoutHistoryScreenProps = {
  currentDate: string;
  sessions: WorkoutSessionsByDate;
  active: boolean;
};

export function WorkoutHistoryScreen({
  currentDate,
  sessions,
  active,
}: WorkoutHistoryScreenProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const recentSessions = useMemo(
    () =>
      Object.values(sessions)
        .filter((session) => session.exercises.length > 0)
        .sort((a, b) => b.workoutDate.localeCompare(a.workoutDate))
        .slice(0, 10),
    [sessions],
  );
  const selectedSession = selectedDate
    ? sessions[selectedDate] ?? null
    : null;

  if (!active) return null;

  return (
    <>
      <main className="mx-auto max-w-lg space-y-4 px-4 py-5">
        <WorkoutHeatmap
          sessions={sessions}
          currentDate={currentDate}
          onSelectDate={setSelectedDate}
        />
        <RecentWorkouts
          sessions={recentSessions}
          onSelectDate={setSelectedDate}
        />
      </main>

      <WorkoutHistoryDialog
        session={selectedSession}
        onClose={() => setSelectedDate(null)}
      />
    </>
  );
}
