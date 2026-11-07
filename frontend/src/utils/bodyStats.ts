// Body weight and measurements: the numbers behind the Progress charts.
// Pure functions only (no storage, no React), so the rules can be checked on their own.

import type { BodyMeasurementEntry, BodyMeasurementValues, WeightEntry } from '@/src/types/workout';

export const MEASUREMENTS_KEY = 'bodyMeasurements';

export const MEASUREMENTS = [
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'neck', label: 'Neck' },
  { key: 'arm', label: 'Arm' },
  { key: 'thigh', label: 'Thigh' },
] as const;

export type MeasureKey = (typeof MEASUREMENTS)[number]['key'];

export const RANGES = [
  { key: '30', label: '30 days', days: 30 },
  { key: '90', label: '90 days', days: 90 },
  { key: 'all', label: 'All', days: null },
] as const;

export type RangeKey = (typeof RANGES)[number]['key'];

export interface ChartPoint {
  id: string;
  /** Milliseconds since the epoch. */
  t: number;
  v: number;
  date: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "12 Oct 2026" */
export const formatDay = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** "12 Oct" */
export const formatDayShort = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** A typed number, one decimal at most. Accepts a comma decimal ("20,5") as well as a dot. */
export type NumberField =
  | { kind: 'empty' }
  | { kind: 'ok'; value: number }
  | { kind: 'bad' };

export const readNumberField = (text: string): NumberField => {
  const t = (text || '').trim().replace(',', '.');
  if (!t) return { kind: 'empty' };
  if (!/^\d{1,4}(\.\d)?$/.test(t)) return { kind: 'bad' };
  const value = Number(t);
  if (!(value > 0)) return { kind: 'bad' };
  return { kind: 'ok', value };
};

/** Shown next to a number: 82.5 stays 82.5, 82.0 shows as 82. */
export const formatValue = (v: number): string => {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

/** +1.2 / -0.8 / 0 */
export const formatChange = (v: number): string => {
  const r = Math.round(v * 10) / 10;
  if (r === 0) return '0';
  return `${r > 0 ? '+' : ''}${r.toFixed(1)}`;
};

const byDate = <T extends { date: string }>(a: T, b: T) =>
  new Date(a.date).getTime() - new Date(b.date).getTime();

/** Entries in the range, oldest first. `now` is passed in so tests can pin the clock. */
export const pointsForRange = (
  entries: { id: string; date: string }[],
  values: (e: any) => number | undefined,
  range: RangeKey,
  now: number,
): ChartPoint[] => {
  const spec = RANGES.find(r => r.key === range) || RANGES[2];
  const from = spec.days === null ? -Infinity : now - spec.days * DAY_MS;
  const out: ChartPoint[] = [];
  [...entries].sort(byDate).forEach((e: any) => {
    const t = new Date(e.date).getTime();
    const v = values(e);
    if (Number.isNaN(t) || v === undefined || v === null || Number.isNaN(v)) return;
    if (t < from || t > now + DAY_MS) return;
    out.push({ id: e.id, t, v, date: e.date });
  });
  return out;
};

export const weightPoints = (weights: WeightEntry[], range: RangeKey, now: number) =>
  pointsForRange(weights, e => e.weight, range, now);

export const measurePoints = (
  entries: BodyMeasurementEntry[],
  key: MeasureKey,
  range: RangeKey,
  now: number,
) => pointsForRange(entries, e => e.values?.[key], range, now);

export interface Summary {
  start: number | null;
  latest: number | null;
  change: number | null;
  count: number;
}

/** First and last value in the list (already in date order) and the difference. */
export const summarize = (points: ChartPoint[]): Summary => {
  if (!points.length) return { start: null, latest: null, change: null, count: 0 };
  const start = points[0].v;
  const latest = points[points.length - 1].v;
  return {
    start,
    latest,
    change: points.length >= 2 ? latest - start : null,
    count: points.length,
  };
};

/** The most recent value of each measurement across all entries (for pre-filling the form). */
export const latestMeasurementValues = (entries: BodyMeasurementEntry[]): BodyMeasurementValues => {
  const out: BodyMeasurementValues = {};
  [...entries].sort(byDate).forEach(e => {
    MEASUREMENTS.forEach(m => {
      const v = e.values?.[m.key];
      if (typeof v === 'number' && !Number.isNaN(v)) out[m.key] = v;
    });
  });
  return out;
};

/** Plain-words line for an entry: "Chest 98 · Waist 84 cm". */
export const describeMeasurements = (values: BodyMeasurementValues): string => {
  const parts = MEASUREMENTS.filter(m => typeof values?.[m.key] === 'number').map(
    m => `${m.label} ${formatValue(values[m.key] as number)}`,
  );
  return parts.length ? `${parts.join(' · ')} cm` : 'No numbers';
};

/** Latest weigh-in by date, or undefined when there are none. */
export const latestWeight = (weights: WeightEntry[]): WeightEntry | undefined =>
  [...weights].sort(byDate).pop();

export interface Domain {
  lo: number;
  hi: number;
  /** Gridline values, evenly spaced from lo to hi. */
  ticks: number[];
}

/** A y-axis that starts and ends on round numbers, with a few evenly spaced gridlines. */
export const niceDomain = (values: number[], goal?: number): Domain => {
  const all = goal !== undefined && goal > 0 ? [...values, goal] : values;
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (hi - lo < 1) {
    lo -= 1;
    hi += 1;
  } else {
    const pad = (hi - lo) * 0.12;
    lo -= pad;
    hi += pad;
  }
  const rough = (hi - lo) / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const candidates: number[] = [];
  [mag / 10, mag, mag * 10].forEach(e => [1, 2, 2.5, 5].forEach(m => candidates.push(m * e)));
  candidates.sort((a, b) => a - b);
  const step = candidates.find(c => c >= rough) ?? mag * 10;
  const r = (v: number) => Number(v.toFixed(6));
  const first = r(Math.floor(lo / step) * step);
  const last = r(Math.ceil(hi / step) * step);
  const ticks: number[] = [];
  for (let v = first; v <= last + step / 1000; v = r(v + step)) ticks.push(v);
  return { lo: first, hi: last, ticks };
};
