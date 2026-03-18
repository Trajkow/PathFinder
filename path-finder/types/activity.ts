/**
 * Shared domain types for PathFinder's activity / tracking layer.
 * These match the SQLite schema defined in database.md exactly.
 */

// ─── Coordinate ───────────────────────────────────────────────────────────────

/**
 * A single GPS fix, as captured by expo-location and stored in SQLite.
 * Matches the `coordinates_json` column format in the `activities` table.
 */
export interface Coordinate {
  latitude: number;
  longitude: number;
  /** Altitude in metres above sea level. `null` if unavailable. */
  altitude: number | null;
  /** Unix timestamp in milliseconds at which this fix was recorded. */
  timestamp: number;
  /** Horizontal accuracy radius in metres. `null` if unavailable. */
  accuracy: number | null;
}

// ─── Activity (DB row) ────────────────────────────────────────────────────────

/**
 * A completed route session as stored in the `activities` table.
 * `coordinatesJson` is the raw JSON string from the DB column.
 */
export interface Activity {
  /** UUID v4 string, generated client-side at session start. */
  id: string;
  /** ISO 8601 datetime string of session start. */
  date: string;
  /** Session duration in **milliseconds**. */
  duration: number;
  /** Total distance traveled in **meters**. */
  totalDistance: number;
  /** Stringified JSON array of {@link Coordinate} objects. */
  coordinatesJson: string;
}

/**
 * Parsed representation of an activity for use in UI/service layers.
 * `coordinates` replaces the raw JSON string.
 */
export interface ActivityWithCoordinates extends Omit<Activity, 'coordinatesJson'> {
  coordinates: Coordinate[];
}
