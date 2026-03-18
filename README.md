# PathFinder 🗺️

A privacy-first route tracking app built with **React Native (Expo)**, **MapTiler**, and **SQLite**. Record outdoor walks and runs with real-time GPS tracking, view your history, and revisit routes — all data stays on-device.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 / React Native 0.81 |
| Navigation | expo-router (file-based) |
| Styling | NativeWind 4 (Tailwind CSS) |
| State | Zustand |
| Persistence | expo-sqlite (WAL mode) |
| Maps | react-native-maps + MapTiler tiles |
| Location | expo-location (foreground + background) |
| Animations | react-native-reanimated |
| Testing | Maestro (E2E UI flows) |

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**

   Create a `.env` file in the project root:
   ```env
   EXPO_PUBLIC_MAPTILER_KEY=your_maptiler_key
   EXPO_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_key
   ```

3. **Run the app**
   ```bash
   npx expo start
   ```
   - Scan the QR code → Expo Go on a physical device
   - Press **i** → iOS Simulator
   - Press **a** → Android Emulator

> **Note:** Native features (background location, Google Maps on Android) require a development build:
> ```bash
> npx expo run:android   # or npx expo run:ios
> ```

## Project Structure

```
app/
├── (tabs)/
│   ├── index.tsx        # Map screen — live tracking + controls
│   └── history.tsx      # Activity history list
├── activity/[id].tsx    # Route detail modal with static map
└── _layout.tsx          # Root navigation stack

components/
├── map/MapDisplay.tsx   # Full-screen MapView with UrlTile overlay
└── ui/                  # Shared UI primitives

hooks/
├── useLocation.ts       # Permission flow + one-shot GPS fix
└── useTracking.ts       # Real-time GPS watcher (fg + bg)

store/
├── trackingStore.ts     # Live session state + Haversine distance
└── historyStore.ts      # Persisted activities from SQLite

services/
└── db.ts                # SQLite repository (migrations, CRUD)

types/
└── activity.ts          # Shared domain types
```

## E2E Testing

Maestro flows live in `.maestro/`:

```bash
maestro test .maestro/
```

| Flow | Description |
|---|---|
| `allow-location-tracking.yaml` | Grant permissions → track → save |
| `deny-location-permission.yaml` | Deny permissions → assert fallback UI |
| `history-flow.yaml` | Navigate history → open detail view |

## AI Assistance & Challenges

- Built with the assistance of **Gemini 3.1 Pro** and **Claude Sonnet 4.6**.
- **Challenges:** I didn't face any major challenges with the given project. The integration between Expo, SQLite, and NativeWind was straightforward and worked smoothly.
