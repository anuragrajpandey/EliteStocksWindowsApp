import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * A frozen snapshot of a playlist item's playback progress, persisted in
 * localStorage. The DB history this mirrors (vod_history / episode_history)
 * is wiped by "Clear All Cached Data", so these snapshots keep playlist
 * resume hints and "last watched" info intact across a cache clear and in
 * import/export backups.
 */
export interface PlaylistItemProgressSnapshot {
  /** Saved playback position in seconds. */
  progressSeconds: number;
  /** Total duration in seconds (0 when unknown). */
  totalDuration: number;
  /** True when the item reached the completion threshold. */
  completed: boolean;
  /** Epoch ms of the last watch of this item. */
  watchedAt: number;
}

interface VodPlaylistProgressState {
  /** Snapshot per playlist item id. */
  byItemId: Record<string, PlaylistItemProgressSnapshot>;
  /** Write (or overwrite) the snapshot for one playlist item. */
  setProgress: (itemId: string, snapshot: PlaylistItemProgressSnapshot) => void;
  /** Drop all snapshots (used by tests). */
  clearProgress: () => void;
}

export const useVodPlaylistProgressStore = create<VodPlaylistProgressState>()(
  persist(
    (set) => ({
      byItemId: {},
      setProgress: (itemId, snapshot) =>
        set((state) => ({
          byItemId: { ...state.byItemId, [itemId]: snapshot },
        })),
      clearProgress: () => set({ byItemId: {} }),
    }),
    {
      name: 'vod-playlists-progress',
    }
  )
);
