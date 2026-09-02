import { formatWorkoutDate } from '@/features/workout/lib/workoutDate';
import type { WorkoutSession } from '@/features/workout/model/types';
import { Card } from '@/shared/ui/card';

export function RecentWorkouts({
  sessions,
  onSelectDate,
}: {
  sessions: WorkoutSession[];
  onSelectDate: (date: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <Card className="py-12 text-center">
        <p className="text-[16px] font-bold text-[#191F28]">
          아직 완료한 운동이 없어요
        </p>
        <p className="mt-1 text-[14px] text-[#8B95A1]">
          오늘 운동을 기록하면 여기에 차곡차곡 쌓여요.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-[18px] font-bold text-[#191F28]">최근 운동</h2>
        <p className="mt-0.5 text-[13px] text-[#8B95A1]">
          날짜를 누르면 세트별 기록을 볼 수 있어요.
        </p>
      </div>
      <div className="divide-y divide-[#EEF1F4]">
        {sessions.map((session) => {
          const setCount = session.exercises.reduce(
            (total, exercise) => total + exercise.sets.length,
            0,
          );
          const names = session.exercises
            .slice(0, 2)
            .map((exercise) => exercise.exerciseName)
            .join(', ');
          const extraCount = Math.max(0, session.exercises.length - 2);

          return (
            <button
              key={session.workoutDate}
              type="button"
              className="flex w-full items-center justify-between gap-4 py-3.5 text-left transition-colors first:pt-1 last:pb-1 hover:text-[#3182F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3182F6]"
              onClick={() => onSelectDate(session.workoutDate)}
            >
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-[#191F28]">
                  {formatWorkoutDate(session.workoutDate)}
                </p>
                <p className="mt-0.5 truncate text-[13px] text-[#8B95A1]">
                  {names}
                  {extraCount > 0 ? ` 외 ${extraCount}개` : ''}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#E8F3FF] px-3 py-1.5 text-[12px] font-bold text-[#3182F6]">
                {setCount}세트
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
