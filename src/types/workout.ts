export type SetLog = {
  setNumber: number;
  weight: number;
  reps: number;
  rir: number;
  restTime: number;
};

export type WorkoutExercise = {
  id: string;
  exerciseName: string;
  category: string;
  sets: SetLog[];
};
