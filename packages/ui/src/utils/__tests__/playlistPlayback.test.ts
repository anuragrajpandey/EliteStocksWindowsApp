import { describe, it, expect, vi, beforeEach } from 'vitest';

// The module transitively imports the Tauri DB layer, which doesn't load in
// the node test environment — stub it out.
vi.mock('../../db', () => ({
  recordVodWatch: vi.fn(),
  recordEpisodeWatch: vi.fn(),
  getEpisodeProgress: vi.fn(),
}));

import { findLastWatchedItem, sortPlaylistsByLastPlayed } from '../playlistPlayback';
import type { Playlist, PlaylistItem } from '../../stores/vodPlaylistStore';
import type { PlaylistItemProgress } from '../../hooks/usePlaylistProgress';

let nextId = 1;

function makeItem(title: string): PlaylistItem {
  const id = `item_${nextId++}`;
  return {
    id,
    playlistId: 'playlist_1',
    addedAt: Date.now() + nextId,
    itemType: 'episode',
    mediaId: id,
    seriesId: 'series1',
    seasonNum: 1,
    episodeNum: nextId,
    title,
    directUrl: `https://example.com/${id}.m3u8`,
    sourceId: 'src_1',
  };
}

function progress(watchedAt: number, progressSeconds = 0, completed = false): PlaylistItemProgress {
  return { progressSeconds, totalDuration: 600, completed, percent: 0, watchedAt };
}

function makePlaylist(name: string, items: PlaylistItem[]): Playlist {
  return {
    id: `pl_${name}`,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    items,
  };
}

describe('sortPlaylistsByLastPlayed', () => {
  let map: Map<string, PlaylistItemProgress>;
  let neverPlayed: Playlist;
  let oldPlayed: Playlist;
  let recentlyPlayed: Playlist;

  beforeEach(() => {
    map = new Map();
    neverPlayed = makePlaylist('Never', [makeItem('N1'), makeItem('N2')]);
    oldPlayed = makePlaylist('Old', [makeItem('O1')]);
    recentlyPlayed = makePlaylist('Recent', [makeItem('R1'), makeItem('R2')]);
    map.set(oldPlayed.items[0].id, progress(1000));
    map.set(recentlyPlayed.items[0].id, progress(9000));
    map.set(recentlyPlayed.items[1].id, progress(5000));
  });

  it('puts the most recently played playlist first', () => {
    const sorted = sortPlaylistsByLastPlayed([neverPlayed, oldPlayed, recentlyPlayed], map);
    expect(sorted.map((p) => p.name)).toEqual(['Recent', 'Old', 'Never']);
  });

  it('uses the latest watch across a playlist items (not the first)', () => {
    // Old has a later item than Recent's single most recent item
    map.set(oldPlayed.items[0].id, progress(20000));
    const sorted = sortPlaylistsByLastPlayed([recentlyPlayed, oldPlayed], map);
    expect(sorted.map((p) => p.name)).toEqual(['Old', 'Recent']);
  });

  it('keeps never-played playlists in their original relative order at the bottom', () => {
    const sorted = sortPlaylistsByLastPlayed([recentlyPlayed, neverPlayed], map);
    expect(sorted.map((p) => p.name)).toEqual(['Recent', 'Never']);
  });

  it('does not mutate the input array', () => {
    const input = [neverPlayed, oldPlayed];
    const before = [...input];
    sortPlaylistsByLastPlayed(input, map);
    expect(input).toEqual(before);
  });
});

describe('findLastWatchedItem', () => {
  let items: PlaylistItem[];
  let map: Map<string, PlaylistItemProgress>;

  beforeEach(() => {
    items = [makeItem('Ep A'), makeItem('Ep B'), makeItem('Ep C')];
    map = new Map();
  });

  it('returns the item with the most recent watchedAt', () => {
    map.set(items[0].id, progress(1000));
    map.set(items[1].id, progress(5000));
    map.set(items[2].id, progress(3000));

    expect(findLastWatchedItem(items, map)?.title).toBe('Ep B');
  });

  it('ignores items with no watch history', () => {
    map.set(items[0].id, progress(1000));
    // items[1] and items[2] have no entry at all

    expect(findLastWatchedItem(items, map)?.title).toBe('Ep A');
  });

  it('returns null when nothing was ever watched', () => {
    expect(findLastWatchedItem(items, map)).toBeNull();
    map.set(items[0].id, progress(0)); // watched_at 0 counts as never watched
    expect(findLastWatchedItem(items, map)).toBeNull();
  });

  it('returns null for an empty playlist', () => {
    expect(findLastWatchedItem([], map)).toBeNull();
  });

  it('prefers a recently watched item even if it has zero progress', () => {
    // Ep C was just started (progress 0) but is the most recent watch
    map.set(items[0].id, progress(1000, 400));
    map.set(items[2].id, progress(9000, 0));

    expect(findLastWatchedItem(items, map)?.title).toBe('Ep C');
  });
});
