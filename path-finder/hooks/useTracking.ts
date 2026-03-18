/**
 * useTracking — Real-time GPS tracking via expo-location.
 *
 * Fixes applied (v2):
 * - Read `addCoordinate` imperatively via `getState()` inside the location
 *   callback. This removes it from the useEffect dependency array and prevents
 *   the watcher from being torn down + rebuilt every render.
 * - Wrap `requestBackgroundPermissionsAsync` in a try/catch that can never
 *   surface-throw, so a permission denial can never block the foreground watcher.
 * - Drop accuracy from `BestForNavigation` → `High` for reliable updates on
 *   real devices and emulators. `BestForNavigation` requires an extremely strong
 *   GPS signal and produces zero updates indoors / in simulators.
 * - Reduced `distanceInterval` to 1 m so movement is captured immediately.
 *
 * ⚠️  Background location requires a native rebuild (expo run:android /
 *     expo run:ios). It will NOT work in Expo Go.
 */

import { useTrackingStore } from '@/store/trackingStore';
import type { Coordinate } from '@/types/activity';
import type { LocationObject } from 'expo-location';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef } from 'react';

// ─── Background task ──────────────────────────────────────────────────────────

export const BACKGROUND_LOCATION_TASK = 'pathfinder-background-location';

/**
 * Module-scope task definition — runs even when the app is backgrounded on
 * native builds. Reads the store imperatively to avoid stale closures.
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[PathFinder] Background location error:', error.message);
    return;
  }

  const { locations } = data as { locations: LocationObject[] };
  const { addCoordinate } = useTrackingStore.getState();

  for (const loc of locations) {
    addCoordinate({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      altitude: loc.coords.altitude,
      timestamp: loc.timestamp,
      accuracy: loc.coords.accuracy,
    });
  }
});

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * `High` accuracy works reliably across all real devices and emulators.
 * `BestForNavigation` requires extremely strong GPS signal — avoid it.
 */
const FOREGROUND_ACCURACY = Location.Accuracy.High;

/**
 * Deliver an update after every 1 metre of movement.
 * Low enough to capture walking routes precisely.
 */
const DISTANCE_INTERVAL_M = 1;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Subscribes to `watchPositionAsync` while `isTracking` is `true`.
 * Cleans up the subscription on stop or unmount.
 *
 * Key design decisions:
 * - `addCoordinate` is read via `getState()` inside the callback so it never
 *   needs to be in the `useEffect` dependency array.
 * - Background permission is requested in a separate try/catch block that
 *   CANNOT prevent the foreground watcher from starting.
 */
export function useTracking(): void {
  const isTracking = useTrackingStore((s) => s.isTracking);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    // ── Stop path ──────────────────────────────────────────────────────────────
    if (!isTracking) {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;

      // Best-effort: stop background task if it was running.
      Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
        .then((running) => {
          if (running) {
            Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => { });
          }
        })
        .catch(() => { });

      return;
    }

    // ── Start path ─────────────────────────────────────────────────────────────
    let cancelled = false;

    (async () => {
      // 1. Request background permission — isolated in its own try/catch so
      //    a denial or Expo Go incompatibility can NEVER block step 2.
      let bgGranted = false;
      try {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        bgGranted = status === Location.PermissionStatus.GRANTED;
      } catch {
        // Expo Go throws when background permissions API is unavailable — ignore.
        bgGranted = false;
      }

      if (cancelled) return;

      // 2. Start the foreground watcher.
      //    `addCoordinate` is read from the store imperatively here so it is
      //    never stale and never causes the effect to re-run.
      try {
        const sub = await Location.watchPositionAsync(
          {
            accuracy: FOREGROUND_ACCURACY,
            distanceInterval: DISTANCE_INTERVAL_M,
          },
          (location) => {
            const coord: Coordinate = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              altitude: location.coords.altitude,
              timestamp: location.timestamp,
              accuracy: location.coords.accuracy,
            };
            // Imperative read — no stale closure, no extra dependency.
            useTrackingStore.getState().addCoordinate(coord);
          },
        );

        if (cancelled) {
          sub.remove();
          return;
        }

        subscriptionRef.current = sub;
        console.log('[PathFinder] Foreground location watcher started.');
      } catch (err) {
        console.error('[PathFinder] Failed to start location watcher:', err);
        return;
      }

      // 3. Start background task (native builds only — silent no-op in Expo Go).
      if (bgGranted) {
        Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: FOREGROUND_ACCURACY,
          distanceInterval: DISTANCE_INTERVAL_M,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'PathFinder is tracking your route',
            notificationBody: 'Tracking is active in the background.',
            notificationColor: '#007AFF',
          },
        }).catch(() => {
          // TaskManager not available in Expo Go — swallow silently.
        });
      }
    })();

    // ── Cleanup ────────────────────────────────────────────────────────────────
    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [isTracking]); // ← addCoordinate intentionally omitted — read via getState()
}
