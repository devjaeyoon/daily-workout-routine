import * as Popover from '@radix-ui/react-popover';
import type { SetLog, WorkoutExercise } from '../types/workout';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

const REST_PRESETS = [60, 90, 120, 150, 180] as const;

type ExerciseLogCardProps = {
  exercise: WorkoutExercise;
  onRemoveExercise: () => void;
  onUpdateSet: (setIndex: number, patch: Partial<SetLog>) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  onCompleteSet: (set: SetLog) => void;
};

function Stepper({
  label,
  value,
  onChange,
  step,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step: number;
  min: number;
  max: number;
  suffix?: string;
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
        <div className="relative min-w-0 flex-1">
          <Input
            inputMode="decimal"
            className="pr-10 text-center text-[20px] tabular-nums"
            value={Number.isFinite(value) ? String(value) : ''}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (e.target.value === '') return;
              if (Number.isNaN(v)) return;
              onChange(Math.min(max, Math.max(min, v)));
            }}
            aria-label={label}
          />
          {suffix ? (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-[#8B95A1]">
              {suffix}
            </span>
          ) : null}
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

export function ExerciseLogCard({
  exercise,
  onRemoveExercise,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onCompleteSet,
}: ExerciseLogCardProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold leading-snug text-[#191F28]">
            {exercise.exerciseName}
          </h2>
          <p className="mt-0.5 text-[13px] font-semibold text-[#3182F6]">
            {exercise.category}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="shrink-0 text-[#B0B8C1] hover:text-[#F04452]"
          onClick={onRemoveExercise}
        >
          삭제
        </Button>
      </div>

      <div className="space-y-4">
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
                step={2.5}
                min={0}
                max={500}
                suffix="kg"
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
              <div className="space-y-1.5">
                <Label>휴식</Label>
                <div className="flex flex-wrap gap-2">
                  {REST_PRESETS.map((sec) => (
                    <Button
                      key={sec}
                      type="button"
                      variant={set.restTime === sec ? 'primary' : 'outline'}
                      className="h-11 min-w-[4.5rem] rounded-2xl px-3 text-[14px]"
                      onClick={() => onUpdateSet(idx, { restTime: sec })}
                    >
                      {sec >= 60 ? `${sec / 60}분` : `${sec}초`}
                    </Button>
                  ))}
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-11 rounded-2xl px-3 text-[14px]"
                      >
                        직접 입력
                      </Button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content
                        className="z-50 w-[min(100vw-2rem,280px)] rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-[0_12px_32px_rgb(0_0_0/0.14)] focus:outline-none"
                        sideOffset={8}
                        align="start"
                      >
                        <Label htmlFor={`rest-custom-${exercise.id}-${idx}`}>
                          휴식(초)
                        </Label>
                        <Input
                          id={`rest-custom-${exercise.id}-${idx}`}
                          className="mt-2"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={600}
                          value={set.restTime}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (Number.isNaN(v)) return;
                            onUpdateSet(idx, {
                              restTime: Math.min(
                                600,
                                Math.max(0, Math.round(v)),
                              ),
                            });
                          }}
                        />
                        <Popover.Close asChild>
                          <Button
                            type="button"
                            className="mt-3 w-full"
                            variant="primary"
                          >
                            적용
                          </Button>
                        </Popover.Close>
                        <Popover.Arrow className="fill-white" />
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => onCompleteSet(set)}
            >
              세트 완료 · 휴식 시작
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onAddSet}
      >
        세트 추가
      </Button>
    </Card>
  );
}
