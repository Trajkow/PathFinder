# PathFinder — Product Definition

## Vision

PathFinder is a real-time GPS tracking app that lets users record outdoor activities (walks, runs, hikes, bike rides) with beautiful route visualization and meaningful performance statistics — all stored locally on-device.

---

## Core Objective

Record a user's route via GPS, render it as a polyline on an interactive map, calculate live statistics, and persist each session as a reviewable activity in the user's history.

---

## Key Features

### 1. Real-Time Route Tracking
- Continuous GPS sampling in the foreground.
- Live polyline rendering on a MapTiler-powered map.
- Visual breadcrumb trail that grows as the user moves.

### 2. Live Statistics Dashboard
- **Distance** — Running total in km/mi, updated on every new coordinate.
- **Duration** — Elapsed time from session start, pausing excluded.
- **Pace** — Current pace (min/km or min/mi), calculated over a rolling window.
- Stats overlay is always visible on the tracking screen without obscuring the map.

### 3. Session Controls
- **Start** — Begin recording a new activity.
- **Pause / Resume** — Temporarily halt tracking without ending the session.
- **Stop & Save** — End the session, compute final stats, persist to SQLite.
- **Discard** — Cancel the session without saving.

### 4. Activity History
- Chronological list of all saved activities.
- Each entry shows: date, duration, total distance.
- Tap to view the full route on a static map with summary stats.

### 5. Activity Detail
- Full-screen map replay of the recorded route.
- Stat summary: total distance, duration, average pace, start/end time.

---

## Non-Goals (v1)

- ❌ Cloud sync / account system
- ❌ Social features (sharing, leaderboards)
- ❌ Elevation tracking
- ❌ Background tracking / notifications
- ❌ Multi-sport categorization
- ❌ Offline map caching

---

## User Flow

```
App Launch
    │
    ├── [Permission Check] ─── Denied ──→ Permission Prompt Screen
    │                                          │
    │                                     Granted ↓
    ▼
Home Screen (Map)
    │
    ├── Tap "Start" ──→ Tracking Screen
    │                     │
    │                     ├── Live map + polyline
    │                     ├── Stats overlay
    │                     ├── Pause / Resume
    │                     └── Stop ──→ Save Activity ──→ History
    │
    └── Tap "History" ──→ Activity List
                            │
                            └── Tap Activity ──→ Activity Detail
```

---

## Quality Attributes

| Attribute       | Target                                                   |
| --------------- | -------------------------------------------------------- |
| **Startup**     | < 2s to interactive on mid-range device                  |
| **Tracking**    | GPS update interval: 1-3s (adaptive to speed)            |
| **Storage**     | Efficient coordinate compression for sessions > 1 hour   |
| **UX**          | Zero modals/popups during active tracking                |
| **Reliability** | Auto-save coordinates on crash; recoverable sessions     |
