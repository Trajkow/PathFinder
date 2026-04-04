import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { Alert, FlatList, Pressable, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHistoryStore } from '@/store/historyStore';
import { useFocusEffect, router } from 'expo-router';
import type { Activity } from '@/types/activity';
import { IconSymbol } from '@/components/ui/icon-symbol';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <View className="flex-1 items-center justify-center px-10 pb-20">
      <View
        className="mb-5 h-20 w-20 items-center justify-center rounded-full"
        style={{ backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }}
      >
        <Ionicons
          name="trail-sign-outline"
          size={36}
          color={isDark ? '#636366' : '#8E8E93'}
        />
      </View>
      <Text
        className="mb-2 text-center text-[20px] font-semibold tracking-tight"
        style={{ color: isDark ? '#EBEBF5' : '#1C1C1E' }}
      >
        No Activities Yet
      </Text>
      <Text
        className="text-center text-[15px] leading-[22px]"
        style={{ color: isDark ? '#636366' : '#8E8E93' }}
      >
        Start tracking a route from the Map tab and it will appear here.
      </Text>
    </View>
  );
}

// ─── Draft card ───────────────────────────────────────────────────────────────

function DraftCard({
  isDark,
  distanceKm,
  points,
  onResume,
  onDiscard,
}: {
  isDark: boolean;
  distanceKm: string;
  points: number;
  onResume: () => void;
  onDiscard: () => void;
}) {
  return (
    <View
      className="mx-4 mb-3 overflow-hidden rounded-2xl"
      style={{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }}
    >
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center mb-2">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
            <Ionicons name="warning" size={20} color="#FF9500" />
          </View>
          <View className="flex-1">
            <Text
              className="text-[17px] font-semibold"
              style={{ color: isDark ? '#EBEBF5' : '#1C1C1E' }}
            >
              Unfinished Route
            </Text>
            <Text
              className="text-[14px]"
              style={{ color: isDark ? '#636366' : '#8E8E93' }}
            >
              {distanceKm} km · {points} points
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row gap-3 mt-2">
          <Pressable
            onPress={onDiscard}
            className="flex-1 items-center py-2.5 rounded-xl"
            style={{ backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}
          >
            <Text
              className="text-[15px] font-semibold"
              style={{ color: isDark ? '#EBEBF5' : '#374151' }}
            >
              Discard
            </Text>
          </Pressable>
          <Pressable
            onPress={onResume}
            className="flex-1 items-center py-2.5 rounded-xl"
            style={{ backgroundColor: '#007AFF' }}
          >
            <Text className="text-[15px] font-semibold text-white">
              Resume
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { activities, draft, fetchActivities, removeActivity, resumeDraft, discardDraft } =
    useHistoryStore();

  useFocusEffect(
    useCallback(() => {
      fetchActivities();
    }, [fetchActivities])
  );

  const handleLongPress = (activity: Activity) => {
    Alert.alert(
      'Delete Route',
      'Are you sure you want to permanently delete this route?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeActivity(activity.id),
        },
      ]
    );
  };

  const handlePress = (activity: Activity) => {
    router.push(`/activity/${activity.id}`);
  };

  const handleResumeDraft = () => {
    resumeDraft();
    // Navigate to the Map tab so the user sees the restored route.
    router.replace('/(tabs)');
  };

  const handleDiscardDraft = () => {
    Alert.alert(
      'Discard Route',
      'Are you sure? This unfinished route will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => discardDraft(),
        },
      ],
    );
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: isDark ? '#000000' : '#F2F2F7' }}
      edges={['top']}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View className="px-5 pt-2 pb-4">
        <Text
          className="text-[34px] font-bold tracking-[0.4px]"
          style={{ color: isDark ? '#FFFFFF' : '#1C1C1E' }}
        >
          History
        </Text>
      </View>

      {/* ── List / Empty State ───────────────────────────────────────────── */}
      <View className="flex-1">
        {activities.length === 0 && !draft ? (
          <EmptyState isDark={isDark} />
        ) : (
          <FlatList<Activity>
            data={activities}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: 0,
              paddingTop: 8,
              paddingBottom: 120, // Clear floating tab bar
            }}
            ListHeaderComponent={
              draft ? (
                <DraftCard
                  isDark={isDark}
                  distanceKm={(draft.totalDistanceMeters / 1000).toFixed(2)}
                  points={draft.routeCoordinates.length}
                  onResume={handleResumeDraft}
                  onDiscard={handleDiscardDraft}
                />
              ) : null
            }
            renderItem={({ item, index }: { item: Activity; index: number }) => {
              const isFirst = index === 0;
              const isLast = index === activities.length - 1;

              return (
                <View
                  className={`overflow-hidden ${
                    isFirst ? 'rounded-t-2xl' : ''
                  } ${isLast ? 'rounded-b-2xl' : ''}`}
                  style={{
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                    marginHorizontal: 16,
                  }}
                >
                  <Pressable
                    style={({ pressed }) => [
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                    className="flex-row items-center p-4 pl-4 pr-5"
                    onPress={() => handlePress(item)}
                    onLongPress={() => handleLongPress(item)}
                  >
                    {/* Left Icon Wrap */}
                    <View className="mr-3.5 h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                      <IconSymbol name="map.fill" size={20} color="#007AFF" />
                    </View>

                    {/* Center Content */}
                    <View className="flex-1 justify-center">
                      <Text
                        className="text-[17px] font-semibold"
                        style={{ color: isDark ? '#EBEBF5' : '#1C1C1E' }}
                      >
                        {formatDate(item.date)}
                      </Text>
                      
                      {/* Subtitle Row */}
                      <View className="mt-0.5 flex-row items-center">
                        <Text className="text-[15px] font-medium text-gray-500 dark:text-gray-400">
                          {(item.totalDistance / 1000).toFixed(2)} km
                        </Text>
                        <Text className="mx-1.5 text-[15px] font-medium text-gray-400 dark:text-gray-500">
                          ·
                        </Text>
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={isDark ? '#636366' : '#8E8E93'}
                        />
                        <Text
                          className="ml-1 text-[15px] font-medium tabular-nums"
                          style={{ color: isDark ? '#636366' : '#8E8E93' }}
                        >
                          {formatDuration(item.duration)}
                        </Text>
                      </View>
                    </View>

                    {/* Right Chevron */}
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={isDark ? '#3A3A3C' : '#C7C7CC'}
                    />
                  </Pressable>

                  {/* Built-in Hairline Separator */}
                  {!isLast && (
                    <View
                      className="ml-[68px]"
                      style={{
                        height: StyleSheet.hairlineWidth,
                        backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
                      }}
                    />
                  )}
                </View>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
