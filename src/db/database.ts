import * as SQLite from 'expo-sqlite';

let database: SQLite.SQLiteDatabase | null = null;

/**
 * Opens (or reuses) the single SQLite file that stores all logged workout data.
 * Schema is intentionally minimal: a session per workout instance, and a row per logged set.
 */
export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) {
    return database;
  }
  const db = await SQLite.openDatabaseAsync('lift.db');
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id           TEXT PRIMARY KEY NOT NULL,
      day_id       TEXT NOT NULL,
      started_at   INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS set_logs (
      id           TEXT PRIMARY KEY NOT NULL,
      session_id   TEXT NOT NULL,
      exercise_key TEXT NOT NULL,
      set_index    INTEGER NOT NULL,
      target_reps  TEXT,
      weight       REAL,
      reps         INTEGER,
      rpe          REAL,
      created_at   INTEGER NOT NULL,
      UNIQUE (session_id, exercise_key, set_index),
      FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_set_logs_exercise ON set_logs(exercise_key, set_index);
    CREATE INDEX IF NOT EXISTS idx_sessions_day ON workout_sessions(day_id, started_at);
  `);

  // One-time cleanup: clears leftover test/seed data exactly once per device,
  // then bumps the version so real logged data is never wiped again. The seed
  // (seedIfEmpty) repopulates starting weights right after this on the same launch.
  const CLEANUP_VERSION = 4;
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((version?.user_version ?? 0) < CLEANUP_VERSION) {
    await db.runAsync('DELETE FROM set_logs');
    await db.runAsync('DELETE FROM workout_sessions');
    await db.execAsync(`PRAGMA user_version = ${CLEANUP_VERSION}`);
  }

  database = db;
  return db;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!database) {
    throw new Error('Database not opened yet. Call openDatabase() first.');
  }
  return database;
}
