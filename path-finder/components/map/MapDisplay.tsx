import { useLocation } from '@/hooks/useLocation';
import { useTrackingStore } from '@/store/trackingStore';
import { Ionicons } from '@expo/vector-icons';
import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT, UrlTile, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;
const MAPTILER_URL = `https://api.maptiler.com/maps/base-v4/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`;

const DEFAULT_DELTA = 0.01;
const CENTER_ANIMATION_MS = 800;
const MARKER_TILE_SIZE = 256;
const MARKER_MAX_ZOOM = 19;

const POLYLINE_STYLE = {
  strokeColor: '#007AFF',
  strokeWidth: 4,
  lineCap: 'round' as const,
  lineJoin: 'round' as const,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

const formatDuration = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};

const formatDistance = (meters: number): string =>
  (meters / 1000).toFixed(2);

const makeRegion = (
  latitude: number,
  longitude: number,
  delta = DEFAULT_DELTA,
): Region => ({
  latitude,
  longitude,
  latitudeDelta: delta,
  longitudeDelta: delta,
});

// ─── Stats HUD ───────────────────────────────────────────────────────────────

interface StatsHUDProps {
  startTime: Date;
  distanceMeters: number;
}

const StatsHUD = memo(({ startTime, distanceMeters }: StatsHUDProps) => {
  const [elapsed, setElapsed] = useState(() => Date.now() - startTime.getTime());

  useEffect(() => {
    const id = setInterval(
      () => setElapsed(Date.now() - startTime.getTime()),
      1000,
    );
    return () => clearInterval(id);
  }, [startTime]);

  return (
    <View style={styles.hud} pointerEvents="none">
      <View style={styles.hudRow}>
        <Ionicons name="time-outline" size={14} color="#8E8E93" style={styles.hudIcon} />
        <Text style={styles.hudValue}>{formatDuration(elapsed)}</Text>
      </View>
      <View style={styles.hudDivider} />
      <View style={styles.hudRow}>
        <Ionicons name="footsteps-outline" size={14} color="#8E8E93" style={styles.hudIcon} />
        <Text style={styles.hudValue}>{formatDistance(distanceMeters)}</Text>
        <Text style={styles.hudUnit}> km</Text>
      </View>
    </View>
  );
});

StatsHUD.displayName = 'StatsHUD';

// ─── Sub-components ───────────────────────────────────────────────────────────

const LoadingView = memo(() => (
  <View style={styles.center}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={styles.loadingText}>Finding your location…</Text>
  </View>
));
LoadingView.displayName = 'LoadingView';

