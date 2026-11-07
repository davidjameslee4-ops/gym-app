// "Fill in past history": adds a completed workout for every scheduled training day
// in a date range that has no log yet, so the streak and History show the run.
//
// Rules (the same ones the streak uses):
// - Days come from the ACTIVE program's weekly schedule, by weekday (Monday first).
// - A day with exercises gets one log, shaped like "Mark as Complete" writes it,
//   with `backfilled: true` so it can be found and removed on its own.
// - A day with no exercises is a pure rest day: no log needed (the streak counts it).
// - A day that already has any log is left exactly as it is. Nothing is duplicated.
// - No weights are invented: sets, reps and weights are the program's own.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_WORKOUT_PROGRAM } from '@/src/constants/defaultWorkout';
import { WorkoutDay, WorkoutLog, WorkoutProgram } from '@/src/types/workout';
import { BACKFILL_SAFETY_KEY, keepSafetyCopy } from '@/src/utils/dataTransfer';
import { dayTitle, hasCustomTitle } from '@/src/utils/dayTools';
import { emitDataChanged } from '@/src/utils/dataEvents';
import { dateKey } from '@/src/utils/exerciseCompletion';
import { storage } from '@/src/utils/storage';
import { dayForDate } from '@/src/utils/streak';

export const BACKFILL_FLAG = 'backfilled';
/** The start the screen offers by default: the first day of the year he began. */
export const DEFAULT_START = new Date(2026, 0, 1);
const MAX_DAYS = 3700;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

export const startOfLocalDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addLocalDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Yesterday, on the phone's local calendar. The default end of a fill. */
export const yesterdayLocal = (now: Date = new Date()) => addLocalDays(startOfLocalDay(now), -1);

/** "6 Nov" */
export const shortDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
/** "06/11/2026" */
export const formatDMY = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

/** Reads "6/11/2026", "06.11.2026", "6 11 2026" or "2026-11-06". Null when it is not a real date. */
export const parseDateText = (text: string): Date | null => {
  const t = (text || '').trim();
  let y: number, m: number, d: number;
  let match = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    y = +match[1]; m = +match[2]; d = +match[3];
  } else {
    match = t.match(/^(\d{1,2})[\/.\-\s]+(\d{1,2})[\/.\-\s]+(\d{4})$/);
    if (!match) return null;
    d = +match[1]; m = +match[2]; y = +match[3];
  }
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
};

export const isEmptyDay = (day?: WorkoutDay | null): boolean => !day || !day.exercises || day.exercises.length === 0;

/** The active program, read the same way the streak reads it. */
export const activeProgramOf = (programs: WorkoutProgram[] | null | undefined): WorkoutProgram =>
  programs && programs.length ? programs.find(p => p.isActive) || programs[0] : DEFAULT_WORKOUT_PROGRAM;

export const loadActiveProgram = async (): Promise<WorkoutProgram> => {
  const programs = (await storage.getItem('workoutPrograms', null)) as unknown as WorkoutProgram[] | null;
  return activeProgramOf(programs);
};

const loadLogs = async (): Promise<WorkoutLog[]> =>
  ((await storage.getItem('workoutLogs', null)) as unknown as WorkoutLog[] | null) || [];

/** One log for a scheduled day, written the way "Mark as Complete" writes one, plus the backfill flag. */
export const backfillLogFor = (program: WorkoutProgram, day: WorkoutDay, date: Date): WorkoutLog => ({
  id: `backfill-${dateKey(date)}-${day.id}`,
  // Local noon, so the calendar day reads the same on any phone.
  date: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0).toISOString(),
  programId: program.id,
  dayId: day.id,
  dayName: hasCustomTitle(day) ? `${dayTitle(day)} (${day.name})` : day.name,
  focus: day.focus,
  exercises: day.exercises.map(e => ({
    exerciseId: e.id,
    name: e.name,
    sets: e.sets,
    reps: e.reps,
    weight: e.weight,
    notes: e.notes,
  })),
  completed: true,
  [BACKFILL_FLAG]: true,
});

export interface BackfillPlan {
  /** The logs that would be added. */
  entries: WorkoutLog[];
  /** Days in the range, both ends included. */
  days: number;
  /** Scheduled days that already had a log, left alone. */
  alreadyLogged: number;
  /** Days with no exercises (pure rest), which need no log. */
  restDays: number;
}

/** Pure: what a fill of [from, to] would add to `logs`. */
export const planBackfill = (
  program: WorkoutProgram,
  logs: WorkoutLog[],
  from: Date,
  to: Date,
): BackfillPlan => {
  const logged = new Set<string>();
  (logs || []).forEach(l => {
    if (!l || !l.date) return;
    const t = new Date(l.date);
    if (!isNaN(t.getTime())) logged.add(dateKey(t));
  });
  const entries: WorkoutLog[] = [];
  let days = 0;
  let alreadyLogged = 0;
  let restDays = 0;
  const end = startOfLocalDay(to);
  for (let d = startOfLocalDay(from), i = 0; d <= end && i < MAX_DAYS; d = addLocalDays(d, 1), i++) {
    days++;
    const day = dayForDate(program.days, d);
    if (isEmptyDay(day)) {
      restDays++;
      continue;
    }
    if (logged.has(dateKey(d))) {
      alreadyLogged++;
      continue;
    }
    entries.push(backfillLogFor(program, day as WorkoutDay, d));
  }
  return { entries, days, alreadyLogged, restDays };
};

/** What a fill would add to the device right now. */
export const previewBackfill = async (from: Date, to: Date): Promise<BackfillPlan> =>
  planBackfill(await loadActiveProgram(), await loadLogs(), from, to);

/** How many filled-in workouts are on the device now. */
export const countBackfilled = async (): Promise<number> =>
  (await loadLogs()).filter(l => !!l && !!(l as any)[BACKFILL_FLAG]).length;

/**
 * Adds the planned logs. Keeps a safety copy of everything first; if that cannot be
 * saved, nothing is added. Re-plans against the stored logs just before writing,
 * so a log that appeared meanwhile is never duplicated.
 */
export async function applyBackfill(from: Date, to: Date): Promise<number> {
  const program = await loadActiveProgram();
  const first = planBackfill(program, await loadLogs(), from, to);
  if (first.entries.length === 0) return 0;

  await keepSafetyCopy(BACKFILL_SAFETY_KEY);

  const current = await loadLogs();
  const fresh = planBackfill(program, current, from, to).entries;
  await storage.setItem('workoutLogs', [...current, ...fresh] as any);
  emitDataChanged();
  return fresh.length;
}

/** Removes every log this feature added, and nothing else. Returns how many were removed. */
export async function removeBackfilled(): Promise<number> {
  const logs = await loadLogs();
  const kept = logs.filter(l => !(l && (l as any)[BACKFILL_FLAG]));
  const removed = logs.length - kept.length;
  if (removed === 0) return 0;
  await storage.setItem('workoutLogs', kept as any);
  emitDataChanged();
  return removed;
}

export const backfillSafetyExists = async (): Promise<boolean> => {
  try {
    return !!(await AsyncStorage.getItem(BACKFILL_SAFETY_KEY));
  } catch {
    return false;
  }
};
