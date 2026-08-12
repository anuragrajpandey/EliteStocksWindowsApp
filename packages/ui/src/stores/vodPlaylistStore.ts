import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PlaylistItem {
  id: string;
  playlistId: string;
  itemType: 'movie' | 'episode';
  mediaId: string;
  seriesId?: string;
  seriesTitle?: string;
  seasonNum?: number;
  episodeNum?: number;
  episodeTitle?: string;
  title: string;
  poster?: string | null;
  backdropUrl?: string | null;
  directUrl?: string;
  sourceId?: string;
  sourceName?: string;
  duration?: number;
  addedAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  items: PlaylistItem[];
  removeAfterWatching?: boolean;
  autoplayNext?: boolean;
  showSourceName?: boolean;
}

interface VodPlaylistState {
  playlists: Playlist[];
  createPlaylist: (name: string) => Playlist;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  addItemToPlaylist: (playlistId: string, item: Omit<PlaylistItem, 'id' | 'playlistId' | 'addedAt'>) => void;
  addItemsToPlaylist: (playlistId: string, items: Array<Omit<PlaylistItem, 'id' | 'playlistId' | 'addedAt'>>) => void;
  removeItemFromPlaylist: (playlistId: string, itemId: string) => void;
  reorderPlaylistItems: (playlistId: string, fromIndex: number, toIndex: number) => void;
  randomizePlaylistItems: (playlistId: string) => void;
  toggleRemoveAfterWatching: (playlistId: string) => void;
  toggleAutoplayNext: (playlistId: string) => void;
  toggleShowSourceName: (playlistId: string) => void;
}

export const useVodPlaylistStore = create<VodPlaylistState>()(
  persist(
    (set, get) => ({
      playlists: [],

      createPlaylist: (name) => {
        const trimmed = name.trim() || 'My Playlist';
        const newPlaylist: Playlist = {
          id: `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: trimmed,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          items: [],
          removeAfterWatching: false,
          autoplayNext: true,
          showSourceName: true,
        };
        set((state) => ({
          playlists: [newPlaylist, ...state.playlists],
        }));
        return newPlaylist;
      },

      deletePlaylist: (id) => set((state) => ({
        playlists: state.playlists.filter((p) => p.id !== id),
      })),

      renamePlaylist: (id, name) => set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === id ? { ...p, name: name.trim() || p.name, updatedAt: Date.now() } : p
        ),
      })),

      addItemToPlaylist: (playlistId, item) => set((state) => {
        return {
          playlists: state.playlists.map((p) => {
            if (p.id !== playlistId) return p;
            const newItem: PlaylistItem = {
              ...item,
              id: `${playlistId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              playlistId,
              addedAt: Date.now(),
            };
            return {
              ...p,
              items: [...p.items, newItem],
              updatedAt: Date.now(),
            };
          }),
        };
      }),

      addItemsToPlaylist: (playlistId, itemsToAdd) => set((state) => {
        return {
          playlists: state.playlists.map((p) => {
            if (p.id !== playlistId) return p;
            const newItems: PlaylistItem[] = itemsToAdd.map((item, idx) => ({
              ...item,
              id: `${playlistId}_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
              playlistId,
              addedAt: Date.now() + idx,
            }));
            return {
              ...p,
              items: [...p.items, ...newItems],
              updatedAt: Date.now(),
            };
          }),
        };
      }),

      removeItemFromPlaylist: (playlistId, itemId) => set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId
            ? { ...p, items: p.items.filter((item) => item.id !== itemId), updatedAt: Date.now() }
            : p
        ),
      })),

      reorderPlaylistItems: (playlistId, fromIndex, toIndex) => set((state) => ({
        playlists: state.playlists.map((p) => {
          if (p.id !== playlistId) return p;
          if (fromIndex < 0 || fromIndex >= p.items.length || toIndex < 0 || toIndex >= p.items.length) {
            return p;
          }
          const updatedItems = [...p.items];
          const [moved] = updatedItems.splice(fromIndex, 1);
          updatedItems.splice(toIndex, 0, moved);
          return {
            ...p,
            items: updatedItems,
            updatedAt: Date.now(),
          };
        }),
      })),

      randomizePlaylistItems: (playlistId) => set((state) => ({
        playlists: state.playlists.map((p) => {
          if (p.id !== playlistId) return p;
          const shuffled = [...p.items];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return {
            ...p,
            items: shuffled,
            updatedAt: Date.now(),
          };
        }),
      })),

      toggleRemoveAfterWatching: (playlistId) => set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId
            ? { ...p, removeAfterWatching: !p.removeAfterWatching, updatedAt: Date.now() }
            : p
        ),
      })),

      toggleAutoplayNext: (playlistId) => set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId
            ? { ...p, autoplayNext: !(p.autoplayNext ?? true), updatedAt: Date.now() }
            : p
        ),
      })),

      toggleShowSourceName: (playlistId) => set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId
            ? { ...p, showSourceName: !(p.showSourceName ?? true), updatedAt: Date.now() }
            : p
        ),
      })),
    }),
    {
      name: 'vod-playlists-store',
    }
  )
);
