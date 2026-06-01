import { randomUUID } from 'expo-crypto';

import { ROUTINE } from '../routine';
import { getDatabase } from './database';
import { exerciseKey } from './workouts';

/**
 * Starting working weight per exercise, keyed by `${dayId}:${exerciseKey}`.
 * Seeded as a single session dated yesterday so the values show as the "LAST"
 * reference and today's session starts as a clean slate.
 * `null` = bodyweight (no external load).
 */
const SEED_WEIGHTS: Record<string, number | null> = {
  'day-1:leg-press': 120,
  'day-1:barbell-bench-press': 65,
  'day-1:cable-lat-pulldown-strength': 50,
  'day-1:leg-extension': 40,
  'day-1:hamstring-curl': 25,
  'day-1:cable-tricep-pushdowns': 22.5,
  'day-1:dumbbell-curls': 12,

  'day-2:incline-dumbbell-press': 20,
  'day-2:barbell-overhead-press': 35,
  'day-2:laying-chest-supported-row': 35,
  'day-2:hammer-curl': 14,
  'day-2:face-pulls': 20,

  'day-3:seated-chest-supported-row-hypertrophy': 35,
  'day-3:machine-chest-press': 22,
  'day-3:cable-lat-pulldown-hypertrophy': 45,
  'day-3:dumbbell-lateral-raises': 10,
  'day-3:leg-extension': 40,
  'day-3:hamstring-curl': 25,

  'day-4:leg-press': 120,
  'day-4:incline-barbell-bench-press': 40,
  'day-4:seated-cable-row': 45,
  'day-4:leg-extension': 40,
  'day-4:cable-lateral-raises': 6,
  'day-4:cable-tricep-pushdowns': 22.5,

  'day-5:seated-chest-supported-row-strength': 40,
  'day-5:dips': null,
  'day-5:dumbbell-shoulder-press': 16,
  'day-5:chest-press': 40,
  'day-5:ez-bar-curl': 22.5,
  'day-5:face-pulls': 25,
};

/**
 * Seeds one session per day (dated yesterday) with the starting weights, only when the
 * database has no sessions yet. No RPE, so nothing is flagged for a weight increase.
 * Dating it in the past keeps today's session empty and surfaces these as "LAST".
 */
export async function seedIfEmpty(): Promise<void> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) AS c FROM workout_sessions`);
  if ((row?.c ?? 0) > 0) {
    return;
  }

  const ts = Date.now() - 24 * 60 * 60 * 1000;
  await db.withTransactionAsync(async () => {
    for (const day of ROUTINE) {
      const sessionId = randomUUID();
      await db.runAsync(
        `INSERT INTO workout_sessions (id, day_id, started_at, completed_at) VALUES (?, ?, ?, NULL)`,
        sessionId,
        day.id,
        ts,
      );
      for (const exercise of day.exercises) {
        const key = exerciseKey(exercise.name);
        const weight = SEED_WEIGHTS[`${day.id}:${key}`] ?? null;
        const reps = parseInt(exercise.reps, 10);
        for (let i = 0; i < exercise.sets; i++) {
          await db.runAsync(
            `INSERT INTO set_logs
               (id, session_id, exercise_key, set_index, target_reps, weight, reps, rpe, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
            randomUUID(),
            sessionId,
            key,
            i,
            exercise.reps,
            weight,
            Number.isFinite(reps) ? reps : null,
            ts,
          );
        }
      }
    }
  });
}