interface OverlayViewProps {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconBgStyle?: object;
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

const OverlayView = memo(({
  iconName,
  iconBgStyle,
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: OverlayViewProps) => (
  <View style={styles.overlay}>
    <View style={[styles.overlayIconWrap, iconBgStyle]}>
      <Ionicons name={iconName} size={36} color={iconBgStyle ? '#FF9500' : '#007AFF'} />
    </View>
    <Text style={styles.overlayTitle}>{title}</Text>
    <Text style={styles.overlayBody}>{body}</Text>
    <Pressable style={styles.primaryBtn} onPress={onPrimary}>
      <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
    </Pressable>
    {secondaryLabel && onSecondary && (
      <Pressable style={styles.secondaryBtn} onPress={onSecondary}>
        <Text style={styles.secondaryBtnText}>{secondaryLabel}</Text>
      </Pressable>
    )}
  </View>
));
OverlayView.displayName = 'OverlayView';


// ─── Main Component ───────────────────────────────────────────────────────────

export interface MapDisplayRef {
  centerOnMe: () => void;
}

export const MapDisplay = forwardRef<MapDisplayRef>((_, ref) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const { currentLocation, isPermissionGranted, isLoading, isLocationReady, error, openSettings, retry } =
    useLocation();

  const isTracking = useTrackingStore((s) => s.isTracking);
  const routeCoordinates = useTrackingStore((s) => s.routeCoordinates);
  const totalDistanceMeters = useTrackingStore((s) => s.totalDistanceMeters);
  const startTime = useTrackingStore((s) => s.startTime);

  const animateToLocation = useCallback((lat: number, lng: number) => {
    mapRef.current?.animateToRegion(makeRegion(lat, lng), CENTER_ANIMATION_MS);
  }, []);

  const handleCenterOnMe = useCallback(() => {
    if (currentLocation) {
      animateToLocation(currentLocation.latitude, currentLocation.longitude);
    }
  }, [currentLocation, animateToLocation]);

  useImperativeHandle(ref, () => ({ centerOnMe: handleCenterOnMe }), [handleCenterOnMe]);

  // Centre on first location fix
  useEffect(() => {
    if (currentLocation) {
      animateToLocation(currentLocation.latitude, currentLocation.longitude);
    }
    // Only run on first location fix — intentionally omitting animateToLocation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation]);

  const initialRegion = useMemo(
    () => (currentLocation ? makeRegion(currentLocation.latitude, currentLocation.longitude) : undefined),
    // Snapshot once on mount — region changes handled via animateToRegion
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const hudTop = useMemo(() => Math.max(insets.top + 16, 16), [insets.top]);

  const hasRoute = routeCoordinates.length > 1;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) return <LoadingView />;

  // ── Permission denied ────────────────────────────────────────────────────
  if (!isPermissionGranted) {
    return (
      <OverlayView
        iconName="location-outline"
        title="Location Access Required"
        body="PathFinder needs your location to display your position and record routes. Your data never leaves this device."
        primaryLabel="Open Settings"
        onPrimary={openSettings}
        secondaryLabel="Try Again"
        onSecondary={retry}
      />
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error && !isLocationReady) {
    return (
      <OverlayView
        iconName="warning-outline"
        iconBgStyle={styles.overlayIconWrapWarning}
        title="Location Unavailable"
        body={error}
        primaryLabel="Retry"
        onPrimary={retry}
      />
    );
  }

  // ── Map ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.fill}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        mapType="none"
        initialRegion={initialRegion}
        showsUserLocation={true}
        followsUserLocation={false}
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsTraffic={false}
        showsIndoors={false}
        showsCompass={false}
        showsScale={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <UrlTile
          urlTemplate={MAPTILER_URL}
          maximumZ={MARKER_MAX_ZOOM}
          tileSize={MARKER_TILE_SIZE}
          zIndex={-1}
        />

        {hasRoute && (
          <Polyline coordinates={routeCoordinates} {...POLYLINE_STYLE} />
        )}
      </MapView>

      {isTracking && startTime && (
        <View style={[styles.hudWrapper, { top: hudTop }]}>
          <StatsHUD startTime={startTime} distanceMeters={totalDistanceMeters} />
        </View>
      )}

    </View>
  );
});

MapDisplay.displayName = 'MapDisplay';

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fill: { flex: 1 },
  map: { flex: 1, backgroundColor: '#f2efe9' },

  // ── Loading
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#9CA3AF',
  },

  // ── Overlays
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 32,
  },
  overlayIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  overlayIconWrapWarning: { backgroundColor: '#FFFBEB' },
  overlayTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  overlayBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 28,
  },
  primaryBtn: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 9999,
    backgroundColor: '#007AFF',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 9999,
    backgroundColor: '#F3F4F6',
  },
  secondaryBtnText: { color: '#374151', fontSize: 16, fontWeight: '500' },

  // ── HUD
  hudWrapper: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  hud: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    minWidth: 110,
  },
  hudRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  hudIcon: { marginRight: 6 },
  hudValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    fontVariant: ['tabular-nums'],
  },
  hudUnit: { fontSize: 12, color: '#8E8E93', alignSelf: 'flex-end', marginBottom: 1 },
  hudDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginVertical: 6,
  },
});