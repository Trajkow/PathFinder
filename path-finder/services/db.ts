/**
 * PathFinder — SQLite Database Service
 *
 * Thin repository wrapper around `expo-sqlite`.
 *
 * Schema (see .agent/context/database.md):
 *   activities  — UUID-keyed route sessions (date, duration ms, distance m, coords JSON)
 *   _migrations — applied migration version tracking
 *
 * WAL mode + foreign keys are enabled on every connection open.
 */

import * as SQLite from 'expo-sqlite';
import type { Activity } from '@/types/activity';

// ─── Constants ────────────────────────────────────────────────────────────────

const DB_NAME = 'pathfinder_v2.db';
const CURRENT_MIGRATION = 2;

// ─── Connection ───────────────────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Returns the singleton DB connection, opening and migrating it on first call.
 */
async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // Performance + integrity pragmas
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await migrate(db);

  _db = db;
  return db;
}

// ─── Migrations ───────────────────────────────────────────────────────────────

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  // Bootstrap the migrations table itself
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY
    );
  `);

  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) AS version FROM _migrations;',
  );
  const appliedVersion = row?.version ?? 0;

  if (appliedVersion < CURRENT_MIGRATION) {
    await db.execAsync(`DROP TABLE IF EXISTS activities;`);
    await db.execAsync(`
      CREATE TABLE activities (
        id               TEXT    PRIMARY KEY NOT NULL,
        date             TEXT    NOT NULL,
        duration         INTEGER NOT NULL,
        total_distance   REAL    NOT NULL,
        coordinates_json TEXT    NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_activities_date
        ON activities (date DESC);
    `);
    await db.runAsync(
      'INSERT OR IGNORE INTO _migrations (version) VALUES (?);',
      CURRENT_MIGRATION,
    );
  }
}

// ─── UUID helper ──────────────────────────────────────────────────────────────

/**
 * Generates a v4-compatible UUID using Math.random.
 * `crypto.randomUUID()` is available in Hermes ≥ 0.73 / RN 0.74+; this
 * fallback works across all Expo SDK 50+ targets.
 */
function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC 4122 §4.4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Repository ───────────────────────────────────────────────────────────────

export interface SaveActivityParams {
  /** ISO 8601 datetime string of session start. */
  date: string;
  /** Duration in **milliseconds**. */
  duration: number;
  /** Total distance in **meters**. */
  totalDistanceMeters: number;
  /** Already-JSON-stringified coordinate array. */
  coordinatesJson: string;
}

/**
 * Inserts a completed route session into the `activities` table.
 * Generates and returns the new row's UUID.
 */
export async function saveActivity(params: SaveActivityParams): Promise<string> {
  const db = await getDb();
  const id = uuid();

  await db.runAsync(
    `INSERT INTO activities (id, date, duration, total_distance, coordinates_json)
     VALUES (?, ?, ?, ?, ?);`,
    id,
    params.date,
    params.duration,
    params.totalDistanceMeters,
    params.coordinatesJson,
  );

  return id;
}

/**
 * Returns all activities ordered by date descending (most recent first).
 */
export async function getAllActivities(): Promise<Activity[]> {
  const db = await getDb();

  const rows = await db.getAllAsync<{
    id: string;
    date: string;
    duration: number;
    total_distance: number;
    coordinates_json: string;
  }>('SELECT * FROM activities ORDER BY date DESC;');

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    duration: r.duration,
    totalDistance: r.total_distance,
    coordinatesJson: r.coordinates_json,
  }));
}

/**
 * Deletes a single activity by its UUID.
 * Returns `true` if a row was removed, `false` if nothing matched.
 */
export async function deleteActivity(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.runAsync('DELETE FROM activities WHERE id = ?;', id);
  return result.changes > 0;
}
