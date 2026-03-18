import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHistoryStore } from '@/store/historyStore';
import type { Coordinate } from '@/types/activity';

const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;
const MAPTILER_TILE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`
  : null;

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function formatDateFull(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const activities = useHistoryStore((s) => s.activities);
  const activity = activities.find((a) => a.id === id);

  const mapRef = useRef<MapView>(null);

  // Parse JSON coords safely
  const coordinates: Coordinate[] = useMemo(() => {
    if (!activity) return [];
    try {
      return JSON.parse(activity.coordinatesJson) as Coordinate[];
    } catch {
      return [];
    }
  }, [activity]);

  if (!activity) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
        <Text style={{ color: isDark ? '#FFF' : '#000' }}>Activity not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backButtonFallback}>
          <Text style={{ color: '#007AFF' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const startCoord = coordinates[0];
  const endCoord = coordinates[coordinates.length - 1];

  return (
    <View style={styles.container}>
      {/* ── Map ───────────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType="none"
        onMapReady={() => {
          if (coordinates.length > 0 && mapRef.current) {
            // Fit the map to exactly the bounding box of the polyline
            mapRef.current.fitToCoordinates(coordinates, {
              edgePadding: { top: 80, right: 40, bottom: 240, left: 40 },
              animated: false,
            });
          }
        }}
        showsCompass={false}
        showsScale={false}
        pitchEnabled={false}
      >
        {MAPTILER_TILE_URL && (
          <UrlTile urlTemplate={MAPTILER_TILE_URL} maximumZ={19} tileSize={512} zIndex={-1} />
        )}

        {coordinates.length > 1 && (
          <Polyline
            coordinates={coordinates}
            strokeColor="#007AFF"
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Start / End Markers */}
        {startCoord && (
          <Marker coordinate={startCoord} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.markerStart} />
          </Marker>
        )}
        {endCoord && coordinates.length > 1 && (
          <Marker coordinate={endCoord} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.markerEnd} />
          </Marker>
        )}
      </MapView>

      {/* ── Custom Header (Back Button) ───────────────────────────────────── */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.closeButton, { top: insets.top + 16 }]}
        accessibilityRole="button"
        accessibilityLabel="Close activity detail"
      >
        <Ionicons name="close" size={24} color="#1C1C1E" />
      </Pressable>

      {/* ── Stats Sheet (Bottom) ───────────────────────────────────────────── */}
      <View
        style={[
          styles.sheet,
          {
            paddingBottom: insets.bottom + 20,
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          },
        ]}
      >
        <Text style={[styles.sheetTitle, { color: isDark ? '#EBEBF5' : '#1C1C1E' }]}>
          {formatDateFull(activity.date)}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: isDark ? '#8E8E93' : '#6B7280' }]}>
              Distance
            </Text>
            <Text style={[styles.statValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              {(activity.totalDistance / 1000).toFixed(2)}{' '}
              <Text style={styles.statUnit}>km</Text>
            </Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: isDark ? '#38383A' : '#E5E7EB' }]} />

          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: isDark ? '#8E8E93' : '#6B7280' }]}>
              Duration
            </Text>
            <Text style={[styles.statValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              {formatDuration(activity.duration)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonFallback: {
    marginTop: 16,
    padding: 12,
  },
  closeButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 24,
    paddingHorizontal: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
  },
  statDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: 20,
  },

  // Markers
  markerStart: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759', // iOS Green
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  markerEnd: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF3B30', // iOS Red
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
