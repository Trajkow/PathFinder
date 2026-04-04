import { create } from 'zustand';
import { getAllActivities, deleteActivity, loadDraft, clearDraft } from '@/services/db';
import type { TrackingDraft } from '@/services/db';
import { useTrackingStore } from '@/store/trackingStore';
import type { Activity } from '@/types/activity';

interface HistoryState {
  activities: Activity[];
  /** Persisted draft from a killed session. `null` when none exists. */
  draft: TrackingDraft | null;
  isLoading: boolean;
  error: string | null;
}

interface HistoryActions {
  /** Fetches all activities AND checks for a persisted draft. */
  fetchActivities: () => Promise<void>;
  removeActivity: (id: string) => Promise<void>;
  /** Hydrates the tracking store from the draft and clears it from disk. */
  resumeDraft: () => void;
  /** Discards the draft from disk without recovering it. */
  discardDraft: () => Promise<void>;
}

type HistoryStore = HistoryState & HistoryActions;

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  activities: [],
  draft: null,
  isLoading: true,
  error: null,

  fetchActivities: async () => {
    try {
      set({ isLoading: true, error: null });
      const [activities, draft] = await Promise.all([
        getAllActivities(),
        // Only load draft if no tracking session is currently active.
        useTrackingStore.getState().isTracking ? Promise.resolve(null) : loadDraft(),
      ]);
      set({ activities, draft, isLoading: false });
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

  resumeDraft: () => {
    const { draft } = get();
    if (!draft) return;

    useTrackingStore.getState().restoreFromDraft(draft);
    set({ draft: null });
    clearDraft().catch((err) =>
      console.error('[HistoryStore] Failed to clear draft after resume:', err),
    );
  },

  discardDraft: async () => {
    set({ draft: null });
    try {
      await clearDraft();
    } catch (err) {
      console.error('[HistoryStore] Failed to discard draft:', err);
    }
  },
}));
