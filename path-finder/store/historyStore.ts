import { create } from 'zustand';
import { getAllActivities, deleteActivity } from '@/services/db';
import type { Activity } from '@/types/activity';

interface HistoryState {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
}

interface HistoryActions {
  fetchActivities: () => Promise<void>;
  removeActivity: (id: string) => Promise<void>;
}

type HistoryStore = HistoryState & HistoryActions;

export const useHistoryStore = create<HistoryStore>((set) => ({
  activities: [],
  isLoading: true,
  error: null,

  fetchActivities: async () => {
    try {
      set({ isLoading: true, error: null });
      const activities = await getAllActivities();
      set({ activities, isLoading: false });
    } catch (error) {
      console.error('[HistoryStore] Failed to fetch activities:', error);
      set({ error: 'Failed to load history', isLoading: false });
    }
  },

  removeActivity: async (id: string) => {
    try {
      // Optimistic delete
      set((state) => ({
        activities: state.activities.filter((a) => a.id !== id),
      }));
      await deleteActivity(id);
    } catch (error) {
      console.error('[HistoryStore] Failed to delete activity:', error);
      // Re-fetch to restore state if delete fails
      const activities = await getAllActivities();
      set({ activities, error: 'Failed to delete activity' });
    }
  },
}));
