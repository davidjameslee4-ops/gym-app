import { WorkoutDay } from '@/src/types/workout';

/** The name to show for a day: its custom name if set, otherwise the weekday. */
export const dayTitle = (day: Pick<WorkoutDay, 'name' | 'title'> | null | undefined): string => {
  if (!day) return '';
  const custom = typeof day.title === 'string' ? day.title.trim() : '';
  return custom || day.name;
};

/** True when the day has a custom name that differs from the weekday label. */
export const hasCustomTitle = (day: Pick<WorkoutDay, 'name' | 'title'> | null | undefined): boolean => {
  if (!day || typeof day.title !== 'string') return false;
  const custom = day.title.trim();
  return custom.length > 0 && custom !== day.name;
};

/**
 * Swap the workouts in two day slots. Everything about the workout (exercises,
 * muscle groups, custom name, id) moves; each slot keeps its weekday label, so
 * Thursday's workout moved to Wednesday shows up under "Wednesday".
 */
export const swapDays = (days: WorkoutDay[], from: number, to: number): WorkoutDay[] => {
  if (from === to || from < 0 || to < 0 || from >= days.length || to >= days.length) return days;
  const next = [...days];
  const a = days[from];
  const b = days[to];
  next[to] = { ...a, name: b.name };
  next[from] = { ...b, name: a.name };
  return next;
};

/** Set (or clear, with an empty string) a day's custom name. */
export const renameDay = (day: WorkoutDay, title: string): WorkoutDay => {
  const trimmed = title.trim();
  const { title: _old, ...rest } = day;
  return trimmed && trimmed !== day.name ? { ...rest, title: trimmed } : rest;
};
