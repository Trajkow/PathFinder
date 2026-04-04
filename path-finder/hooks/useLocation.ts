import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface UseLocationReturn {
  /** Current device location (set once on mount). `null` until resolved. */
  currentLocation: Coordinate | null;
  /** `true` once a location has been successfully fetched. */
  isLocationReady: boolean;
  /** `true` if foreground location permission has been granted. */
  isPermissionGranted: boolean;
  /** `true` while the initial permission request or location fetch is in progress. */
  isLoading: boolean;
  /** Human-readable error message, if any. `null` when healthy. */
  error: string | null;
  /** Opens the device's app-level settings so the user can grant permission manually. */
  openSettings: () => Promise<void>;
  /** Re-attempts permission request + location fetch (e.g. after returning from settings). */
  retry: () => Promise<void>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Timeout (ms) for the one-shot location request. */
const LOCATION_TIMEOUT_MS = 15_000;

/** Accuracy level for the initial map-centering request. */
const LOCATION_ACCURACY = Location.Accuracy.Low;

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Manages foreground location permission and provides a one-shot device
 * coordinate for initial map centering.
 *
 * Handles:
 * - Permission request on mount (foreground only).
 * - `denied` / `restricted` permission states with a settings deeplink.
 * - GPS/Location Services disabled on the device.
 * - Timeout if the device cannot resolve a fix in time.
 *
 * @example
 * ```tsx
 * const { currentLocation, isPermissionGranted, openSettings } = useLocation();
 *
 * if (!isPermissionGranted) {
 *   return <PermissionDeniedCard onOpenSettings={openSettings} />;
 * }
 * ```
 */
export function useLocation(): UseLocationReturn {
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guard against state updates after unmount.
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Core flow: request permission → check location services → fetch position.
   * Extracted so it can be called from both the mount effect and `retry`.
   */
  const initLocation = useCallback(async (): Promise<void> => {
    if (!isMounted.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // ── 1. Request foreground permission ──────────────────────────────
      // Always request — this shows the native OS dialog when undetermined,
      // and returns 'denied' instantly on Android if 'Don't ask again' was set.
      // Race against a timeout so a stuck dialog never hangs the loading screen.
      const permissionRace = await Promise.race([
        Location.requestForegroundPermissionsAsync(),
        new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), LOCATION_TIMEOUT_MS),
        ),
      ]);

      if (!isMounted.current) return;

      const permStatus = permissionRace?.status ?? Location.PermissionStatus.DENIED;

      if (permStatus !== Location.PermissionStatus.GRANTED) {
        setIsPermissionGranted(false);
        setError(
          permStatus === Location.PermissionStatus.DENIED
            ? 'Location permission was denied. Open Settings to enable it.'
            : 'Location access is restricted on this device.',
        );
        setIsLoading(false);
        return;
      }

      setIsPermissionGranted(true);

      // ── 2. Verify location services are enabled ───────────────────────
      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!isMounted.current) return;

      if (!servicesEnabled) {
        setError(
          'Location services are disabled. Please enable GPS in your device settings.'
        );
        setIsLoading(false);
        return;
      }

      // ── 3. Fetch position ────────────────────────────────────────────
      // Try the cached last-known position first (instant, no GPS warm-up).
      // Fall back to getCurrentPositionAsync with a timeout race so we
      // never hang on a cold GPS start.
      let position: Location.LocationObject | null = null;

      try {
        position = await Location.getLastKnownPositionAsync();
      } catch {
        // getLastKnownPositionAsync can throw on some Android OEMs — ignore.
      }

      if (!position) {
        // No cache — do a live fix, but race against a timeout.
        const livePosition = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: LOCATION_ACCURACY }),
          new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), LOCATION_TIMEOUT_MS),
          ),
        ]);
        position = livePosition;
      }

      if (!isMounted.current) return;

      if (!position) {
        setError(
          'Unable to determine your location. Make sure GPS is enabled and try again.',
        );
        setIsLoading(false);
        return;
      }

      setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (err) {
      if (!isMounted.current) return;

      // Distinguish between timeout and other failures.
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';

      if (message.toLowerCase().includes('timeout')) {
        setError('Unable to determine your location. Make sure GPS is enabled and you have a clear sky view.');
      } else if (message.toLowerCase().includes('location')) {
        setError('Could not retrieve your location. Please check that location services are enabled.');
      } else {
        setError('Something went wrong while fetching your location. Please try again.');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Run on mount.
  useEffect(() => {
    initLocation();
  }, [initLocation]);

  /**
   * Opens the OS-level app settings screen where the user can manually
   * toggle location permission.
   *
   * - iOS: Opens the PathFinder entry in Settings.
   * - Android: Opens the app's Application Info screen.
   */
  const openSettings = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  }, []);

  /**
   * Re-attempts the full permission → location flow.
   * Useful after the user returns from device settings.
   */
  const retry = useCallback(async (): Promise<void> => {
    await initLocation();
  }, [initLocation]);

  return {
    currentLocation,
    isLocationReady: currentLocation !== null,
    isPermissionGranted,
    isLoading,
    error,
    openSettings,
    retry,
  };
}
