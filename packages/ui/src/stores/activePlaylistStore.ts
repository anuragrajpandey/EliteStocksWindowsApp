import { create } from 'zustand';
import type { PlaylistItem } from './vodPlaylistStore';

/**
 * Returns true when a playing VOD item is the active playlist's current item.
 * Playlists are compared by their stored identifiers so a stale playlist
 * session can't be mistaken for active playback of unrelated content.
 */
export function isActivePlaylistItem(
  info: import('../types/media').VodPlayInfo | null | undefined,
  item: PlaylistItem | undefined
): boolean {
  if (!info || !item) return false;
  if (item.itemType === 'movie') {
    return !!info.mediaId && info.mediaId === item.mediaId;
  }
  // Episode: match by episode id, or by series/season/episode numbers
  return (
    (!!info.episodeId && info.episodeId === item.mediaId) ||
    (!!info.seriesId &&
      info.seriesId === item.seriesId &&
      info.seasonNum === item.seasonNum &&
      info.episodeNum === item.episodeNum)
  );
}

interface ActivePlaylistState {
  activePlaylistId: string | null;
  activePlaylistName: string | null;
  items: PlaylistItem[];
  currentIndex: number;
  isShuffle: boolean;
  
  startPlayback: (playlistId: string, playlistName: string, items: PlaylistItem[], startIndex?: number, shuffle?: boolean) => PlaylistItem | null;
  getNextItem: () => PlaylistItem | null;
  getPreviousItem: () => PlaylistItem | null;
  advanceToNext: () => PlaylistItem | null;
  /**
   * Remove the finished item from the live queue, mirroring the playlist's
   * remove-after-watching. When `autoplayNext` is true the item that slides
   * into the slot becomes current and is returned; otherwise the current
   * position is cleared. Returns null when the queue is emptied or has no
   * next item.
   */
  removeCurrentAndAdvance: (autoplayNext: boolean) => PlaylistItem | null;
  /** Move to the previous queue item and return it (null at start of queue). */
  previousItem: () => PlaylistItem | null;
  /** Remove the item at a queue index, keeping currentIndex pointed at the playing item. */
  removeItem: (index: number) => void;
  /** Move an item between queue indices, keeping currentIndex pointed at the playing item. */
  moveItem: (fromIndex: number, toIndex: number) => void;
  stopPlayback: () => void;
  setCurrentIndex: (index: number) => void;
}

export const useActivePlaylistStore = create<ActivePlaylistState>()((set, get) => ({
  activePlaylistId: null,
  activePlaylistName: null,
  items: [],
  currentIndex: -1,
  isShuffle: false,

  startPlayback: (playlistId, playlistName, items, startIndex = 0, shuffle = false) => {
    if (!items || items.length === 0) {
      set({ activePlaylistId: null, activePlaylistName: null, items: [], currentIndex: -1, isShuffle: false });
      return null;
    }

    let playQueue = [...items];
    let initialIndex = startIndex;

    if (shuffle) {
      // Shuffle items, keeping specified start item at 0 if startIndex provided
      const startItem = items[startIndex];
      const remaining = items.filter((_, idx) => idx !== startIndex);
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      playQueue = startItem ? [startItem, ...remaining] : remaining;
      initialIndex = 0;
    }

    set({
      activePlaylistId: playlistId,
      activePlaylistName: playlistName,
      items: playQueue,
      currentIndex: initialIndex,
      isShuffle: shuffle,
    });

    return playQueue[initialIndex] || null;
  },

  getNextItem: () => {
    const { items, currentIndex } = get();
    if (!items.length || currentIndex < 0 || currentIndex >= items.length - 1) {
      return null;
    }
    return items[currentIndex + 1];
  },

  getPreviousItem: () => {
    const { items, currentIndex } = get();
    if (!items.length || currentIndex <= 0) {
      return null;
    }
    return items[currentIndex - 1];
  },

  advanceToNext: () => {
    const { items, currentIndex } = get();
    if (!items.length || currentIndex >= items.length - 1) {
      return null;
    }
    const nextIdx = currentIndex + 1;
    set({ currentIndex: nextIdx });
    return items[nextIdx];
  },

  removeCurrentAndAdvance: (autoplayNext) => {
    const { items, currentIndex } = get();
    if (currentIndex < 0 || currentIndex >= items.length) return null;

    const newItems = items.filter((_, i) => i !== currentIndex);
    if (newItems.length === 0) {
      set({ items: [], activePlaylistId: null, activePlaylistName: null, currentIndex: -1, isShuffle: false });
      return null;
    }

    if (autoplayNext) {
      // The next item slides into the removed item's slot.
      const nextItem = newItems[currentIndex] ?? null;
      set({ items: newItems, currentIndex: nextItem ? currentIndex : -1 });
      return nextItem;
    }

    // No autoplay: nothing is playing anymore; drop the finished item and
    // clear the current position (remaining items stay for later selection).
    set({ items: newItems, currentIndex: -1 });
    return null;
  },

  previousItem: () => {
    const { items, currentIndex } = get();
    if (!items.length || currentIndex <= 0) {
      return null;
    }
    const prevIdx = currentIndex - 1;
    set({ currentIndex: prevIdx });
    return items[prevIdx];
  },

  moveItem: (fromIndex, toIndex) => {
    const { items, currentIndex } = get();
    if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) {
      return;
    }
    // Track the playing item by id so currentIndex follows it when rows move.
    const playingId = currentIndex >= 0 && currentIndex < items.length ? items[currentIndex].id : null;
    const newItems = [...items];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    set({
      items: newItems,
      currentIndex: playingId ? newItems.findIndex((i) => i.id === playingId) : currentIndex,
    });
  },

  removeItem: (index) => {
    const { items, currentIndex } = get();
    if (index < 0 || index >= items.length) return;
    set((state) => {
      const newItems = state.items.filter((_, i) => i !== index);
      // Queue emptied: drop the whole session so nothing lingers.
      if (newItems.length === 0) {
        return {
          ...state,
          items: [],
          activePlaylistId: null,
          activePlaylistName: null,
          currentIndex: -1,
          isShuffle: false,
        };
      }
      // Keep the currently playing item at the same position in the queue.
      let newIndex = state.currentIndex;
      if (index < state.currentIndex) {
        newIndex = state.currentIndex - 1;
      } else if (index === state.currentIndex) {
        // Removing the playing item itself: drop the whole session so it
        // can't linger and hijack future playback.
        return {
          ...state,
          items: newItems,
          activePlaylistId: null,
          activePlaylistName: null,
          currentIndex: -1,
          isShuffle: false,
        };
      }
      return { ...state, items: newItems, currentIndex: newIndex };
    });
  },

  stopPlayback: () => {
    set({
      activePlaylistId: null,
      activePlaylistName: null,
      items: [],
      currentIndex: -1,
      isShuffle: false,
    });
  },

  setCurrentIndex: (index) => {
    set({ currentIndex: index });
  },
}));
