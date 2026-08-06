/**
 * Sports Favorites Store - Zustand store with localStorage persistence
 *
 * Stores favorite teams for the Sports Hub.
 * Persists across sessions using localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SportsTeam } from '@ynotv/core';

export interface FavoriteTeam extends SportsTeam {
  addedAt: number;
  isPinned?: boolean;
}

interface SportsFavoritesState {
  favorites: FavoriteTeam[];
  addFavorite: (team: SportsTeam) => void;
  removeFavorite: (teamId: string) => void;
  isFavorite: (teamId: string) => boolean;
  clearFavorites: () => void;
  reorderFavorites: (newFavorites: FavoriteTeam[]) => void;
  moveFavorite: (teamId: string, direction: 'up' | 'down') => void;
  togglePinFavorite: (teamId: string) => void;
}

export const useSportsFavoritesStore = create<SportsFavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      
      addFavorite: (team) => set((state) => {
        if (state.favorites.some(f => f.id === team.id)) {
          return state;
        }
        return {
          favorites: [...state.favorites, { ...team, addedAt: Date.now() }]
        };
      }),
      
      removeFavorite: (teamId) => set((state) => ({
        favorites: state.favorites.filter(f => f.id !== teamId)
      })),
      
      isFavorite: (teamId) => get().favorites.some(f => f.id === teamId),
      
      clearFavorites: () => set({ favorites: [] }),

      reorderFavorites: (newFavorites) => set({ favorites: newFavorites }),

      moveFavorite: (teamId, direction) => set((state) => {
        const index = state.favorites.findIndex(f => f.id === teamId);
        if (index === -1) return state;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= state.favorites.length) return state;

        const updated = [...state.favorites];
        const [moved] = updated.splice(index, 1);
        updated.splice(targetIndex, 0, moved);
        return { favorites: updated };
      }),

      togglePinFavorite: (teamId) => set((state) => ({
        favorites: state.favorites.map(f =>
          f.id === teamId ? { ...f, isPinned: !f.isPinned } : f
        )
      })),
    }),
    {
      name: 'sports-favorites',
    }
  )
);

export const useFavoriteTeams = () => useSportsFavoritesStore((s) => s.favorites);
export const useAddFavorite = () => useSportsFavoritesStore((s) => s.addFavorite);
export const useRemoveFavorite = () => useSportsFavoritesStore((s) => s.removeFavorite);
export const useIsFavorite = (teamId: string) => useSportsFavoritesStore((s) => s.isFavorite(teamId));
export const useMoveFavorite = () => useSportsFavoritesStore((s) => s.moveFavorite);
export const useTogglePinFavorite = () => useSportsFavoritesStore((s) => s.togglePinFavorite);
export const useReorderFavorites = () => useSportsFavoritesStore((s) => s.reorderFavorites);
