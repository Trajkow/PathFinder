import { create } from 'zustand';
import type { Coordinate } from '@/types/activity';
import type { TrackingDraft } from '@/services/db';

// ─── Haversine distance ───────────────────────────────────────────────────────

const TO_RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6_371_000; // metres

/**
 * Returns the great-circle distance **in metres** between two lat/lng points
 * using the Haversine formula.
 */
function haversineMeters(
  a: Pick<Coordinate, 'latitude' | 'longitude'>,
  b: Pick<Coordinate, 'latitude' | 'longitude'>,
): number {
  const dLat = (b.latitude - a.latitude) * TO_RAD;
  const dLon = (b.longitude - a.longitude) * TO_RAD;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(a.latitude * TO_RAD) *
      Math.cos(b.latitude * TO_RAD) *
      sinDLon *
      sinDLon;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// ─── State & Actions ──────────────────────────────────────────────────────────

interface TrackingState {
  /** Whether a route is actively being recorded. */
  isTracking: boolean;
  /** `true` when the session is alive but GPS signal was lost (permission revoked, GPS disabled). */
  isPaused: boolean;
  /** Human-readable reason the session was paused. `null` when not paused. */
  pauseReason: string | null;
  /** Ordered list of GPS fixes captured during the current session. */
  routeCoordinates: Coordinate[];
  /** Accumulated distance in **meters** for the current session. */
  totalDistanceMeters: number;
  /** Timestamp when the current session was started. `null` when idle. */
  startTime: Date | null;
}

interface TrackingActions {
  /**
   * Begin a new tracking session.
   * Clears any previous route data and marks the session start time.
   */
  startTracking: () => void;
  /**
   * Stop recording and mark the session as complete.
   * Call this before persisting the session via `saveActivity`.
   */
  stopTracking: () => void;
  /**
   * Pause the session without stopping it — route data is preserved.
   * Called automatically when the heartbeat detects GPS/permission loss.
   */
  pauseTracking: (reason: string) => void;
  /**
   * Resume a paused session. The watcher will restart in `useTracking`.
   */
  resumeTracking: () => void;
  /**
   * Reset all tracking state back to the initial/idle values.
   * Typically called after the session has been saved to the DB.
   */
  resetTracking: () => void;
  /**
   * Append a new GPS fix to the route and accumulate the Haversine distance.
   * No-op when `isTracking` is `false` or `isPaused` is `true`.
   */
  addCoordinate: (coord: Coordinate) => void;
  /**
   * Hydrate the store from a persisted draft (recovered after an app kill).
   * Sets `isTracking = true` and `isPaused = true` so the user must explicitly resume.
   */
  restoreFromDraft: (draft: TrackingDraft) => void;
  /**
   * Returns a snapshot of the current session in draft format for periodic flushing.
   * Returns `null` if no session is active.
   */
  getDraftSnapshot: () => TrackingDraft | null;
}

type TrackingStore = TrackingState & TrackingActions;

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_STATE: TrackingState = {
  isTracking: false,
  isPaused: false,
  pauseReason: null,
  routeCoordinates: [],
  totalDistanceMeters: 0,
  startTime: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTrackingStore = create<TrackingStore>((set, get) => ({
  ...INITIAL_STATE,

  startTracking: () => {
    set({
      isTracking: true,
      isPaused: false,
      pauseReason: null,
      routeCoordinates: [],
      totalDistanceMeters: 0,
      startTime: new Date(),
    });
  },

  stopTracking: () => {
    set({ isTracking: false, isPaused: false, pauseReason: null });
  },

  pauseTracking: (reason: string) => {
    set({ isPaused: true, pauseReason: reason });
  },

  resumeTracking: () => {
    set({ isPaused: false, pauseReason: null });
  },

  resetTracking: () => {
    set({ ...INITIAL_STATE });
  },

  addCoordinate: (coord: Coordinate) => {
    const { isTracking, isPaused, routeCoordinates, totalDistanceMeters } = get();
    if (!isTracking || isPaused) return;

    const last = routeCoordinates.at(-1);
    const delta = last ? haversineMeters(last, coord) : 0;

    set({
      routeCoordinates: [...routeCoordinates, coord],
      totalDistanceMeters: totalDistanceMeters + delta,
    });
  },

  restoreFromDraft: (draft: TrackingDraft) => {
    set({
      isTracking: true,
      isPaused: false,
      pauseReason: null,
      routeCoordinates: draft.routeCoordinates,
      totalDistanceMeters: draft.totalDistanceMeters,
      startTime: new Date(draft.startTime),
    });
  },

  getDraftSnapshot: () => {
    const { isTracking, routeCoordinates, totalDistanceMeters, startTime } = get();
    if (!isTracking || !startTime) return null;

    return {
      startTime: startTime.toISOString(),
      routeCoordinates,
      totalDistanceMeters,
      savedAt: new Date().toISOString(),
    };
  },
}));
