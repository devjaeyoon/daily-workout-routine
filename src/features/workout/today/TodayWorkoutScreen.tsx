import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  addWorkoutExercise,
  addWorkoutSet,
  createWorkoutExercise,
  removeWorkoutExercise,
  removeWorkoutSet,
  updateWorkoutSet,
} from '@/features/workout/model/workoutLog';
import type {
  SetLog,
  WorkoutExercise,
} from '@/features/workout/model/types';
import { ExerciseLogCard } from './ExerciseLogCard';
import { ExercisePicker } from './ExercisePicker';
import { ExerciseQuickNav } from './ExerciseQuickNav';
import { useCopyWorkout } from './useCopyWorkout';
import {
  exerciseCardId,
  useExerciseNavigation,
} from './useExerciseNavigation';

type TodayWorkoutScreenProps = {
  currentDate: string;
  workoutLogs: WorkoutExercise[];
  setWorkoutLogs: Dispatch<SetStateAction<WorkoutExercise[]>>;
  active: boolean;
};

export function TodayWorkoutScreen({
  currentDate,
  workoutLogs,
  setWorkoutLogs,
  active,
}: TodayWorkoutScreenProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const {
    expandedExerciseId,
    selectExercise,
    toggleExercise,
    selectAdjacentExerciseAfterRemoval,
  } = useExerciseNavigation(currentDate, workoutLogs);
  const { copyDone, copyWorkout } = useCopyWorkout(currentDate, workoutLogs);

  const alreadyAdded = useMemo(
    () => new Set(workoutLogs.map((log) => log.exerciseName)),
    [workoutLogs],
  );

  const handleAddExercise = useCallback(
    (name: string, category: string) => {
      const exercise = createWorkoutExercise(
        crypto.randomUUID(),
        name,
        category,
      );
      setWorkoutLogs((previous) =>
        addWorkoutExercise(previous, exercise),
      );
      selectExercise(exercise.id);
    },
    [selectExercise, setWorkoutLogs],
  );

  const handleRemoveExercise = useCallback(
    (exerciseId: string) => {
      if (!selectAdjacentExerciseAfterRemoval(exerciseId)) return;
      setWorkoutLogs((previous) =>
        removeWorkoutExercise(previous, exerciseId),
      );
    },
    [selectAdjacentExerciseAfterRemoval, setWorkoutLogs],
  );

  const handleUpdateSet = useCallback(
    (exerciseId: string, setIndex: number, patch: Partial<SetLog>) => {
      setWorkoutLogs((previous) =>
        updateWorkoutSet(previous, exerciseId, setIndex, patch),
      );
    },
    [setWorkoutLogs],
  );

  const handleAddSet = useCallback(
    (exerciseId: string) => {
      setWorkoutLogs((previous) => addWorkoutSet(previous, exerciseId));
    },
    [setWorkoutLogs],
  );

  const handleRemoveSet = useCallback(
    (exerciseId: string, setIndex: number) => {
      setWorkoutLogs((previous) =>
        removeWorkoutSet(previous, exerciseId, setIndex),
      );
    },
    [setWorkoutLogs],
  );

  if (!active) return null;

  return (
    <>
      <ExerciseQuickNav
        exercises={workoutLogs}
        expandedExerciseId={expandedExerciseId}
        copyDone={copyDone}
        onSelectExercise={selectExercise}
        onAddExercise={() => setPickerOpen(true)}
        onCopyWorkout={() => void copyWorkout()}
      />

      <main className="mx-auto max-w-lg space-y-4 px-4 py-5">
        {workoutLogs.length === 0 ? (
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
          workoutLogs.map((exercise, index) => (
            <ExerciseLogCard
              key={exercise.id}
              exercise={exercise}
              index={index}
              expanded={expandedExerciseId === exercise.id}
              cardId={exerciseCardId(exercise.id)}
              onToggle={() => toggleExercise(exercise.id)}
              onRemoveExercise={() => handleRemoveExercise(exercise.id)}
              onUpdateSet={(setIndex, patch) =>
                handleUpdateSet(exercise.id, setIndex, patch)
              }
              onAddSet={() => handleAddSet(exercise.id)}
              onRemoveSet={(setIndex) =>
                handleRemoveSet(exercise.id, setIndex)
              }
            />
          ))
        )}
      </main>

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        alreadyAdded={alreadyAdded}
        onPick={handleAddExercise}
      />
    </>
  );
}
