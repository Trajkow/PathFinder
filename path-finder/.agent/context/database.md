# PathFinder — Database Schema

## Engine

- **SQLite** via `expo-sqlite`
- **Journal mode:** WAL (Write-Ahead Logging)
- **Foreign keys:** Enabled via PRAGMA

---

## Tables

### `activities`

The primary table storing recorded GPS activity sessions.

```sql
CREATE TABLE IF NOT EXISTS activities (
    id              TEXT PRIMARY KEY NOT NULL,   -- UUID v4, generated client-side
    date            TEXT NOT NULL,               -- ISO 8601 timestamp (session start)
    duration        INTEGER NOT NULL,            -- Total duration in milliseconds
    total_distance  REAL NOT NULL,               -- Total distance in meters
    coordinates_json TEXT NOT NULL               -- JSON array of coordinate objects
);
```

#### Column Details

| Column             | Type    | Constraints      | Description                                        |
| ------------------ | ------- | ---------------- | -------------------------------------------------- |
| `id`               | TEXT    | PK, NOT NULL     | UUID v4 string, generated at session start          |
| `date`             | TEXT    | NOT NULL         | ISO 8601 datetime string of session start           |
| `duration`         | INTEGER | NOT NULL         | Session duration in **milliseconds**                |
| `total_distance`   | REAL    | NOT NULL         | Total distance traveled in **meters**               |
| `coordinates_json` | TEXT    | NOT NULL         | Stringified JSON array of `Coordinate` objects      |

#### `coordinates_json` Format

```typescript
interface Coordinate {
  latitude: number;
  longitude: number;
  altitude: number | null;
  timestamp: number;       // Unix timestamp in ms
  accuracy: number | null; // Horizontal accuracy in meters
}
```

**Example value:**
```json
[
  {
    "latitude": 41.9981,
    "longitude": 21.4254,
    "altitude": 245.3,
    "timestamp": 1710684200000,
    "accuracy": 5.2
  },
  {
    "latitude": 41.9983,
    "longitude": 21.4258,
    "altitude": 246.1,
    "timestamp": 1710684203000,
    "accuracy": 4.8
  }
]
```

---

### `_migrations`

Internal table for tracking applied schema migrations.

```sql
CREATE TABLE IF NOT EXISTS _migrations (
    version INTEGER PRIMARY KEY
);
```

---

## Indexes

```sql
-- Optimize activity listing (sorted by date, most recent first)
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities (date DESC);
```

---

## TypeScript Interface

```typescript
// types/activity.ts
export interface Activity {
  id: string;
  date: string;           // ISO 8601
  duration: number;        // milliseconds
  totalDistance: number;    // meters
  coordinatesJson: string; // raw JSON string from DB
}

// Parsed representation for use in UI/service layer
export interface ActivityWithCoordinates extends Omit<Activity, 'coordinatesJson'> {
  coordinates: Coordinate[];
}

export interface Coordinate {
  latitude: number;
  longitude: number;
  altitude: number | null;
  timestamp: number;
  accuracy: number | null;
}
```

---

## Repository Pattern

```typescript
// db/repositories/activityRepo.ts

export interface ActivityRepository {
  /** Insert a new activity. Must be called within a transaction. */
  create(activity: Activity): Promise<void>;

  /** Get all activities, most recent first. */
  getAll(limit?: number): Promise<Activity[]>;

  /** Get a single activity by ID. Returns null if not found. */
  getById(id: string): Promise<Activity | null>;

  /** Delete an activity by ID. Returns true if a row was deleted. */
  deleteById(id: string): Promise<boolean>;
}
```

---

## Design Decisions

1. **Coordinates as JSON.**
   Storing coordinates as a JSON blob in a single column (vs. a separate `coordinates` table with a foreign key) is a deliberate v1 trade-off:
   - ✅ Simpler schema, faster writes during active tracking.
   - ✅ Atomic save — one INSERT per activity, no partial writes.
   - ⚠️ Cannot query individual coordinates via SQL.
   - ⚠️ Large JSON blobs for long sessions (mitigated by coordinate filtering).

   > **Migration path:** If coordinate-level queries become necessary (e.g., heatmaps, segment analysis), introduce a `coordinates` table in a future migration.

2. **Duration in milliseconds.**
   Millisecond precision avoids floating-point issues and simplifies pause/resume arithmetic.

3. **Distance in meters.**
   Meters as the base unit; formatting to km/mi happens in the presentation layer.

4. **UUID v4 for IDs.**
   Avoids auto-increment conflicts and is safe for potential future sync scenarios.
