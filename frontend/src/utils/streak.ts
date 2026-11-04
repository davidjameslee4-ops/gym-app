import { WorkoutDay, WorkoutLog, WorkoutProgram } from '@/src/types/workout';
import { storage } from '@/src/utils/storage';
import { Completions, dateKey, loadCompletions } from '@/src/utils/exerciseCompletion';
import { DEFAULT_WORKOUT_PROGRAM } from '@/src/constants/defaultWorkout';

// Workout streak rules (all dates are the phone's LOCAL calendar days):
// - A day you trained counts: "Mark as Complete" was pressed (a workout log)
//   or at least one exercise was ticked that day.
// - A rest / recovery day in the schedule counts on its own (no need to log it).
// - Today never breaks the streak: if today's workout isn't done yet, the
//   streak just waits. It only breaks once a scheduled workout day has fully
//   passed with nothing logged or ticked.

const REST_WORDS = /\b(rest|recovery|recover|off|deload)\b/i;

/** A day with no exercises, or whose focus / custom title says rest or recovery. */
export const isRestDay = (day?: WorkoutDay | null): boolean => {
  if (!day) return true;
  if (!day.exercises || day.exercises.length === 0) return true;
  return REST_WORDS.test(`${day.focus || ''} ${day.title || ''}`);
};

/** The program day scheduled on a date (program days start on Monday). */
export const dayForDate = (days: WorkoutDay[] | undefined, d: Date): WorkoutDay | undefined =>
  (days || [])[(d.getDay() + 6) % 7];

/** Local dates (YYYY-MM-DD) with any training recorded: workout logs or ticks. */
export const activeDates = (logs: WorkoutLog[] = [], completions: Completions = {}): Set<string> => {
  const set = new Set<string>();
  (logs || []).forEach(l => {
    if (!l || l.completed === false || !l.date) return;
    const t = new Date(l.date);
    if (!isNaN(t.getTime())) set.add(dateKey(t));
  });
  Object.keys(completions || {}).forEach(k => {
    if (Array.isArray(completions[k]) && completions[k].length > 0) set.add(k);
  });
  return set;
};

export type DayStatus = 'trained' | 'rest' | 'pending' | 'missed';

export interface StreakResult {
  current: number;
  longest: number;
  /** How today stands: trained, rest (counts), or pending (workout not done yet). */
  today: DayStatus;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const computeStreak = (
  days: WorkoutDay[] | undefined,
  logs: WorkoutLog[] = [],
  completions: Completions = {},
  now: Date = new Date()
): StreakResult => {
  const today = startOfDay(now);
  const todayKey = dateKey(today);
  const active = activeDates(logs, completions);

  const statusOf = (d: Date): DayStatus => {
    const key = dateKey(d);
    if (active.has(key)) return 'trained';
    if (isRestDay(dayForDate(days, d))) return 'rest';
    return key === todayKey ? 'pending' : 'missed';
  };

  const todayStatus = statusOf(today);
  const keys = Array.from(active).filter(k => k <= todayKey).sort();
  if (keys.length === 0) return { current: 0, longest: 0, today: todayStatus };

  // The streak can't reach back before the first day anything was recorded.
  const [fy, fm, fd] = keys[0].split('-').map(Number);
  const first = new Date(fy, fm - 1, fd);

  // Current: walk back from today.
  let current = 0;
  for (let d = today, i = 0; d >= first && i < 3700; d = addDays(d, -1), i++) {
    const s = statusOf(d);
    if (s === 'trained' || s === 'rest') current++;
    else if (s === 'pending') continue;
    else break;
  }

  // Longest: walk forward from the first recorded day.
  let longest = 0;
  let run = 0;
  for (let d = first, i = 0; d <= today && i < 3700; d = addDays(d, 1), i++) {
    const s = statusOf(d);
    if (s === 'trained' || s === 'rest') {
      run++;
      if (run > longest) longest = run;
    } else if (s === 'missed') {
      run = 0;
    }
  }
  return { current, longest: Math.max(longest, current), today: todayStatus };
};

/** Reads the active program, workout logs and ticks from the device and computes the streak. */
export const loadStreak = async (now: Date = new Date()): Promise<StreakResult> => {
  const programs = (await storage.getItem('workoutPrograms', null)) as unknown as WorkoutProgram[] | null;
  const active = programs && programs.length ? programs.find(p => p.isActive) || programs[0] : DEFAULT_WORKOUT_PROGRAM;
  const logs = ((await storage.getItem('workoutLogs', null)) as unknown as WorkoutLog[] | null) || [];
  const completions = await loadCompletions();
  return computeStreak(active?.days, logs, completions, now);
};
