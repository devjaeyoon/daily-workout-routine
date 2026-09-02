import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WorkoutExercise } from '@/features/workout/model/types';

type ScrollRequest = {
  exerciseId: string;
  sequence: number;
};

type ExpansionState = {
  date: string;
  exerciseId: string | null;
  touched: boolean;
};

export function exerciseCardId(exerciseId: string): string {
  return `exercise-card-${exerciseId}`;
}

export function useExerciseNavigation(
  currentDate: string,
  workoutLogs: WorkoutExercise[],
) {
  const [expansionState, setExpansionState] = useState<ExpansionState>(() => ({
    date: currentDate,
    exerciseId: workoutLogs.at(-1)?.id ?? null,
    touched: false,
  }));
  const [scrollRequest, setScrollRequest] = useState<ScrollRequest | null>(
    null,
  );
  const scrollSequenceRef = useRef(0);

  const expandedExerciseId = useMemo(() => {
    const lastExerciseId = workoutLogs.at(-1)?.id ?? null;
    if (expansionState.date !== currentDate) return lastExerciseId;
    if (expansionState.exerciseId === null) {
      return expansionState.touched ? null : lastExerciseId;
    }
    return workoutLogs.some(
      (exercise) => exercise.id === expansionState.exerciseId,
    )
      ? expansionState.exerciseId
      : lastExerciseId;
  }, [currentDate, expansionState, workoutLogs]);

  useEffect(() => {
    if (!scrollRequest || expandedExerciseId !== scrollRequest.exerciseId) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const card = document.getElementById(
        exerciseCardId(scrollRequest.exerciseId),
      );
      if (card) {
        const reduceMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches;
        card.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      }

      setScrollRequest((current) =>
        current?.sequence === scrollRequest.sequence ? null : current,
      );
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [expandedExerciseId, scrollRequest]);

  const requestExerciseScroll = useCallback((exerciseId: string) => {
    scrollSequenceRef.current += 1;
    setScrollRequest({
      exerciseId,
      sequence: scrollSequenceRef.current,
    });
  }, []);

  const selectExercise = useCallback(
    (exerciseId: string) => {
      setExpansionState({
        date: currentDate,
        exerciseId,
        touched: true,
      });
      requestExerciseScroll(exerciseId);
    },
    [currentDate, requestExerciseScroll],
  );

  const toggleExercise = useCallback(
    (exerciseId: string) => {
      setExpansionState({
        date: currentDate,
        exerciseId: expandedExerciseId === exerciseId ? null : exerciseId,
        touched: true,
      });
    },
    [currentDate, expandedExerciseId],
  );

  const selectAdjacentExerciseAfterRemoval = useCallback(
    (exerciseId: string): boolean => {
      const removedIndex = workoutLogs.findIndex(
        (exercise) => exercise.id === exerciseId,
      );
      if (removedIndex < 0) return false;

      const nextExpandedId =
        workoutLogs[removedIndex + 1]?.id ??
        workoutLogs[removedIndex - 1]?.id ??
        null;
      setExpansionState({
        date: currentDate,
        exerciseId: nextExpandedId,
        touched: true,
      });
      return true;
    },
    [currentDate, workoutLogs],
  );

  return {
    expandedExerciseId,
    selectExercise,
    toggleExercise,
    selectAdjacentExerciseAfterRemoval,
  };
}
