import * as Dialog from '@radix-ui/react-dialog';
import { formatRestLabel } from '../lib/format';
import { formatWorkoutDate } from '../lib/workoutDate';
import type { WorkoutSession } from '../types/workout';
import { Button } from './ui/button';

export function WorkoutHistoryDialog({
  session,
  onClose,
}: {
  session: WorkoutSession | null;
  onClose: () => void;
}) {
  const setCount =
    session?.exercises.reduce(
      (total, exercise) => total + exercise.sets.length,
      0,
    ) ?? 0;

  return (
    <Dialog.Root open={session !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed inset-x-4 top-[6vh] z-50 mx-auto flex max-h-[88vh] max-w-lg flex-col rounded-[28px] bg-[#F2F4F6] p-5 shadow-[0_16px_48px_rgb(0_0_0/0.18)] focus:outline-none"
          aria-describedby={undefined}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-[22px] font-bold tracking-tight text-[#191F28]">
                {session ? formatWorkoutDate(session.workoutDate) : ''}
              </Dialog.Title>
              <p className="mt-1 text-[14px] text-[#8B95A1]">
                {session?.exercises.length ?? 0}개 운동 · 총 {setCount}세트
              </p>
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" className="shrink-0 rounded-full">
                닫기
              </Button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
            {session?.exercises.map((exercise) => (
              <section
                key={exercise.id}
                className="rounded-[22px] bg-white p-4 shadow-[0_2px_10px_rgb(0_0_0/0.04)]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[17px] font-bold text-[#191F28]">
                    {exercise.exerciseName}
                  </h3>
                  <span className="shrink-0 text-[12px] font-bold text-[#3182F6]">
                    {exercise.category}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {exercise.sets.map((set) => (
                    <div
                      key={set.setNumber}
                      className="grid grid-cols-[3rem_1fr] gap-2 rounded-xl bg-[#F9FAFB] px-3 py-2.5 text-[13px]"
                    >
                      <span className="font-bold text-[#4E5968]">
                        {set.setNumber}세트
                      </span>
                      <span className="text-[#6B7684]">
                        <strong className="text-[#191F28]">
                          {set.weight}kg · {set.reps}회
                        </strong>
                        {' · '}
                        {set.rir}RIR · 휴식 {formatRestLabel(set.restTime)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
