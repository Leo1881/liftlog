export type RoutineExercise = {
  name: string;
  sets: number;
  /** Kept as text so values like "20 x 60" (intervals) display correctly. */
  reps: string;
  /** Bodyweight movement (e.g. Dips) — weight is optional/added load. */
  bodyweight?: boolean;
};

export type RoutineDay = {
  id: string;
  label: string;
  exercises: RoutineExercise[];
};

export const ROUTINE: RoutineDay[] = [
  {
    id: 'day-1',
    label: 'Day 1',
    exercises: [
      { name: 'Leg Press', sets: 4, reps: '8' },
      { name: 'Barbell Bench Press', sets: 5, reps: '5' },
      { name: 'Cable Lat Pulldown (Strength)', sets: 4, reps: '8' },
      { name: 'Leg Extension', sets: 3, reps: '15' },
      { name: 'Hamstring Curl', sets: 3, reps: '15' },
      { name: 'Cable Tricep Pushdowns', sets: 3, reps: '12' },
      { name: 'Dumbbell Curls', sets: 3, reps: '12' },
    ],
  },
  {
    id: 'day-2',
    label: 'Day 2',
    exercises: [
      { name: 'Incline Dumbbell Press', sets: 3, reps: '10' },
      { name: 'Barbell Overhead Press', sets: 4, reps: '6' },
      { name: 'Laying Chest Supported Row', sets: 4, reps: '8' },
      { name: 'Hammer Curl', sets: 3, reps: '10' },
      { name: 'Face Pulls', sets: 3, reps: '15' },
    ],
  },
  {
    id: 'day-3',
    label: 'Day 3',
    exercises: [
      { name: 'Seated Chest-Supported Row (Hypertrophy)', sets: 3, reps: '10' },
      { name: 'Machine Chest Press', sets: 3, reps: '10' },
      { name: 'Cable Lat Pulldown (Hypertrophy)', sets: 3, reps: '12' },
      { name: 'Dumbbell Lateral Raises', sets: 3, reps: '15' },
      { name: 'Leg Extension', sets: 3, reps: '15' },
      { name: 'Hamstring Curl', sets: 3, reps: '15' },
    ],
  },
  {
    id: 'day-4',
    label: 'Day 4',
    exercises: [
      { name: 'Leg Press', sets: 4, reps: '8' },
      { name: 'Incline Barbell Bench Press', sets: 4, reps: '6' },
      { name: 'Seated Cable Row', sets: 4, reps: '10' },
      { name: 'Leg Extension', sets: 3, reps: '15' },
      { name: 'Cable Lateral Raises', sets: 3, reps: '15' },
      { name: 'Cable Tricep Pushdowns', sets: 3, reps: '12' },
    ],
  },
  {
    id: 'day-5',
    label: 'Day 5',
    exercises: [
      { name: 'Seated Chest-Supported Row (Strength)', sets: 4, reps: '8' },
      { name: 'Dips', sets: 4, reps: '8', bodyweight: true },
      { name: 'Dumbbell Shoulder Press', sets: 4, reps: '8' },
      { name: 'Chest Press', sets: 4, reps: '12' },
      { name: 'EZ Bar Curl', sets: 3, reps: '12' },
      { name: 'Face Pulls', sets: 3, reps: '15' },
    ],
  },
];

export function getRoutineDay(id: string): RoutineDay | undefined {
  return ROUTINE.find((d) => d.id === id);
}

/** Unique exercise names across all days, in first-seen order. */
export function listUniqueExerciseNames(): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const day of ROUTINE) {
    for (const exercise of day.exercises) {
      if (!seen.has(exercise.name)) {
        seen.add(exercise.name);
        names.push(exercise.name);
      }
    }
  }
  return names;
}
