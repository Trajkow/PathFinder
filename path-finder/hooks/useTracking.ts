/**
 * useTracking — Real-time GPS tracking via expo-location.
 *
 * v3 – Heartbeat monitor:
 * - Detects mid-session permission revocation or GPS loss by monitoring
 *   a heartbeat timestamp updated on every watcher callback.
 * - If no GPS update arrives within HEARTBEAT_TIMEOUT_MS, the session
 *   is auto-paused via `pauseTracking(reason)` — route data is preserved.
 * - Resuming (isPaused → false) restarts the watcher automatically.
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
import { Alert } from 'react-native';

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

/** If no GPS update arrives within this window, trigger an auto-pause. */
const HEARTBEAT_TIMEOUT_MS = 8_000;

/** How often the heartbeat interval fires to check for watcher silence. */
const HEARTBEAT_CHECK_INTERVAL_MS = 3_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determines a user-friendly reason for the pause by checking permission
 * and Location Services status.
 */
async function determinePauseReason(): Promise<string> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      return 'Location permission was revoked. Open Settings to re-enable it.';
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return 'Location services were disabled. Please re-enable GPS.';
    }
  } catch {
    // Defensive — never let a diagnostic call crash tracking.
  }

  return 'GPS signal lost. Move to an area with better reception or check your settings.';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Subscribes to `watchPositionAsync` while `isTracking && !isPaused`.
 * Monitors a heartbeat timestamp — if the watcher goes silent for
 * HEARTBEAT_TIMEOUT_MS, the session is auto-paused with a descriptive reason.
 *
 * Resuming (`isPaused` flips to `false`) restarts the watcher automatically.
 *
 * Key design decisions:
 * - `addCoordinate` / `pauseTracking` are read via `getState()` inside callbacks
 *   so they never appear in effect dependency arrays.
 * - Background permission is requested in a separate try/catch block that
 *   CANNOT prevent the foreground watcher from starting.
 */
export function useTracking(): void {
  const isTracking = useTrackingStore((s) => s.isTracking);
  const isPaused = useTrackingStore((s) => s.isPaused);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  // ── Heartbeat monitor ───────────────────────────────────────────────────────
  // Runs while isTracking && !isPaused. Checks every HEARTBEAT_CHECK_INTERVAL_MS
  // whether the watcher has gone silent (no GPS update for HEARTBEAT_TIMEOUT_MS).
  // On iOS (app stays alive after permission revocation), shows a native Alert
  // so the user can re-request permission or stop tracking.
  useEffect(() => {
    if (!isTracking || isPaused) return;

    const id = setInterval(async () => {
      const silenceMs = Date.now() - lastUpdateRef.current;
      const { isTracking: stillTracking, isPaused: alreadyPaused } =
        useTrackingStore.getState();

      if (stillTracking && !alreadyPaused && silenceMs > HEARTBEAT_TIMEOUT_MS) {
        console.warn(
          `[PathFinder] Heartbeat timeout — no GPS update for ${silenceMs}ms. Auto-pausing.`,
        );
        const reason = await determinePauseReason();
        // Re-check: the state may have changed while we awaited.
        const current = useTrackingStore.getState();
        if (current.isTracking && !current.isPaused) {
          current.pauseTracking(reason);

          // Show a native alert so the user can act (especially on iOS).
          Alert.alert(
            'Tracking Paused',
            reason,
            [
              {
                text: 'Stop Tracking',
                style: 'destructive',
                onPress: () => {
                  useTrackingStore.getState().stopTracking();
                },
              },
              {
                text: 'Allow Location',
                style: 'default',
                onPress: async () => {
                  const { status } =
                    await Location.requestForegroundPermissionsAsync();
                  if (status === Location.PermissionStatus.GRANTED) {
                    useTrackingStore.getState().resumeTracking();
                  }
                },
              },
            ],
            { cancelable: false },
          );
        }
      }
    }, HEARTBEAT_CHECK_INTERVAL_MS);

    return () => clearInterval(id);
  }, [isTracking, isPaused]);

  // ── Watcher lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    // ── Stop / pause path ─────────────────────────────────────────────────────
    if (!isTracking || isPaused) {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;

      // When fully stopped (not just paused), clean up the background task.
      if (!isTracking) {
        Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
          .then((running) => {
            if (running) {
              Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => { });
            }
          })
          .catch(() => { });
      }

      return;
    }

    // ── Start / resume path ───────────────────────────────────────────────────
    let cancelled = false;

    // Reset heartbeat timestamp so a stale value doesn't immediately re-pause.
    lastUpdateRef.current = Date.now();

    (async () => {
      // 1. Passive check for background permission — never opens Settings.
      //    Background tracking only activates if already granted.
      let bgGranted = false;
      try {
        const { status } = await Location.getBackgroundPermissionsAsync();
        bgGranted = status === Location.PermissionStatus.GRANTED;
      } catch {
        bgGranted = false;
      }

      if (cancelled) return;

      // 2. Start the foreground watcher.
      try {
        const sub = await Location.watchPositionAsync(
          {
            accuracy: FOREGROUND_ACCURACY,
            distanceInterval: DISTANCE_INTERVAL_M,
          },
          (location) => {
            // Update heartbeat timestamp on every successful fix.
            lastUpdateRef.current = Date.now();

            const coord: Coordinate = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              altitude: location.coords.altitude,
              timestamp: location.timestamp,
              accuracy: location.coords.accuracy,
            };
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

      // 3. Start background task (native builds only).
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
        }).catch(() => { });
      }
    })();

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [isTracking, isPaused]);
}
