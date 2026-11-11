export type RoutineExercise = {
  name: string;
  sets: number;
  /** Default target reps when all sets share the same scheme. */
  reps: string;
  /** Per-set target reps (length must equal `sets`). Overrides `reps` for each row. */
  setReps?: string[];
  /** Render a divider after this set number (1-based), e.g. between warm-up and working sets. */
  dividerAfterSet?: number;
  /** Bodyweight movement (e.g. Dips) — weight is optional/added load. */
  bodyweight?: boolean;
  /** Same id on consecutive exercises groups them as one superset slot. */
  supersetGroup?: string;
};

export type RoutineDay = {
  id: string;
  label: string;
  exercises: RoutineExercise[];
};

export type ExerciseSlot =
  | { kind: 'single'; exercise: RoutineExercise; index: number }
  | { kind: 'superset'; group: string; items: { exercise: RoutineExercise; index: number }[] };

export const ROUTINE: RoutineDay[] = [
  {
    id: 'day-1',
    label: 'Day 1 — Full body strength',
    exercises: [
      { name: 'Leg press', sets: 4, reps: '8' },
      { name: 'Barbell bench press', sets: 5, reps: '5' },
      { name: 'Cable lat pulldown', sets: 4, reps: '8' },
      { name: 'Lying leg curl', sets: 3, reps: '12' },
      { name: 'Dumbbell curls', sets: 3, reps: '12', supersetGroup: 'day-1-arms' },
      { name: 'Cable tricep pushdowns', sets: 3, reps: '12', supersetGroup: 'day-1-arms' },
    ],
  },
  {
    id: 'day-2',
    label: 'Day 2 — Upper body strength',
    exercises: [
      { name: 'Barbell overhead press', sets: 4, reps: '6' },
      { name: 'Incline dumbbell press', sets: 3, reps: '10' },
      { name: 'Seated cable row', sets: 4, reps: '8' },
      { name: 'Dumbbell hammer curls', sets: 3, reps: '10' },
      { name: 'Cable face pulls', sets: 3, reps: '15' },
    ],
  },
  {
    id: 'day-3',
    label: 'Day 3 — Hypertrophy',
    exercises: [
      { name: 'Machine chest press', sets: 4, reps: '10' },
      { name: 'Machine lat pulldown', sets: 4, reps: '12' },
      { name: 'Seated cable row', sets: 3, reps: '10' },
      { name: 'Leg extension', sets: 3, reps: '15' },
      { name: 'Lying leg curl', sets: 3, reps: '12' },
      { name: 'Standing calf raises', sets: 3, reps: '15' },
    ],
  },
  {
    id: 'day-4',
    label: 'Day 4 — Incline / legs',
    exercises: [
      { name: 'Barbell squat', sets: 4, reps: '8' },
      { name: 'Incline barbell bench press', sets: 4, reps: '6' },
      { name: 'Seated cable row', sets: 4, reps: '10' },
      { name: 'Cable lateral raises', sets: 3, reps: '15' },
      { name: 'Cable abdominal crunch', sets: 3, reps: '15' },
    ],
  },
  {
    id: 'day-5',
    label: 'Day 5 — Upper body',
    exercises: [
      { name: 'Bench press machine', sets: 4, reps: '12' },
      { name: 'Dumbbell shoulder press', sets: 3, reps: '8' },
      { name: 'One-arm dumbbell row', sets: 3, reps: '10' },
      { name: 'Barbell curls', sets: 3, reps: '12' },
      { name: 'Cable overhead tricep extensions', sets: 3, reps: '12' },
    ],
  },
  {
    id: 'day-6',
    label: 'Day 6 — Deadlift',
    exercises: [
      {
        name: 'Deadlift',
        sets: 11,
        reps: '3',
        setReps: ['10', '10', '5', '5', '3', '3', '2', '2', '3', '3', '3'],
        dividerAfterSet: 8,
      },
    ],
  },
];

export function getRoutineDay(id: string): RoutineDay | undefined {
  return ROUTINE.find((d) => d.id === id);
}

/** Target reps for one set row (supports per-set schemes via `setReps`). */
export function targetRepsForSet(exercise: RoutineExercise, setIndex: number): string {
  return exercise.setReps?.[setIndex] ?? exercise.reps;
}

/** Short label for the exercise block header. */
export function exerciseSetSummary(exercise: RoutineExercise): string {
  if (exercise.setReps?.length) {
    return `${exercise.sets} sets`;
  }
  return `${exercise.sets} × ${exercise.reps}`;
}

/** Groups consecutive exercises that share a `supersetGroup` into one slot. */
export function routineSlots(day: RoutineDay): ExerciseSlot[] {
  const slots: ExerciseSlot[] = [];
  for (let index = 0; index < day.exercises.length; index++) {
    const exercise = day.exercises[index];
    const group = exercise.supersetGroup;
    const last = slots[slots.length - 1];
    if (group && last?.kind === 'superset' && last.group === group) {
      last.items.push({ exercise, index });
      continue;
    }
    if (group) {
      slots.push({ kind: 'superset', group, items: [{ exercise, index }] });
      continue;
    }
    slots.push({ kind: 'single', exercise, index });
  }
  return slots;
}

export function routineSlotCount(day: RoutineDay): number {
  return routineSlots(day).length;
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
