/**
 * useTrackingDraft — Periodic draft persistence & startup recovery.
 *
 * Two responsibilities:
 * 1. **Periodic flush** — while `isTracking` is `true`, snapshots the current
 *    session to SQLite every FLUSH_INTERVAL_MS. Also flushes immediately when
 *    tracking starts. This ensures the route data survives an Android process
 *    kill (e.g. permission revocation from Settings).
 *
 * 2. **Startup recovery** — on mount, checks for a persisted draft. If one
 *    exists, shows an `Alert.alert` asking the user to recover or discard.
 *    "Recover" hydrates the store in paused mode; "Discard" clears the draft.
 *
 * The draft is automatically cleared when the user explicitly stops tracking
 * (i.e. `isTracking` goes from `true` → `false`).
 */

import { clearDraft, saveDraft } from '@/services/db';
import { useTrackingStore } from '@/store/trackingStore';
import { useEffect, useRef } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * How often the in-progress session is flushed to SQLite (ms).
 * Kept short (5 s) so an Android process kill from a permission change
 * almost always has a recent draft to recover from.
 */
const FLUSH_INTERVAL_MS = 5_000;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTrackingDraft(): void {
  const isTracking = useTrackingStore((s) => s.isTracking);
  const prevIsTracking = useRef(isTracking);

  // Draft recovery is handled by the History screen — see historyStore.
  // This hook only handles flush + clear lifecycle.

  // ── 2. Clear draft when session ends normally ─────────────────────────────
  useEffect(() => {
    // Detect isTracking: true → false (user pressed "Stop & Save").
    if (prevIsTracking.current && !isTracking) {
      clearDraft().catch((err) =>
        console.error('[PathFinder] Failed to clear draft on stop:', err),
      );
    }
    prevIsTracking.current = isTracking;
  }, [isTracking]);

  // ── 3. Immediate + periodic flush while tracking ──────────────────────────
  useEffect(() => {
    if (!isTracking) return;

    // Flush immediately so even a 0-second session has a recoverable draft.
    const flushNow = (): void => {
      const snapshot = useTrackingStore.getState().getDraftSnapshot();
      if (!snapshot) return;
      saveDraft(snapshot).catch((err) =>
        console.error('[PathFinder] Failed to flush draft:', err),
      );
    };

    flushNow();

    // Then flush every FLUSH_INTERVAL_MS — no minimum coordinate guard.
    const id = setInterval(flushNow, FLUSH_INTERVAL_MS);

    return () => clearInterval(id);
  }, [isTracking]);
}
