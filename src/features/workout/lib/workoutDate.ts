export const WORKOUT_DAY_CUTOFF_HOUR = 4;

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWorkoutDate(now = new Date()): string {
  const shifted = new Date(now);
  shifted.setHours(shifted.getHours() - WORKOUT_DAY_CUTOFF_HOUR);
  return toDateKey(shifted);
}

export function getNextWorkoutDayCutoff(now = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setHours(WORKOUT_DAY_CUTOFF_HOUR, 0, 0, 0);

  if (now >= cutoff) {
    cutoff.setDate(cutoff.getDate() + 1);
  }

  return cutoff;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatWorkoutDate(
  dateKey: string,
  options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  },
): string {
  return new Intl.DateTimeFormat('ko-KR', options).format(
    parseDateKey(dateKey),
  );
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function dateToKey(date: Date): string {
  return toDateKey(date);
}
