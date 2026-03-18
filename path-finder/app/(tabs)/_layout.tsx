import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Ionicons } from '@expo/vector-icons';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const ACCENT = '#007AFF';
const INACTIVE_LIGHT = '#8E8E93';

// ─── Tab bar background ────────────────────────────────────────────────────────
/**
 * On iOS we use a translucent BlurView so the map renders through the bar.
 * On Android / Web we fall back to a semi-opaque dark surface.
 */
function TabBarBackground() {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        tint="dark"
        intensity={90}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return null; // Android uses tabBarStyle backgroundColor directly
}

// ─── Layout ────────────────────────────────────────────────────────────────────
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: INACTIVE_LIGHT,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => <TabBarBackground />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'map' : 'map-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBar: {
    marginRight: 10,
    marginLeft: 10,
    position: 'absolute',
    bottom: 24, // Float above bottom edge
    left: 40,
    right: 40,
    height: 64,
    borderRadius: 32, // Pill shape
    borderTopWidth: 0,
    paddingBottom: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(28,28,30,0.96)',
    // Fix overflow so border radius clips the BlurView
    overflow: 'hidden',
    borderColor: 'rgba(255,255,255,0.15)',
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
});
