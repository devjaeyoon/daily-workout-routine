import { useCallback, useEffect, useRef, useState } from 'react';
import { buildPromptText } from '@/features/workout/lib/format';
import { parseDateKey } from '@/features/workout/lib/workoutDate';
import type { WorkoutExercise } from '@/features/workout/model/types';

export function useCopyWorkout(
  currentDate: string,
  workoutLogs: WorkoutExercise[],
) {
  const [copyDone, setCopyDone] = useState(false);
  const copyDoneTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyDoneTimerRef.current !== null) {
        window.clearTimeout(copyDoneTimerRef.current);
      }
    };
  }, []);

  const copyWorkout = useCallback(async () => {
    const text = buildPromptText(parseDateKey(currentDate), workoutLogs);
    if (copyDoneTimerRef.current !== null) {
      window.clearTimeout(copyDoneTimerRef.current);
      copyDoneTimerRef.current = null;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopyDone(true);
      copyDoneTimerRef.current = window.setTimeout(() => {
        setCopyDone(false);
        copyDoneTimerRef.current = null;
      }, 2000);
    } catch {
      setCopyDone(false);
    }
  }, [currentDate, workoutLogs]);

  return { copyDone, copyWorkout };
}
