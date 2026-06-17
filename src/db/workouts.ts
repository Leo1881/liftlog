import { randomUUID } from 'expo-crypto';

import { getDatabase } from './database';

/** Stable identifier for an exercise, derived from its name so the same lift is
 *  tracked as one history even when it appears on multiple days. */
export function exerciseKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type SetValues = {
  weight: number | null;
  reps: number | null;
  rpe: number | null;
};

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Returns today's session for the given day, creating one if it doesn't exist yet. */
export async function getOrCreateTodaySession(dayId: string): Promise<string> {
  const db = getDatabase();
  const start = startOfToday();
  const end = start + 24 * 60 * 60 * 1000;
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM workout_sessions
     WHERE day_id = ? AND started_at >= ? AND started_at < ?
     ORDER BY started_at DESC LIMIT 1`,
    dayId,
    start,
    end,
  );
  if (existing) {
    return existing.id;
  }
  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO workout_sessions (id, day_id, started_at, completed_at) VALUES (?, ?, ?, NULL)`,
    id,
    dayId,
    Date.now(),
  );
  return id;
}

/** Completed session count per day_id (Complete workout pressed, including finish anyway). */
export async function getCompletedSessionCounts(): Promise<Map<string, number>> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{ day_id: string; count: number }>(
    `SELECT day_id, COUNT(*) AS count
     FROM workout_sessions
     WHERE completed_at IS NOT NULL
     GROUP BY day_id`,
  );
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.day_id, row.count);
  }
  return map;
}

/** Date-stamps a session as complete (or re-stamps it) and returns the timestamp. */
export async function completeSession(sessionId: string): Promise<number> {
  const db = getDatabase();
  const ts = Date.now();
  await db.runAsync(`UPDATE workout_sessions SET completed_at = ? WHERE id = ?`, ts, sessionId);
  return ts;
}

/** The completion timestamp for a session, or null if it hasn't been marked complete. */
export async function getSessionCompletedAt(sessionId: string): Promise<number | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ completed_at: number | null }>(
    `SELECT completed_at FROM workout_sessions WHERE id = ?`,
    sessionId,
  );
  return row?.completed_at ?? null;
}

export type StoredSet = {
  exercise_key: string;
  set_index: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
};

/** Values already logged in this session, keyed as `${exercise_key}:${set_index}`. */
export async function loadSessionLogs(sessionId: string): Promise<Map<string, StoredSet>> {
  const db = getDatabase();
  const rows = await db.getAllAsync<StoredSet>(
    `SELECT exercise_key, set_index, weight, reps, rpe FROM set_logs WHERE session_id = ?`,
    sessionId,
  );
  const map = new Map<string, StoredSet>();
  for (const row of rows) {
    map.set(`${row.exercise_key}:${row.set_index}`, row);
  }
  return map;
}

export type LastSetRef = {
  weight: number | null;
  rpe: number | null;
};

/** Most recent weight and RPE for each set from an earlier session of the SAME day,
 *  keyed `${exercise_key}:${set_index}`. Values come from the same logged set row.
 *  Scoped per day so differing rep schemes don't mix. */
export async function loadLastSetRefs(
  currentSessionId: string,
  dayId: string,
): Promise<Map<string, LastSetRef>> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{
    exercise_key: string;
    set_index: number;
    weight: number | null;
    rpe: number | null;
  }>(
    `SELECT sl.exercise_key, sl.set_index, sl.weight, sl.rpe
     FROM set_logs sl
     JOIN workout_sessions ws ON ws.id = sl.session_id
     WHERE sl.weight IS NOT NULL AND sl.session_id != ? AND ws.day_id = ?
     ORDER BY sl.created_at DESC`,
    currentSessionId,
    dayId,
  );
  const map = new Map<string, LastSetRef>();
  for (const row of rows) {
    const key = `${row.exercise_key}:${row.set_index}`;
    if (!map.has(key)) {
      map.set(key, { weight: row.weight, rpe: row.rpe });
    }
  }
  return map;
}

/**
 * Exercises (by key) that should be flagged for a weight increase: the last 3 logged
 * sessions of that exercise (for this day) were all at the same top weight and all hit
 * a top RPE of 10. Bumping the weight breaks the same-weight streak, so this self-resets.
 */
export async function getIncreaseFlags(dayId: string): Promise<Set<string>> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{
    exercise_key: string;
    top_weight: number | null;
    top_rpe: number | null;
  }>(
    `SELECT sl.exercise_key AS exercise_key,
            MAX(sl.weight) AS top_weight,
            MAX(sl.rpe) AS top_rpe
     FROM set_logs sl
     JOIN workout_sessions ws ON ws.id = sl.session_id
     WHERE ws.day_id = ?
     GROUP BY ws.id, sl.exercise_key
     ORDER BY sl.exercise_key ASC, ws.started_at DESC`,
    dayId,
  );

  const byExercise = new Map<string, { weight: number | null; rpe: number | null }[]>();
  for (const r of rows) {
    const arr = byExercise.get(r.exercise_key) ?? [];
    arr.push({ weight: r.top_weight, rpe: r.top_rpe });
    byExercise.set(r.exercise_key, arr);
  }

  const flags = new Set<string>();
  for (const [key, sessions] of byExercise) {
    if (sessions.length < 3) {
      continue;
    }
    const [a, b, c] = sessions; // three most recent, newest first
    const sameWeight = a.weight === b.weight && b.weight === c.weight;
    const allMaxRpe = a.rpe === 10 && b.rpe === 10 && c.rpe === 10;
    if (sameWeight && allMaxRpe) {
      flags.add(key);
    }
  }
  return flags;
}

export type ExerciseHistoryPoint = {
  started_at: number;
  top_weight: number;
  e1rm: number;
};

/**
 * Per-day progression for one exercise (oldest -> newest):
 * top weight and estimated 1RM (Epley: weight * (1 + reps/30), best set).
 * Multiple sessions on the same calendar day collapse into one point using the
 * highest values, so the same lift done on two days isn't double-counted per date.
 * Only days with a logged weight are included.
 */
export async function getExerciseHistory(key: string): Promise<ExerciseHistoryPoint[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{
    started_at: number;
    top_weight: number | null;
    e1rm: number | null;
  }>(
    `SELECT MIN(ws.started_at) AS started_at,
            MAX(sl.weight) AS top_weight,
            MAX(sl.weight * (1 + sl.reps / 30.0)) AS e1rm
     FROM set_logs sl
     JOIN workout_sessions ws ON ws.id = sl.session_id
     WHERE sl.exercise_key = ?
     GROUP BY date(ws.started_at / 1000, 'unixepoch', 'localtime')
     HAVING top_weight IS NOT NULL
     ORDER BY started_at ASC`,
    key,
  );
  return rows.map((r) => ({
    started_at: r.started_at,
    top_weight: r.top_weight ?? 0,
    e1rm: r.e1rm != null ? Math.round(r.e1rm * 10) / 10 : (r.top_weight ?? 0),
  }));
}

export async function saveSetLog(
  sessionId: string,
  key: string,
  setIndex: number,
  targetReps: string,
  values: SetValues,
): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO set_logs (id, session_id, exercise_key, set_index, target_reps, weight, reps, rpe, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id, exercise_key, set_index) DO UPDATE SET
       target_reps = excluded.target_reps,
       weight = excluded.weight,
       reps = excluded.reps,
       rpe = excluded.rpe,
       created_at = excluded.created_at`,
    randomUUID(),
    sessionId,
    key,
    setIndex,
    targetReps,
    values.weight,
    values.reps,
    values.rpe,
    Date.now(),
  );
}
