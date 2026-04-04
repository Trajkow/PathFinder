import { MapDisplay, type MapDisplayRef } from '@/components/map/MapDisplay';
import { useTracking } from '@/hooks/useTracking';
import { useTrackingDraft } from '@/hooks/useTrackingDraft';
import { saveActivity } from '@/services/db';
import { useTrackingStore } from '@/store/trackingStore';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);

export default function MapScreen() {
  // Activate real-time tracker + draft persistence
  useTracking();
  useTrackingDraft();

  const insets = useSafeAreaInsets();

  const mapDisplayRef = useRef<MapDisplayRef>(null);

  // State
  const isTracking = useTrackingStore((s) => s.isTracking);
  const startTracking = useTrackingStore((s) => s.startTracking);
  const stopTracking = useTrackingStore((s) => s.stopTracking);
  const resetTracking = useTrackingStore((s) => s.resetTracking);
  const routeCoordinates = useTrackingStore((s) => s.routeCoordinates);
  const totalDistanceMeters = useTrackingStore((s) => s.totalDistanceMeters);
  const startTime = useTrackingStore((s) => s.startTime);

  // Handlers
  const handleStopAndSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const sessionStart = startTime ?? new Date();
    const durationMs = Date.now() - sessionStart.getTime();
    const coords = routeCoordinates;
    const distance = totalDistanceMeters;

    stopTracking();

    if (coords.length < 2) {
      Alert.alert(
        'No route recorded',
        'Move a bit before saving — only a single GPS point was captured.',
        [{ text: 'OK', onPress: resetTracking }]
      );
      return;
    }

    try {
      await saveActivity({
        date: sessionStart.toISOString(),
        duration: durationMs,
        totalDistanceMeters: distance,
        coordinatesJson: JSON.stringify(coords),
      });
      const km = (distance / 1000).toFixed(2);
      Alert.alert('Route saved ✓', `${km} km saved to your History.`, [
        { text: 'Great!', onPress: resetTracking },
      ]);
    } catch (err) {
      console.error('[PathFinder] Failed to save activity:', err);
      Alert.alert('Save failed', 'Something went wrong while saving your route.', [{ text: 'OK' }]);
    }
  };

  const handleToggleTracking = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isTracking) {
      handleStopAndSave();
    } else {
      startTracking();
    }
  };

  const handleCenterOnMe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mapDisplayRef.current?.centerOnMe();
  };

  // ─── Animations ─────────────────────────────────────────────────────────────

  const progress = useDerivedValue(() => {
    return withTiming(isTracking ? 1 : 0, { duration: 300 });
  });

  const animatedTintStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(0, 122, 255, 0.85)', 'rgba(255, 59, 48, 0.85)'] // iOS Blue to Red
    );
    return { backgroundColor };
  });

  const animatedWidthStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(isTracking ? 180 : 220, { damping: 20, stiffness: 200 }),
    };
  });

  const animatedStartContentStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 1 - progress.value * 0.2 }],
    position: 'absolute',
  }));

  const animatedStopContentStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.8 + progress.value * 0.2 }],
    position: 'absolute',
  }));

  return (
    <View className="flex-1 bg-neutral-100 dark:bg-black">
      {/* 1. Full-screen map layer (Forced Light Mode in MapDisplay) */}
      <View className="flex-1">
        <MapDisplay ref={mapDisplayRef} />
      </View>

      {/* 2. Floating Controls Cluster (Bottom, symmetrical above nav bar) */}
      <View
        className="absolute w-full px-6 flex-row items-center justify-between z-50 pointer-events-box-none"
        style={{ bottom: insets.bottom + 110 }} // Float above the 64px tab bar + padding
      >
        {/* Left: Center Map / Locate Me */}
        <Pressable
          onPress={handleCenterOnMe}
          className="w-14 h-14 rounded-full overflow-hidden active:scale-95 transition-transform shadow-lg shadow-black/20"
          accessibilityLabel="Center map on my location"
        >
          <BlurView
            intensity={60}
            tint="dark"
            className="flex-1 items-center justify-center bg-black/20"
          >
            <Ionicons name="locate" size={24} color="#FFFFFF" />
          </BlurView>
        </Pressable>

        {/* Center: Start Tracking Pill */}
        <View className="flex-1 items-center pointer-events-box-none">
          <AnimatedPressable
            onPress={handleToggleTracking}
            style={[animatedWidthStyle]}
            className="h-16 rounded-full overflow-hidden active:scale-95 transition-transform shadow-lg shadow-black/20"
          >
            {/* Glass background structure */}
            <BlurView intensity={40} tint="dark" className="absolute inset-0" />
            <AnimatedView style={[StyleSheet.absoluteFill, animatedTintStyle]} />

            <View className="flex-1 items-center justify-center flex-row">
              {/* Start Tracking Label */}
              <AnimatedView style={animatedStartContentStyle} className="flex-row items-center justify-center">
                <Ionicons name="navigate" size={20} color="#FFFFFF" className="mr-2" />
                <Text className="text-white text-[17px] font-semibold tracking-wide ml-2">
                  Start Tracking
                </Text>
              </AnimatedView>

              {/* Stop & Save Label */}
              <AnimatedView style={animatedStopContentStyle} className="flex-row items-center justify-center">
                <Ionicons name="stop-circle" size={20} color="#FFFFFF" className="mr-2" />
                <Text className="text-white text-[17px] font-semibold tracking-wide ml-2">
                  Stop & Save
                </Text>
              </AnimatedView>
            </View>
          </AnimatedPressable>
        </View>

        <View className="w-14 h-14 pointer-events-none" />
      </View>
    </View>
  );
}
