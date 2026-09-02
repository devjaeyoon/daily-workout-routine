import { useMemo } from 'react';
import {
  addDays,
  dateToKey,
  formatWorkoutDate,
  parseDateKey,
} from '@/features/workout/lib/workoutDate';
import type { WorkoutSessionsByDate } from '@/features/workout/model/types';
import { cn } from '@/shared/lib/cn';
import { Card } from '@/shared/ui/card';

const WEEKS_TO_SHOW = 18;

type HeatmapDay = {
  date: string;
  setCount: number;
  isFuture: boolean;
};

function getColor(setCount: number): string {
  if (setCount === 0) return 'bg-[#EEF1F4]';
  if (setCount <= 5) return 'bg-[#9BE9A8]';
  if (setCount <= 10) return 'bg-[#40C463]';
  if (setCount <= 15) return 'bg-[#30A14E]';
  return 'bg-[#216E39]';
}

export function WorkoutHeatmap({
  sessions,
  currentDate,
  onSelectDate,
}: {
  sessions: WorkoutSessionsByDate;
  currentDate: string;
  onSelectDate: (date: string) => void;
}) {
  const days = useMemo(() => {
    const today = parseDateKey(currentDate);
    const end = addDays(today, 6 - today.getDay());
    const start = addDays(end, -(WEEKS_TO_SHOW * 7 - 1));

    return Array.from({ length: WEEKS_TO_SHOW * 7 }, (_, index) => {
      const date = dateToKey(addDays(start, index));
      const session = sessions[date];
      const setCount =
        session?.exercises.reduce(
          (total, exercise) => total + exercise.sets.length,
          0,
        ) ?? 0;

      return {
        date,
        setCount,
        isFuture: date > currentDate,
      } satisfies HeatmapDay;
    });
  }, [currentDate, sessions]);

  const workoutDays = days.filter((day) => day.setCount > 0).length;

  return (
    <Card>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#191F28]">운동 잔디</h2>
          <p className="mt-0.5 text-[13px] text-[#8B95A1]">
            최근 {WEEKS_TO_SHOW}주 동안 {workoutDays}일 운동했어요.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[11px] text-[#8B95A1]">
          <span>적게</span>
          {[0, 4, 8, 13, 16].map((count) => (
            <span
              key={count}
              className={cn('size-2.5 rounded-[3px]', getColor(count))}
            />
          ))}
          <span>많이</span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <div className="grid grid-rows-7 gap-1 pt-0.5 text-[10px] font-semibold text-[#B0B8C1]">
          <span />
          <span>월</span>
          <span />
          <span>수</span>
          <span />
          <span>금</span>
          <span />
        </div>
        <div
          className="grid min-w-0 flex-1 grid-flow-col grid-rows-7 gap-1"
          aria-label="날짜별 운동 기록"
        >
          {days.map((day) => {
            const hasWorkout = day.setCount > 0;
            const label = `${formatWorkoutDate(day.date)}${
              hasWorkout ? `, ${day.setCount}세트` : ', 운동 기록 없음'
            }`;

            return (
              <button
                key={day.date}
                type="button"
                aria-label={label}
                title={label}
                disabled={!hasWorkout || day.isFuture}
                onClick={() => onSelectDate(day.date)}
                className={cn(
                  'aspect-square min-w-0 rounded-[4px] ring-offset-1 transition-transform enabled:hover:scale-110 enabled:focus-visible:outline-none enabled:focus-visible:ring-2 enabled:focus-visible:ring-[#3182F6]',
                  getColor(day.setCount),
                  day.isFuture && 'opacity-35',
                  hasWorkout ? 'cursor-pointer' : 'cursor-default',
                )}
              />
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-[12px] text-[#8B95A1]">
        초록색 칸을 누르면 그날의 상세 기록을 볼 수 있어요.
      </p>
    </Card>
  );
}
