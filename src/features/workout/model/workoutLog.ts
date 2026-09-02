import type { SetLog, WorkoutExercise } from './types';

export function createDefaultSet(
  setNumber: number,
  previous?: SetLog,
): SetLog {
  return {
    setNumber,
    weight: previous?.weight ?? 20,
    reps: previous?.reps ?? 10,
    rir: previous?.rir ?? 2,
    restTime: previous?.restTime ?? 90,
  };
}

export function createWorkoutExercise(
  id: string,
  exerciseName: string,
  category: string,
): WorkoutExercise {
  return {
    id,
    exerciseName,
    category,
    sets: [createDefaultSet(1)],
  };
}

export function addWorkoutExercise(
  exercises: WorkoutExercise[],
  exercise: WorkoutExercise,
): WorkoutExercise[] {
  return [...exercises, exercise];
}

export function removeWorkoutExercise(
  exercises: WorkoutExercise[],
  exerciseId: string,
): WorkoutExercise[] {
  return exercises.filter((exercise) => exercise.id !== exerciseId);
}

export function updateWorkoutSet(
  exercises: WorkoutExercise[],
  exerciseId: string,
  setIndex: number,
  patch: Partial<SetLog>,
): WorkoutExercise[] {
  return exercises.map((exercise) => {
    if (exercise.id !== exerciseId) return exercise;

    return {
      ...exercise,
      sets: exercise.sets.map((set, index) =>
        index === setIndex ? { ...set, ...patch } : set,
      ),
    };
  });
}

export function addWorkoutSet(
  exercises: WorkoutExercise[],
  exerciseId: string,
): WorkoutExercise[] {
  return exercises.map((exercise) => {
    if (exercise.id !== exerciseId) return exercise;

    const previous = exercise.sets.at(-1);
    const next = createDefaultSet(exercise.sets.length + 1, previous);
    return { ...exercise, sets: [...exercise.sets, next] };
  });
}

export function removeWorkoutSet(
  exercises: WorkoutExercise[],
  exerciseId: string,
  setIndex: number,
): WorkoutExercise[] {
  return exercises.map((exercise) => {
    if (exercise.id !== exerciseId) return exercise;

    const remainingSets = exercise.sets.filter(
      (_, index) => index !== setIndex,
    );
    return {
      ...exercise,
      sets: remainingSets.map((set, index) => ({
        ...set,
        setNumber: index + 1,
      })),
    };
  });
}
