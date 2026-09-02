import { useEffect, useState } from 'react';
import {
  getNextWorkoutDayCutoff,
  getWorkoutDate,
} from '@/features/workout/lib/workoutDate';

export function useWorkoutDateRollover(): string {
  const [currentDate, setCurrentDate] = useState(getWorkoutDate);

  useEffect(() => {
    const refreshWorkoutDate = () => {
      setCurrentDate(getWorkoutDate());
    };
    const delay = Math.max(
      1_000,
      getNextWorkoutDayCutoff().getTime() - Date.now() + 100,
    );
    const timeoutId = window.setTimeout(refreshWorkoutDate, delay);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshWorkoutDate();
    };

    window.addEventListener('focus', refreshWorkoutDate);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('focus', refreshWorkoutDate);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentDate]);

  return currentDate;
}
