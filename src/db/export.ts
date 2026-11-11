import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getRoutineDay, ROUTINE } from '../routine';
import { getDatabase } from './database';
import { exerciseKey } from './workouts';

export type WorkoutExportRecord = {
  sessionId: string;
  dayId: string;
  dayLabel: string;
  startedAt: string;
  completedAt: string | null;
  exerciseKey: string;
  exerciseName: string;
  setNumber: number;
  targetReps: string | null;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
};

export type WorkoutExport = {
  exportedAt: string;
  app: 'LiftLog';
  recordCount: number;
  records: WorkoutExportRecord[];
};

function exerciseNameByKey(): Map<string, string> {
  const map = new Map<string, string>();
  for (const day of ROUTINE) {
    for (const exercise of day.exercises) {
      map.set(exerciseKey(exercise.name), exercise.name);
    }
  }
  return map;
}

function toIso(ts: number | null): string | null {
  return ts == null ? null : new Date(ts).toISOString();
}

/** All logged sets as flat rows, oldest session first — easy to analyze in a spreadsheet or script. */
export async function buildWorkoutExport(): Promise<WorkoutExport> {
  const db = getDatabase();
  const names = exerciseNameByKey();
  const rows = await db.getAllAsync<{
    session_id: string;
    day_id: string;
    started_at: number;
    completed_at: number | null;
    exercise_key: string;
    set_index: number;
    target_reps: string | null;
    weight: number | null;
    reps: number | null;
    rpe: number | null;
  }>(
    `SELECT ws.id AS session_id,
            ws.day_id,
            ws.started_at,
            ws.completed_at,
            sl.exercise_key,
            sl.set_index,
            sl.target_reps,
            sl.weight,
            sl.reps,
            sl.rpe
     FROM set_logs sl
     JOIN workout_sessions ws ON ws.id = sl.session_id
     ORDER BY ws.started_at ASC, sl.exercise_key ASC, sl.set_index ASC`,
  );

  const records: WorkoutExportRecord[] = rows.map((row) => ({
    sessionId: row.session_id,
    dayId: row.day_id,
    dayLabel: getRoutineDay(row.day_id)?.label ?? row.day_id,
    startedAt: new Date(row.started_at).toISOString(),
    completedAt: toIso(row.completed_at),
    exerciseKey: row.exercise_key,
    exerciseName: names.get(row.exercise_key) ?? row.exercise_key,
    setNumber: row.set_index + 1,
    targetReps: row.target_reps,
    weightKg: row.weight,
    reps: row.reps,
    rpe: row.rpe,
  }));

  return {
    exportedAt: new Date().toISOString(),
    app: 'LiftLog',
    recordCount: records.length,
    records,
  };
}

/** Write export JSON to cache and open the system share sheet (save, Drive, email, etc.). */
export async function shareWorkoutExport(): Promise<void> {
  const data = await buildWorkoutExport();
  const json = JSON.stringify(data, null, 2);
  const filename = `liftlog-export-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File(Paths.cache, filename);
  file.write(json);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export LiftLog data',
  });
}
