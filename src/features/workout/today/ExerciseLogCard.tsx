import type {
  SetLog,
  WorkoutExercise,
} from '@/features/workout/model/types';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

type ExerciseLogCardProps = {
  exercise: WorkoutExercise;
  index: number;
  expanded: boolean;
  cardId: string;
  onToggle: () => void;
  onRemoveExercise: () => void;
  onUpdateSet: (setIndex: number, patch: Partial<SetLog>) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
};

function Stepper({
  label,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step: number;
  min: number;
  max: number;
}) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-stretch gap-2">
        <Button
          type="button"
          variant="icon"
          className="text-xl font-bold"
          onClick={dec}
          aria-label={`${label} 감소`}
        >
          −
        </Button>
        <div className="min-w-0 flex-1">
          <Input
            inputMode="decimal"
            className="h-11 px-4 py-0 text-center text-[20px] tabular-nums"
            value={
              Number.isFinite(value) && value !== 0 ? String(value) : ''
            }
            onChange={(e) => {
              if (e.target.value === '') {
                onChange(min);
                return;
              }
              const v = Number(e.target.value);
              if (Number.isNaN(v)) return;
              onChange(Math.min(max, Math.max(min, v)));
            }}
            aria-label={label}
          />
        </div>
        <Button
          type="button"
          variant="icon"
          className="text-xl font-bold"
          onClick={inc}
          aria-label={`${label} 증가`}
        >
          +
        </Button>
      </div>
    </div>
  );
}

function formatSetValue(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(2)));
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        'size-5 transition-transform motion-reduce:transition-none',
        expanded && 'rotate-180',
      )}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />
    </svg>
  );
}

export function ExerciseLogCard({
  exercise,
  index,
  expanded,
  cardId,
  onToggle,
  onRemoveExercise,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
}: ExerciseLogCardProps) {
  const toggleId = `${cardId}-toggle`;
  const contentId = `${cardId}-content`;

  return (
    <Card
      id={cardId}
      className={cn(
        'scroll-mt-[76px] overflow-hidden border p-0 transition-colors motion-reduce:transition-none',
        expanded
          ? 'border-[#3182F6] bg-[#F5F9FF]'
          : 'border-transparent bg-white',
      )}
    >
      <div className="flex items-center">
        <button
          id={toggleId}
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 p-5 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3182F6]"
          aria-expanded={expanded}
          aria-controls={contentId}
          aria-label={`${index + 1}번째 운동 ${exercise.exerciseName}, ${exercise.category}, ${exercise.sets.length}세트, ${expanded ? '접기' : '펼치기'}`}
          onClick={onToggle}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E8F3FF] text-[14px] font-extrabold text-[#3182F6] tabular-nums">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block break-words text-[18px] leading-snug font-bold text-[#191F28]">
              {exercise.exerciseName}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] font-semibold">
              <span className="text-[#3182F6]">{exercise.category}</span>
              <span className="text-[#B0B8C1]" aria-hidden="true">
                ·
              </span>
              <span className="text-[#8B95A1]">
                {exercise.sets.length}세트
              </span>
            </span>
          </span>
          <span className="shrink-0 text-[#8B95A1]">
            <ChevronIcon expanded={expanded} />
          </span>
        </button>
        <Button
          type="button"
          variant="ghost"
          className="mr-2 size-11 shrink-0 rounded-full p-0 text-[#B0B8C1] hover:text-[#F04452]"
          onClick={onRemoveExercise}
          aria-label={`${exercise.exerciseName} 삭제`}
          title="운동 삭제"
        >
          <TrashIcon />
        </Button>
      </div>

      {!expanded ? (
        <div
          className="flex flex-wrap gap-2 px-5 pb-5"
          aria-label={`${exercise.exerciseName} 세트 요약`}
        >
          {exercise.sets.length > 0 ? (
            exercise.sets.map((set, setIndex) => (
              <span
                key={`${set.setNumber}-${setIndex}`}
                className="rounded-xl bg-[#F2F4F6] px-3 py-2 text-[13px] leading-snug font-semibold text-[#4E5968]"
              >
                {set.setNumber}세트 {formatSetValue(set.weight)}kg ×{' '}
                {formatSetValue(set.reps)}회
              </span>
            ))
          ) : (
            <span className="text-[13px] font-semibold text-[#8B95A1]">
              기록된 세트가 없어요
            </span>
          )}
        </div>
      ) : null}

      <div
        id={contentId}
        role="region"
        aria-label={`${exercise.exerciseName} 세트 입력`}
        className="space-y-4 px-5 pb-5"
        hidden={!expanded}
      >
        {exercise.sets.map((set, idx) => (
          <div
            key={set.setNumber}
            className="rounded-2xl border border-[#EEF1F4] bg-[#FAFBFC] p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[15px] font-bold text-[#191F28]">
                {set.setNumber}세트
              </span>
              {exercise.sets.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2 text-[13px] text-[#8B95A1]"
                  onClick={() => onRemoveSet(idx)}
                >
                  세트 삭제
                </Button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Stepper
                label="중량"
                value={set.weight}
                onChange={(n) => onUpdateSet(idx, { weight: n })}
                step={5}
                min={0}
                max={500}
              />
              <Stepper
                label="횟수"
                value={set.reps}
                onChange={(n) => onUpdateSet(idx, { reps: Math.round(n) })}
                step={1}
                min={0}
                max={200}
              />
              <Stepper
                label="RIR"
                value={set.rir}
                onChange={(n) => onUpdateSet(idx, { rir: Math.round(n) })}
                step={1}
                min={0}
                max={10}
              />
              <Stepper
                label="휴식 시간"
                value={set.restTime}
                onChange={(n) =>
                  onUpdateSet(idx, { restTime: Math.round(n) })
                }
                step={30}
                min={0}
                max={600}
              />
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onAddSet}
        >
          세트 추가
        </Button>
      </div>
    </Card>
  );
}
