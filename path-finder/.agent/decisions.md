# PathFinder — Architecture Decision Records

## ADR Template

When a significant architectural choice is made, log it below using this format:

```
### ADR-NNN: [Title]
- **Date:** YYYY-MM-DD
- **Status:** Accepted | Deprecated | Superseded by ADR-NNN
- **Context:** Why this decision was needed.
- **Decision:** What was decided.
- **Alternatives Considered:** What else was evaluated.
- **Consequences:** Trade-offs and implications.
```

---

## Decision Log

### ADR-001: Expo Managed Workflow
- **Date:** 2026-03-17
- **Status:** Accepted
- **Context:** The app needs cross-platform support (iOS + Android) with access to GPS, maps, and local storage. Development speed and OTA update capability are priorities.
- **Decision:** Use Expo Managed Workflow exclusively. No ejecting to bare workflow.
- **Alternatives Considered:**
  - **Bare React Native** — Full native control, but significantly higher maintenance burden and slower iteration.
  - **Flutter** — Strong performance, but the team's expertise is in React/TypeScript.
- **Consequences:** Limited to Expo-compatible native modules. Background location tracking may require future evaluation of expo-task-manager. OTA updates via EAS Update are a significant advantage.

---

### ADR-002: Zustand for State Management
- **Date:** 2026-03-17
- **Status:** Accepted
- **Context:** The app requires global state for tracking status, coordinates, and activity history. The state shape is moderate complexity with frequent updates during active tracking.
- **Decision:** Use Zustand with immer middleware for all global state.
- **Alternatives Considered:**
  - **Redux Toolkit** — Industry standard, but introduces boilerplate (slices, reducers, actions) that is overkill for this app's scope.
  - **React Context** — Built-in, but causes full subtree re-renders and lacks middleware support.
  - **Jotai** — Atomic model is elegant, but Zustand's store-based model maps more naturally to the app's domain boundaries.
- **Consequences:** Minimal boilerplate. Excellent TypeScript inference. Selector pattern prevents unnecessary re-renders. Team must follow store-per-domain convention strictly.

---

### ADR-003: Expo SQLite for Local Persistence
- **Date:** 2026-03-17
- **Status:** Accepted
- **Context:** Activity data (routes, stats, timestamps) must persist across app restarts. The data is relational (activities with coordinates) and query patterns include filtering and sorting.
- **Decision:** Use Expo SQLite with a thin repository abstraction.
- **Alternatives Considered:**
  - **AsyncStorage** — Key-value only. Poor fit for relational activity data and querying.
  - **WatermelonDB** — Powerful but heavyweight for a v1 with no sync requirements.
  - **MMKV** — Blazing fast for key-value, but lacks relational query support.
- **Consequences:** Full SQL query power. Transactions for data integrity. Coordinates stored as JSON within activity rows for v1 simplicity. Migration system needed for schema evolution.

---

### ADR-004: MapTiler for Mapping
- **Date:** 2026-03-17
- **Status:** Accepted
- **Context:** The app needs an interactive map with polyline rendering, smooth pan/zoom, and customizable styling. Cost and API key management should be simple.
- **Decision:** Use MapTiler SDK for React Native (built on MapLibre GL).
- **Alternatives Considered:**
  - **Google Maps** — Ubiquitous but expensive at scale. API key management is more complex.
  - **Mapbox** — Excellent, but recent pricing changes and proprietary SDK lock-in.
  - **Raw MapLibre GL** — Free and open, but MapTiler provides hosted tiles and simpler setup.
- **Consequences:** Generous free tier (100k tile loads/month). Vector tiles with better performance than raster. Custom map styles available. Dependency on MapTiler tile servers (acceptable for v1).

---

### ADR-005: NativeWind for Styling
- **Date:** 2026-03-17
- **Status:** Accepted
- **Context:** The app needs a consistent, maintainable styling system that supports rapid UI iteration and enforces a design system.
- **Decision:** Use NativeWind (Tailwind CSS for React Native) as the sole styling solution.
- **Alternatives Considered:**
  - **StyleSheet.create** — Native API, but verbose and hard to maintain design consistency.
  - **Styled Components** — Powerful theming, but runtime overhead and less TypeScript-friendly.
  - **Tamagui** — Excellent performance, but adds significant complexity for a project of this scope.
- **Consequences:** Familiar Tailwind utility classes. Compile-time CSS processing. Design tokens enforced through Tailwind config. Team must avoid inline `style` props entirely.
