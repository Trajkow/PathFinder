# PathFinder — Architecture

## Core Stack

| Layer            | Technology              | Purpose                                      |
| ---------------- | ----------------------- | -------------------------------------------- |
| **Framework**    | Expo SDK (Managed)      | Build toolchain, OTA updates, native modules |
| **Navigation**   | Expo Router             | File-based routing with typed routes          |
| **UI Library**   | NativeWindUI            | Primary component library (buttons, lists, cards, sheets, etc.) |
| **State**        | Zustand                 | Lightweight, hook-based global state          |
| **Persistence**  | Expo SQLite             | On-device relational storage                  |
| **Mapping**      | MapTiler SDK            | Vector tiles, polyline rendering, map styles  |
| **Styling**      | NativeWind (Tailwind)   | Utility-first styling with compile-time CSS   |
| **Location**     | expo-location           | Foreground/background GPS tracking            |
| **Type Safety**  | TypeScript (strict)     | Static analysis and compile-time guarantees   |

---

## Layered Architecture

```
┌─────────────────────────────────────────────┐
│                  UI Layer                   │
│  Screens (Expo Router) + Components         │
├─────────────────────────────────────────────┤
│               State Layer                   │
│  Zustand Stores (tracking, activities, ui)  │
├─────────────────────────────────────────────┤
│              Service Layer                  │
│  LocationService, MapService, StatsService  │
├─────────────────────────────────────────────┤
│               Data Layer                    │
│  Expo SQLite (ActivityRepository)           │
└─────────────────────────────────────────────┘
```

### Layer Rules

1. **UI Layer** — Renders state, dispatches actions. Built with **NativeWindUI** components as the default. No business logic. No direct DB or API calls.
2. **State Layer** — Zustand stores act as the single source of truth. Stores call services, never the other way around.
3. **Service Layer** — Encapsulates business logic (distance calculations, coordinate processing, permission flows). Framework-agnostic where possible.
4. **Data Layer** — Thin repository pattern over Expo SQLite. All queries are parameterized. All writes use transactions.

---

## Directory Structure

```
path-finder/
├── app/                    # Expo Router screens (file-based routing)
│   ├── (tabs)/             # Tab navigator group
│   │   ├── index.tsx       # Home / Map screen
│   │   ├── track.tsx       # Active tracking screen
│   │   └── history.tsx     # Activity history screen
│   ├── activity/[id].tsx   # Activity detail (dynamic route)
│   └── _layout.tsx         # Root layout
├── components/             # Reusable UI components
│   ├── nativewindui/       # NativeWindUI component overrides & extensions
│   ├── map/                # Map-specific components
│   ├── tracking/           # Tracking UI (stats overlay, controls)
│   └── ui/                 # Custom primitives (only if NativeWindUI lacks them)
├── stores/                 # Zustand state stores
│   ├── useTrackingStore.ts
│   ├── useActivityStore.ts
│   └── useSettingsStore.ts
├── services/               # Business logic & external integrations
│   ├── location.ts         # GPS tracking lifecycle
│   ├── map.ts              # MapTiler configuration
│   ├── stats.ts            # Distance, pace, duration calculations
│   └── permissions.ts      # Centralized permission handling
├── db/                     # Database layer
│   ├── schema.ts           # Table definitions & migrations
│   ├── client.ts           # SQLite connection singleton
│   └── repositories/       # Data access objects
│       └── activityRepo.ts
├── types/                  # Shared TypeScript interfaces
├── constants/              # App-wide constants (colors, config)
├── utils/                  # Pure utility functions
└── hooks/                  # Custom React hooks
```

---

## State Management (Zustand)

### Store Conventions

- One store per domain: `useTrackingStore`, `useActivityStore`, `useSettingsStore`.
- Use Zustand's `immer` middleware for complex nested state updates.
- Use selectors to prevent unnecessary re-renders: `useTrackingStore(s => s.isTracking)`.
- Async side effects (DB writes, API calls) live in store actions, not in components.

### Example Store Signature

```typescript
interface TrackingState {
  isTracking: boolean;
  coordinates: Coordinate[];
  elapsedMs: number;
  distanceMeters: number;

  // Actions
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  addCoordinate: (coord: Coordinate) => void;
  reset: () => void;
}
```

---

## Key Architectural Decisions

- **No backend.** All data is stored locally via Expo SQLite. Cloud sync is a future consideration.
- **Managed Workflow only.** No ejecting. All native functionality is accessed through Expo modules.
- **NativeWindUI as primary UI library.** Pre-built, accessible, NativeWind-compatible components. Custom components only when NativeWindUI lacks coverage.
- **MapTiler over Google Maps.** Chosen for its generous free tier, vector tile performance, and simpler API key management.
- **Zustand over Redux/Context.** Minimal boilerplate, excellent TypeScript support, and built-in selector patterns.
