import { useEffect, useState } from 'react';
import { getBulkEpisodeProgress, getBulkMovieProgress } from '../db';
import { dbEvents } from '../db/sqlite-adapter';
import type { PlaylistItem } from '../stores/vodPlaylistStore';

export interface PlaylistItemProgress {
  /** Saved playback position in seconds. */
  progressSeconds: number;
  totalDuration: number;
  /** True when the item reached the completion threshold (episodes use the stored flag). */
  completed: boolean;
  /** 0-100 playback percent (0 when unknown). */
  percent: number;
  /** Epoch ms of the last watch of this item (0 when never watched). */
  watchedAt: number;
}

/**
 * Load playback progress for a set of playlist items with two batched SQL
 * queries (episode_history + vod_history for movies) instead of one query per
 * item. Keyed by playlist item id.
 */
export function usePlaylistItemsProgress(items: PlaylistItem[]): Map<string, PlaylistItemProgress> {
  const [map, setMap] = useState<Map<string, PlaylistItemProgress>>(new Map());

  useEffect(() => {
    if (items.length === 0) {
      setMap(new Map());
      return;
    }
    let cancelled = false;

    const load = async () => {
      const episodeIds: string[] = [];
      const movieIds: string[] = [];
      for (const item of items) {
        if (item.itemType === 'episode') {
          episodeIds.push(item.mediaId);
        } else {
          movieIds.push(item.mediaId);
        }
      }

      const [episodes, movies] = await Promise.all([
        getBulkEpisodeProgress(episodeIds),
        getBulkMovieProgress(movieIds),
      ]);
      if (cancelled) return;

      const next = new Map<string, PlaylistItemProgress>();
      for (const item of items) {
        if (item.itemType === 'episode') {
          const p = episodes[item.mediaId];
          if (!p) continue;
          const dur = p.total_duration;
          const prog = p.progress_seconds;
          const completed = p.completed || (dur > 0 && prog / dur >= 0.9);
          next.set(item.id, {
            progressSeconds: prog,
            totalDuration: dur,
            completed,
            percent: dur > 0 ? Math.min(100, (prog / dur) * 100) : 0,
            watchedAt: p.watched_at || 0,
          });
        } else {
          const p = movies[item.mediaId];
          if (!p) continue;
          const dur = p.total_duration;
          const prog = p.progress_seconds;
          next.set(item.id, {
            progressSeconds: prog,
            totalDuration: dur,
            completed: dur > 0 && prog / dur >= 0.9,
            percent: dur > 0 ? Math.min(100, (prog / dur) * 100) : 0,
            watchedAt: p.watched_at || 0,
          });
        }
      }
      setMap(next);
    };

    // Refetch when watch progress changes (e.g. during/after playback) so the
    // resume hints, watched counts, and last-played ordering stay live.
    const unsubEpisodes = dbEvents.subscribe('episode_history', () => void load());
    const unsubMovies = dbEvents.subscribe('vod_history', () => void load());
    void load();

    return () => {
      cancelled = true;
      unsubEpisodes();
      unsubMovies();
    };
  }, [items]);

  return map;
}
