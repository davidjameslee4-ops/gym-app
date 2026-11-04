import { WorkoutDay } from '@/src/types/workout';

/**
 * Linked weights: the same exercise on different days shares one working weight.
 * Exercises are matched by name, ignoring case and extra spaces
 * ("Preacher Curls" on Wednesday = "preacher curls " on Saturday).
 * Only the weight is linked; sets, reps and notes stay per day.
 */

export const exerciseKey = (name: string | null | undefined): string =>
  (name || '').trim().replace(/\s+/g, ' ').toLowerCase();

const sameWeight = (a: number | undefined, b: number | undefined) =>
  (a === undefined || a === null || Number.isNaN(a) ? undefined : a) ===
  (b === undefined || b === null || Number.isNaN(b) ? undefined : b);

export interface LinkResult {
  days: WorkoutDay[];
  /** Weekday labels of the other days whose entry changed (in day order, no repeats). */
  updatedDays: string[];
}

/**
 * Give every other entry of the exercise `name` the new `weight`.
 * `exceptExerciseId` is the entry that was just saved (left as is).
 * A cleared weight (undefined) is never copied to other days.
 */
export const linkWeightAcrossDays = (
  days: WorkoutDay[],
  name: string,
  weight: number | undefined,
  exceptExerciseId?: string,
): LinkResult => {
  const key = exerciseKey(name);
  if (!key || weight === undefined || weight === null || Number.isNaN(weight)) {
    return { days, updatedDays: [] };
  }
  const updatedDays: string[] = [];
  const next = days.map(d => {
    let changed = false;
    const exercises = d.exercises.map(e => {
      if (e.id === exceptExerciseId) return e;
      if (exerciseKey(e.name) !== key) return e;
      if (sameWeight(e.weight, weight)) return e;
      changed = true;
      return { ...e, weight };
    });
    if (!changed) return d;
    if (!updatedDays.includes(d.name)) updatedDays.push(d.name);
    return { ...d, exercises };
  });
  return { days: updatedDays.length ? next : days, updatedDays };
};

/** The weight this exercise already has on another day (for pre-filling a new entry). */
export const findLinkedWeight = (
  days: WorkoutDay[],
  name: string,
  exceptExerciseId?: string,
): { weight: number; dayName: string } | null => {
  const key = exerciseKey(name);
  if (!key) return null;
  for (const d of days) {
    for (const e of d.exercises) {
      if (e.id === exceptExerciseId) continue;
      if (exerciseKey(e.name) !== key) continue;
      if (typeof e.weight === 'number' && !Number.isNaN(e.weight)) {
        return { weight: e.weight, dayName: d.name };
      }
    }
  }
  return null;
};

/** "Saturday", "Saturday and Monday", "Saturday, Monday and Friday". */
export const joinDayNames = (names: string[]): string => {
  if (names.length <= 1) return names[0] || '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

const fmtKg = (w: number) => `${Number.isInteger(w) ? w : Number(w.toFixed(2))} kg`;

/** The confirmation line shown after a linked save. */
export const linkedWeightMessage = (name: string, weight: number, updatedDays: string[]): string =>
  `${name.trim()} ${fmtKg(weight)}: also updated on ${joinDayNames(updatedDays)}`;
