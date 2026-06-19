export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight?: number;
  notes?: string;
}

export interface WorkoutDay {
  id: string;
  name: string;
  focus: string;
  exercises: Exercise[];
}

export interface WorkoutProgram {
  id: string;
  name: string;
  days: WorkoutDay[];
  isActive: boolean;
  createdAt: string;
}

export interface WorkoutLog {
  id: string;
  date: string;
  programId: string;
  dayId: string;
  dayName: string;
  focus: string;
  exercises: {
    exerciseId: string;
    name: string;
    sets: number;
    reps: string;
    weight?: number;
    notes?: string;
  }[];
  completed: boolean;
}

export interface UserProfile {
  name: string;
  age?: number;
  height?: number;
  currentWeight: number;
  goalWeight: number;
  profilePicture?: string;
  weightUnit: 'kg' | 'lbs';
  gender?: 'male' | 'female';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  weightUnit: 'kg' | 'lbs';
  timerDuration: number;
}
