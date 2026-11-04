import { storage } from '@/src/utils/storage';

// Per-day "exercise completed" ticks. Stored on the device as a JSON string:
// { "2026-11-01": ["sunday:sun-1", ...], ... }. Ticks are keyed by calendar
// date, so they clear on their own the next day / next week's same weekday.
// Kept for about a year so the workout streak can count ticked days.
const KEY = 'exerciseCompletions';
const KEEP_DAYS = 400;

export type Completions = Record<string, string[]>;

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export const dateKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Program days start on Monday (index 0), matching the Home screen.
// Day index -> the date of that weekday in the current week.
export const dateKeyForDayIndex = (index: number) => {
  const today = new Date();
  if (index < 0 || index > 6) return dateKey(today);
  const todayIndex = (today.getDay() + 6) % 7;
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (index - todayIndex));
  return dateKey(d);
};

export const completionId = (dayId: string, exerciseId: string) => `${dayId}:${exerciseId}`;

export const loadCompletions = async (): Promise<Completions> => {
  const raw = (await storage.getItem(KEY, null)) as unknown;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Completions;
  } catch {}
  return {};
};

const prune = (all: Completions): Completions => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - KEEP_DAYS);
  const min = dateKey(cutoff);
  const out: Completions = {};
  Object.keys(all).forEach(k => {
    if (k >= min && all[k] && all[k].length) out[k] = all[k];
  });
  return out;
};

const save = async (all: Completions) => {
  const pruned = prune(all);
  await storage.setItem(KEY, JSON.stringify(pruned));
  return pruned;
};

export const isCompleted = (all: Completions, date: string, id: string) =>
  !!all[date] && all[date].includes(id);

export const toggleCompletion = async (date: string, id: string): Promise<Completions> => {
  const all = await loadCompletions();
  const list = all[date] || [];
  all[date] = list.includes(id) ? list.filter(x => x !== id) : [...list, id];
  return save(all);
};

export const resetCompletions = async (date: string, ids: string[]): Promise<Completions> => {
  const all = await loadCompletions();
  all[date] = (all[date] || []).filter(x => !ids.includes(x));
  return save(all);
};
