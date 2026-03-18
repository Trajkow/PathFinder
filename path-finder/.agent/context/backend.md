# PathFinder — Backend Context

> **"Backend" = Local data layer.** PathFinder v1 has no remote server.
> All data operations happen on-device via Expo SQLite and MapTiler's hosted tile API.

---

## Expo SQLite — Data Layer Guidelines

### Connection Management

```typescript
// db/client.ts — Singleton pattern
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('pathfinder.db');
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
  return db;
}
```

- **Single connection.** One `SQLiteDatabase` instance, reused across the app.
- **WAL mode.** Enables concurrent reads during writes — critical during active tracking.
- **Foreign keys enabled.** Enforced via PRAGMA on every connection open.

### Transaction Rules

1. **All writes must use transactions.**
   ```typescript
   await db.withTransactionAsync(async () => {
     await db.runAsync('INSERT INTO activities ...', params);
   });
   ```
2. **Never nest transactions.** SQLite does not support nested transactions. Compose operations within a single `withTransactionAsync` call.
3. **Keep transactions short.** Do not perform network calls or heavy computation inside a transaction.
4. **Handle rollbacks.** If any statement inside `withTransactionAsync` throws, the entire transaction is rolled back automatically.

### Query Patterns

```typescript
// READ — Always use parameterized queries
const activities = await db.getAllAsync<Activity>(
  'SELECT * FROM activities ORDER BY date DESC LIMIT ?',
  [limit]
);

// WRITE — Always in a transaction
await db.withTransactionAsync(async () => {
  await db.runAsync(
    'INSERT INTO activities (id, date, duration, total_distance, coordinates_json) VALUES (?, ?, ?, ?, ?)',
    [id, date, duration, distance, JSON.stringify(coordinates)]
  );
});
```

- **Never interpolate values into SQL strings.** Always use `?` placeholders.
- **Type query results.** Use generics: `getAllAsync<Activity>(...)`.
- **Handle empty results.** Always check for `null` / empty arrays after queries.

### Migration Strategy

```typescript
// db/schema.ts
const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        duration INTEGER NOT NULL,
        total_distance REAL NOT NULL,
        coordinates_json TEXT NOT NULL
      );
    `,
  },
  // Future migrations append here with incrementing version
];

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY);'
  );

  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM _migrations'
  );
  const appliedSet = new Set(applied.map((m) => m.version));

  for (const migration of MIGRATIONS) {
    if (!appliedSet.has(migration.version)) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(migration.sql);
        await db.runAsync('INSERT INTO _migrations (version) VALUES (?)', [
          migration.version,
        ]);
      });
    }
  }
}
```

---

## MapTiler API — Integration Guidelines

### API Key Management

```typescript
// constants/config.ts
export const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';
```

- Store key in `.env` as `EXPO_PUBLIC_MAPTILER_KEY`.
- **Never commit the key.** Ensure `.env` is in `.gitignore`.
- Validate key presence on app startup; show a clear error if missing.

### Map Style URL

```typescript
const MAP_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_API_KEY}`;
```

### Tile Usage

- **Free tier:** 100,000 tile loads/month.
- Monitor usage via the MapTiler dashboard.
- Consider caching strategies if approaching limits.

### Polyline Rendering

- Use MapLibre GL's `LineLayer` with GeoJSON source for route polylines.
- Update the GeoJSON source reactively as new coordinates arrive during tracking.
- Style the polyline with the accent color and a subtle glow/outline for visibility.

```typescript
// Polyline style reference
{
  lineColor: Colors.polyline,     // '#007AFF'
  lineWidth: 4,
  lineOpacity: 0.9,
  lineCap: 'round',
  lineJoin: 'round',
}
```

### Rate Limiting & Error Handling

- Handle `429 Too Many Requests` gracefully — show cached/blank map, do not crash.
- Handle network failures — map tiles may not load offline. Show a fallback UI.
- Log tile load errors for debugging but do not surface them to the user during tracking.
