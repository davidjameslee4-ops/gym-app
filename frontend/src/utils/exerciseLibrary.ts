import { storage } from '@/src/utils/storage';
import { WorkoutProgram } from '@/src/types/workout';
import { DEFAULT_WORKOUT_PROGRAM } from '@/src/constants/defaultWorkout';

// Saved exercise names for the exercise picker. Stored on the device as JSON
// strings, like the rest of the app's data.
const CUSTOM_KEY = 'exerciseLibraryCustom'; // names the user added
const HIDDEN_KEY = 'exerciseLibraryHidden'; // names the user removed from the list

export const COMMON_EXERCISES = [
  'Arnold Press', 'Back Extensions', 'Barbell Curls', 'Barbell Rows', 'Bench Press',
  'Bulgarian Split Squats', 'Cable Chest Fly', 'Cable Lateral Raises', 'Calf Raises',
  'Chest Dips', 'Chest Press Machine', 'Chin-ups', 'Concentration Curls', 'Cycling',
  'Deadlift', 'Decline Bench Press', 'Dumbbell Bench Press', 'Dumbbell Curls',
  'Dumbbell Rows', 'Dumbbell Shoulder Press', 'Elliptical', 'Front Raises', 'Front Squats',
  'Glute Bridges', 'Goblet Squats', 'Hack Squats', 'Hammer Curls', 'Hip Thrusts',
  'Incline Bench Press', 'Incline Dumbbell Press', 'Lat Pulldowns', 'Lateral Raises',
  'Leg Extensions', 'Leg Press', 'Lunges', 'Lying Leg Curls', 'Overhead Press',
  'Pec Deck', 'Plank', 'Preacher Curls', 'Pull-ups', 'Push-ups', 'Rear Delt Fly',
  'Romanian Deadlift', 'Rowing Machine', 'Russian Twists', 'Seated Cable Rows',
  'Seated Leg Curl', 'Shrugs', 'Side Plank', 'Sit-ups', 'Skull Crushers', 'Squats',
  'Stair Climber', 'T-Bar Rows', 'Treadmill Run', 'Treadmill Walk', 'Tricep Dips',
  'Tricep Pushdowns', 'Upright Rows',
];

const normalise = (name: string) => name.trim().replace(/\s+/g, ' ');
const keyOf = (name: string) => normalise(name).toLowerCase();

async function readList(key: string): Promise<string[]> {
  const raw = (await storage.getItem(key, null)) as unknown;
  if (typeof raw !== 'string') return Array.isArray(raw) ? (raw as string[]) : [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === 'string') : [];
  } catch {
    return [];
  }
}

const writeList = (key: string, list: string[]) => storage.setItem(key, JSON.stringify(list));

function dedupeSorted(names: string[]): string[] {
  const seen = new Map<string, string>();
  for (const n of names) {
    const clean = normalise(n);
    if (clean && !seen.has(clean.toLowerCase())) seen.set(clean.toLowerCase(), clean);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

async function readPrograms(): Promise<WorkoutProgram[]> {
  const saved = (await storage.getItem('workoutPrograms', null)) as unknown;
  if (Array.isArray(saved)) return saved as WorkoutProgram[];
  if (typeof saved === 'string') {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

/** Every exercise name in the user's programs + the default program + common exercises + ones they added. */
export async function loadExerciseLibrary(programs?: WorkoutProgram[]): Promise<string[]> {
  const progs = programs ?? (await readPrograms());
  const fromPrograms = [DEFAULT_WORKOUT_PROGRAM, ...progs].flatMap(p =>
    (p?.days ?? []).flatMap(d => (d?.exercises ?? []).map(e => e.name)),
  );
  const [custom, hidden] = await Promise.all([readList(CUSTOM_KEY), readList(HIDDEN_KEY)]);
  const hiddenKeys = new Set(hidden.map(keyOf));
  return dedupeSorted([...COMMON_EXERCISES, ...fromPrograms, ...custom]).filter(
    n => !hiddenKeys.has(keyOf(n)),
  );
}

/** Save a new exercise name so it shows in the picker next time. Returns the cleaned name. */
export async function addExerciseToLibrary(name: string): Promise<string> {
  const clean = normalise(name);
  if (!clean) return clean;
  const [custom, hidden] = await Promise.all([readList(CUSTOM_KEY), readList(HIDDEN_KEY)]);
  if (!custom.some(n => keyOf(n) === keyOf(clean))) await writeList(CUSTOM_KEY, [...custom, clean]);
  if (hidden.some(n => keyOf(n) === keyOf(clean))) {
    await writeList(HIDDEN_KEY, hidden.filter(n => keyOf(n) !== keyOf(clean)));
  }
  return clean;
}

/** Remove a name from the picker list (doesn't touch any workout that already uses it). */
export async function removeExerciseFromLibrary(name: string): Promise<void> {
  const [custom, hidden] = await Promise.all([readList(CUSTOM_KEY), readList(HIDDEN_KEY)]);
  await writeList(CUSTOM_KEY, custom.filter(n => keyOf(n) !== keyOf(name)));
  if (!hidden.some(n => keyOf(n) === keyOf(name))) await writeList(HIDDEN_KEY, [...hidden, normalise(name)]);
}
