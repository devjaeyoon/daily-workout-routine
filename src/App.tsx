import { useCallback, useMemo, useState } from 'react'
import { ExerciseLogCard } from './components/ExerciseLogCard'
import { ExercisePicker } from './components/ExercisePicker'
import { RestTimerBar } from './components/RestTimerBar'
import { Button } from './components/ui/button'
import { useRestTimer } from './hooks/useRestTimer'
import { buildPromptText } from './lib/format'
import type { SetLog, WorkoutExercise } from './types/workout'

function createDefaultSet(setNumber: number, prev?: SetLog): SetLog {
  return {
    setNumber,
    weight: prev?.weight ?? 20,
    reps: prev?.reps ?? 10,
    rir: prev?.rir ?? 2,
    restTime: prev?.restTime ?? 90,
  }
}

function renumberSets(sets: SetLog[]): SetLog[] {
  return sets.map((s, i) => ({ ...s, setNumber: i + 1 }))
}

export default function App() {
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutExercise[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [copyDone, setCopyDone] = useState(false)
  const { active, start, dismiss } = useRestTimer()

  const alreadyAdded = useMemo(
    () => new Set(workoutLogs.map((l) => l.exerciseName)),
    [workoutLogs],
  )

  const addExercise = useCallback((name: string, category: string) => {
    setWorkoutLogs((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        exerciseName: name,
        category,
        sets: [createDefaultSet(1)],
      },
    ])
  }, [])

  const removeExercise = useCallback((id: string) => {
    setWorkoutLogs((prev) => prev.filter((ex) => ex.id !== id))
  }, [])

  const updateSet = useCallback(
    (exerciseId: string, setIndex: number, patch: Partial<SetLog>) => {
      setWorkoutLogs((prev) =>
        prev.map((ex) => {
          if (ex.id !== exerciseId) return ex
          const sets = ex.sets.map((s, i) =>
            i === setIndex ? { ...s, ...patch } : s,
          )
          return { ...ex, sets }
        }),
      )
    },
    [],
  )

  const addSet = useCallback((exerciseId: string) => {
    setWorkoutLogs((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex
        const last = ex.sets[ex.sets.length - 1]
        const next = createDefaultSet(ex.sets.length + 1, last)
        return { ...ex, sets: [...ex.sets, next] }
      }),
    )
  }, [])

  const removeSet = useCallback((exerciseId: string, setIndex: number) => {
    setWorkoutLogs((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex
        const filtered = ex.sets.filter((_, i) => i !== setIndex)
        return { ...ex, sets: renumberSets(filtered) }
      }),
    )
  }, [])

  const handleCompleteSet = useCallback(
    (exerciseName: string, set: SetLog) => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        void Notification.requestPermission()
      }
      start(set.restTime, exerciseName)
    },
    [start],
  )

  const copyPrompt = useCallback(async () => {
    const text = buildPromptText(new Date(), workoutLogs)
    try {
      await navigator.clipboard.writeText(text)
      setCopyDone(true)
      window.setTimeout(() => setCopyDone(false), 2000)
    } catch {
      setCopyDone(false)
    }
  }, [workoutLogs])

  return (
    <div className="min-h-dvh pb-28">
      <header className="sticky top-0 z-30 border-b border-[#E5E8EB]/80 bg-[#F2F4F6]/90 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-[#191F28]">
                오늘의 운동
              </h1>
              <p className="mt-0.5 text-[14px] text-[#8B95A1]">
                세트별로 기록하고 GPT용 텍스트로 복사하세요.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setPickerOpen(true)}>
              운동 추가
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void copyPrompt()}
              disabled={workoutLogs.length === 0}
            >
              {copyDone ? '복사됨' : 'GPT용 복사'}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-5">
        {workoutLogs.length === 0 ? (
          <div className="rounded-[24px] bg-white px-6 py-16 text-center shadow-[0_2px_12px_rgb(0_0_0/0.06)]">
            <p className="text-[17px] font-semibold text-[#191F28]">
              아직 추가된 운동이 없어요
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-[#8B95A1]">
              상단의 <span className="font-bold text-[#3182F6]">운동 추가</span>로
              오늘 루틴을 만들어 보세요.
            </p>
          </div>
        ) : (
          workoutLogs.map((ex) => (
            <ExerciseLogCard
              key={ex.id}
              exercise={ex}
              onRemoveExercise={() => removeExercise(ex.id)}
              onUpdateSet={(i, p) => updateSet(ex.id, i, p)}
              onAddSet={() => addSet(ex.id)}
              onRemoveSet={(i) => removeSet(ex.id, i)}
              onCompleteSet={(set) => handleCompleteSet(ex.exerciseName, set)}
            />
          ))
        )}
      </main>

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        alreadyAdded={alreadyAdded}
        onPick={addExercise}
      />

      {active && active.remaining > 0 ? (
        <RestTimerBar
          exerciseName={active.exerciseName}
          remaining={active.remaining}
          onDismiss={dismiss}
        />
      ) : null}
    </div>
  )
}
