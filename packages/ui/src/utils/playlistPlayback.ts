import { recordVodWatch, recordEpisodeWatch, getEpisodeProgress } from '../db';
import type { Playlist, PlaylistItem } from '../stores/vodPlaylistStore';
import type { PlaylistItemProgress } from '../hooks/usePlaylistProgress';
import type { VodPlayInfo } from '../types/media';

/**
 * Build the canonical VodPlayInfo for a playlist item, mirroring what
 * SeriesDetail/MovieDetail pass to playback so that resume and progress
 * tracking work exactly like normal VOD playback.
 *
 * For episodes the mediaId uses the `seriesId_ep_episodeId` shape the
 * playback progress-save and resume paths key on.
 */
export function playlistItemToVodInfo(item: PlaylistItem): VodPlayInfo {
  const isEpisode = item.itemType === 'episode';
  return {
    url: item.directUrl || '',
    title: item.title,
    type: isEpisode ? 'series' : 'movie',
    source_id: item.sourceId,
    mediaId: isEpisode && item.seriesId ? `${item.seriesId}_ep_${item.mediaId}` : item.mediaId,
    seriesId: item.seriesId,
    seasonNum: item.seasonNum,
    episodeNum: item.episodeNum,
    episodeId: isEpisode ? item.mediaId : undefined,
    episodeInfo: isEpisode
      ? `S${item.seasonNum ?? 0} E${item.episodeNum ?? 0}${item.episodeTitle ? ` · ${item.episodeTitle}` : ''}`
      : undefined,
    backdropUrl: item.backdropUrl || undefined,
    posterUrl: item.poster || undefined,
  };
}

/**
 * Find the most recently watched item of a playlist. Items with no watch
 * history (watchedAt 0) are ignored; returns null when nothing was watched.
 */
export function findLastWatchedItem(
  items: PlaylistItem[],
  progressMap: ReadonlyMap<string, PlaylistItemProgress>
): PlaylistItem | null {
  let best: PlaylistItem | null = null;
  let bestAt = 0;
  for (const item of items) {
    const p = progressMap.get(item.id);
    const at = p?.watchedAt ?? 0;
    if (at > bestAt) {
      best = item;
      bestAt = at;
    }
  }
  return best;
}

/**
 * Sort playlists so the most recently watched one comes first (by the latest
 * watched_at among each playlist's items). Never-played playlists sink below
 * the watched ones, keeping their original relative order (stable sort).
 */
export function sortPlaylistsByLastPlayed(
  playlists: Playlist[],
  progressMap: ReadonlyMap<string, PlaylistItemProgress>
): Playlist[] {
  const lastPlayedAt = (pl: Playlist): number => {
    let max = 0;
    for (const item of pl.items) {
      const at = progressMap.get(item.id)?.watchedAt ?? 0;
      if (at > max) max = at;
    }
    return max;
  };
  return [...playlists].sort((a, b) => lastPlayedAt(b) - lastPlayedAt(a));
}

/**
 * Record a playlist item into vod_history (the Recent rail) and episode
 * progress, mirroring the recording done by SeriesDetail/MovieDetail when a
 * video starts. Existing episode resume position is preserved so replaying an
 * item never wipes its progress.
 */
export async function recordPlaylistItemWatch(item: PlaylistItem): Promise<void> {
  if (item.itemType === 'movie') {
    await recordVodWatch(item.mediaId, 'movie', item.sourceId || '', item.title, item.poster || undefined);
    return;
  }
  if (!item.seriesId) return;

  // Preserve any existing episode progress instead of resetting it.
  let resumePosition = 0;
  let duration = 0;
  try {
    const progress = await getEpisodeProgress(item.mediaId);
    if (progress && (progress.progress_seconds ?? 0) > 10 && (progress.total_duration ?? 0) > 0) {
      resumePosition = progress.progress_seconds ?? 0;
      duration = progress.total_duration ?? 0;
    }
  } catch (err) {
    console.warn('[Playlist] Failed to read existing episode progress:', err);
  }

  await recordVodWatch(
    item.seriesId,
    'series',
    item.sourceId || '',
    item.seriesTitle || item.title,
    item.poster || undefined,
    item.seasonNum,
    item.episodeNum,
    item.episodeTitle || `Episode ${item.episodeNum ?? 0}`
  );
  await recordEpisodeWatch(
    item.mediaId,
    item.seriesId,
    item.sourceId || '',
    item.seasonNum ?? 0,
    item.episodeNum ?? 0,
    item.episodeTitle || '',
    resumePosition,
    duration
  );
}
