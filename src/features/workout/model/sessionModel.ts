import type {
  WorkoutExercise,
  WorkoutSession,
  WorkoutSessionsByDate,
} from './types';

export type WorkoutLogsUpdater =
  | WorkoutExercise[]
  | ((previous: WorkoutExercise[]) => WorkoutExercise[]);

export function sessionsToDateMap(
  sessions: WorkoutSession[],
): WorkoutSessionsByDate {
  return Object.fromEntries(
    sessions.map((session) => [session.workoutDate, session]),
  );
}

export function mergeWorkoutSessions(
  local: WorkoutSessionsByDate,
  remote: WorkoutSessionsByDate,
): {
  merged: WorkoutSessionsByDate;
  shouldUpload: WorkoutSession[];
} {
  const merged = { ...local };
  const shouldUpload: WorkoutSession[] = [];

  for (const [date, remoteSession] of Object.entries(remote)) {
    const localSession = local[date];
    if (
      !localSession ||
      Date.parse(remoteSession.updatedAt) > Date.parse(localSession.updatedAt)
    ) {
      merged[date] = remoteSession;
    }
  }

  for (const [date, localSession] of Object.entries(local)) {
    const remoteSession = remote[date];
    if (
      !remoteSession ||
      Date.parse(localSession.updatedAt) > Date.parse(remoteSession.updatedAt)
    ) {
      shouldUpload.push(localSession);
    }
  }

  return { merged, shouldUpload };
}

export function updateWorkoutSession(
  sessions: WorkoutSessionsByDate,
  workoutDate: string,
  updater: WorkoutLogsUpdater,
  now = new Date(),
): WorkoutSessionsByDate {
  const previousSession = sessions[workoutDate];
  const previousLogs = previousSession?.exercises ?? [];
  const nextLogs =
    typeof updater === 'function' ? updater(previousLogs) : updater;
  const updatedAt = now.toISOString();

  return {
    ...sessions,
    [workoutDate]: {
      workoutDate,
      exercises: nextLogs,
      createdAt: previousSession?.createdAt ?? updatedAt,
      updatedAt,
    },
  };
}
