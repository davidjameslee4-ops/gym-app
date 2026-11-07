import type { ExportSummary } from '@/src/utils/dataTransfer';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Plain words for what an export holds: "2 programs, 143 workouts logged, 12 weigh-ins". */
export const describeSummary = (s: ExportSummary): string => {
  const parts = [
    plural(s.programs, 'program', 'programs'),
    `${plural(s.workouts, 'workout', 'workouts')} logged`,
    plural(s.weighIns, 'weigh-in', 'weigh-ins'),
  ];
  if (s.measurements > 0) parts.push(plural(s.measurements, 'measurement entry', 'measurement entries'));
  if (s.tickedDays > 0) parts.push(plural(s.tickedDays, 'day with ticks', 'days with ticks'));
  const head = parts.join(', ');
  return s.profileName ? `${head}. Profile: ${s.profileName}.` : `${head}.`;
};
