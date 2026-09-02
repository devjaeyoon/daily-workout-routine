import type { WorkoutExercise } from '@/features/workout/model/types';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';

type ExerciseQuickNavProps = {
  exercises: WorkoutExercise[];
  expandedExerciseId: string | null;
  copyDone: boolean;
  onSelectExercise: (exerciseId: string) => void;
  onAddExercise: () => void;
  onCopyWorkout: () => void;
};

function AddIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CopyIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="size-6"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  return (
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
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

export function ExerciseQuickNav({
  exercises,
  expandedExerciseId,
  copyDone,
  onSelectExercise,
  onAddExercise,
  onCopyWorkout,
}: ExerciseQuickNavProps) {
  return (
    <nav
      className="sticky top-0 z-30 border-y border-[#E5E8EB]/90 bg-white/95 shadow-[0_4px_16px_rgb(0_0_0/0.05)] backdrop-blur-md"
      aria-label="운동 빠른 이동"
    >
      <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-2">
        <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {exercises.length > 0 ? (
            <div className="flex w-max items-center gap-2 pr-1">
              {exercises.map((exercise, index) => {
                const selected = expandedExerciseId === exercise.id;

                return (
                  <button
                    key={exercise.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelectExercise(exercise.id)}
                    className={cn(
                      'flex h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-[14px] font-bold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3182F6] focus-visible:ring-offset-2 motion-reduce:transition-none',
                      selected
                        ? 'border-[#3182F6] bg-[#E8F3FF] text-[#1B64DA]'
                        : 'border-[#E5E8EB] bg-[#F9FAFB] text-[#4E5968] hover:bg-[#F2F4F6]',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full text-[12px] tabular-nums',
                        selected
                          ? 'bg-[#3182F6] text-white'
                          : 'bg-white text-[#8B95A1]',
                      )}
                    >
                      {index + 1}
                    </span>
                    <span>{exercise.exerciseName}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="whitespace-nowrap px-1 text-[13px] font-semibold text-[#8B95A1]">
              운동을 추가해 주세요
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 border-l border-[#EEF1F4] pl-2">
          <Button
            type="button"
            variant="icon"
            className="rounded-full border-[#3182F6] bg-[#3182F6] text-white hover:bg-[#1B64DA]"
            onClick={onAddExercise}
            aria-label="운동 추가"
            title="운동 추가"
          >
            <AddIcon />
          </Button>
          <Button
            type="button"
            variant="icon"
            className={cn(
              'rounded-full',
              copyDone
                ? 'border-[#20C997] bg-[#E8FAF4] text-[#087F5B] hover:bg-[#E8FAF4]'
                : 'text-[#4E5968]',
            )}
            onClick={onCopyWorkout}
            disabled={exercises.length === 0}
            aria-label={copyDone ? '복사됨' : '기록 복사'}
            title={copyDone ? '복사됨' : '기록 복사'}
          >
            <CopyIcon done={copyDone} />
          </Button>
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          {copyDone ? '복사됨' : ''}
        </span>
      </div>
    </nav>
  );
}
