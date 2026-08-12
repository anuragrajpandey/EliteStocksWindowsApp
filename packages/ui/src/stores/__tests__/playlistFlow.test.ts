import { describe, it, expect, beforeEach } from 'vitest';
import { useVodPlaylistStore, type PlaylistItem } from '../vodPlaylistStore';
import { useActivePlaylistStore, isActivePlaylistItem } from '../activePlaylistStore';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

let nextItemId = 1;

function makeEpisode(seriesId: string, season: number, episode: number, title?: string): Omit<PlaylistItem, 'id' | 'playlistId' | 'addedAt'> {
  const id = `ep_${nextItemId++}`;
  return {
    itemType: 'episode',
    mediaId: id,
    seriesId,
    seasonNum: season,
    episodeNum: episode,
    title: title ?? `${seriesId} S${season}E${episode}`,
    directUrl: `https://example.com/${id}.m3u8`,
    sourceId: 'src_1',
  };
}

function makeMovie(title: string): Omit<PlaylistItem, 'id' | 'playlistId' | 'addedAt'> {
  return {
    itemType: 'movie',
    mediaId: `mv_${nextItemId++}`,
    title,
    directUrl: `https://example.com/movie_${nextItemId}.m3u8`,
    sourceId: 'src_1',
  };
}

/** Minimal VodPlayInfo-shaped object that `isActivePlaylistItem` can match. */
function vodInfoFor(item: PlaylistItem): import('../../types/media').VodPlayInfo {
  return item.itemType === 'movie'
    ? { url: item.directUrl ?? '', title: item.title, type: 'movie', mediaId: item.mediaId }
    : {
        url: item.directUrl ?? '',
        title: item.title,
        type: 'series',
        mediaId: item.mediaId,
        episodeId: item.mediaId,
        seriesId: item.seriesId,
        seasonNum: item.seasonNum,
        episodeNum: item.episodeNum,
      };
}

/**
 * Mirrors App.tsx's end-of-video handler: when the finished video is the
 * playlist's current item, remove after watching + autoplay next as the
 * playlist toggles dictate; otherwise treat the session as stale.
 */
function simulateItemFinished(vodInfo: import('../../types/media').VodPlayInfo): PlaylistItem | null {
  const active = useActivePlaylistStore.getState();
  if (!active.activePlaylistId || active.currentIndex < 0 || active.items.length === 0) return null;

  const currentItem = active.items[active.currentIndex];
  if (currentItem && isActivePlaylistItem(vodInfo, currentItem)) {
    const plStore = useVodPlaylistStore.getState();
    const playlist = plStore.playlists.find((p) => p.id === active.activePlaylistId);
    const shouldAutoplay = playlist?.autoplayNext ?? true;

    if (playlist?.removeAfterWatching) {
      plStore.removeItemFromPlaylist(active.activePlaylistId!, currentItem.id);
      return active.removeCurrentAndAdvance(shouldAutoplay);
    }
    if (shouldAutoplay) {
      return active.advanceToNext();
    }
    return null;
  }

  useActivePlaylistStore.getState().stopPlayback();
  return null;
}

/** Overlay-derived state — exactly what PlaylistQueueModal / NowPlayingBar read. */
function overlayState() {
  const { activePlaylistId, items, currentIndex } = useActivePlaylistStore.getState();
  return {
    activePlaylistId,
    items,
    currentIndex,
    playingXofY: currentIndex >= 0 && currentIndex < items.length ? `${currentIndex + 1}/${items.length}` : null,
    nextUp: currentIndex >= 0 && currentIndex < items.length - 1 ? items[currentIndex + 1].title : null,
  };
}

function createThreeEpisodePlaylist() {
  const plStore = useVodPlaylistStore.getState();
  const playlist = plStore.createPlaylist('Test List');
  plStore.addItemsToPlaylist(playlist.id, [
    makeEpisode('series1', 1, 1),
    makeEpisode('series1', 1, 2),
    makeEpisode('series1', 1, 3),
  ]);
  return useVodPlaylistStore.getState().playlists.find((p) => p.id === playlist.id)!;
}

function startQueue(playlist: ReturnType<typeof createThreeEpisodePlaylist>, startIndex = 0, shuffle = false) {
  return useActivePlaylistStore.getState().startPlayback(playlist.id, playlist.name, playlist.items, startIndex, shuffle);
}

beforeEach(() => {
  useActivePlaylistStore.setState({
    activePlaylistId: null,
    activePlaylistName: null,
    items: [],
    currentIndex: -1,
    isShuffle: false,
  });
  useVodPlaylistStore.setState({ playlists: [] });
});

// ---------------------------------------------------------------------------
// The user's scenario: remove-after-watching + autoplay
// ---------------------------------------------------------------------------

describe('playlist flow: remove after watching + autoplay next', () => {
  it('removes the finished item from BOTH the playlist and the live queue, and autoplays the next', () => {
    const playlist = createThreeEpisodePlaylist();
    useVodPlaylistStore.getState().toggleRemoveAfterWatching(playlist.id); // on

    const first = startQueue(playlist, 0);
    expect(first?.title).toBe('series1 S1E1');
    expect(overlayState()).toMatchObject({ playingXofY: '1/3', nextUp: 'series1 S1E2' });

    // --- Episode 1 finishes → removed from playlist + queue, Ep2 autoplays ---
    let next = simulateItemFinished(vodInfoFor(first!));
    expect(next?.title).toBe('series1 S1E2');

    let state = overlayState();
    expect(state.items.map((i) => i.title)).toEqual(['series1 S1E2', 'series1 S1E3']);
    expect(state.playingXofY).toBe('1/2');
    expect(state.nextUp).toBe('series1 S1E3');

    const persisted = useVodPlaylistStore.getState().playlists[0];
    expect(persisted.items.map((i) => i.title)).toEqual(['series1 S1E2', 'series1 S1E3']);
    // The now-playing item is still the queue's current item (overlay indicator match).
    expect(isActivePlaylistItem(vodInfoFor(state.items[state.currentIndex]), state.items[state.currentIndex])).toBe(true);

    // --- Episode 2 finishes → Ep3 autoplays ---
    next = simulateItemFinished(vodInfoFor(state.items[state.currentIndex]));
    expect(next?.title).toBe('series1 S1E3');
    state = overlayState();
    expect(state.items.map((i) => i.title)).toEqual(['series1 S1E3']);
    expect(state.playingXofY).toBe('1/1');
    expect(useVodPlaylistStore.getState().playlists[0].items.map((i) => i.title)).toEqual(['series1 S1E3']);

    // --- Episode 3 finishes → queue empties, session clears ---
    next = simulateItemFinished(vodInfoFor(state.items[state.currentIndex]));
    expect(next).toBeNull();
    expect(overlayState()).toMatchObject({ activePlaylistId: null, items: [], playingXofY: null });
    expect(useVodPlaylistStore.getState().playlists[0].items).toEqual([]);
  });

  it('keeps the finished item in the queue when remove-after-watching is off', () => {
    const playlist = createThreeEpisodePlaylist(); // removeAfterWatching off by default
    const first = startQueue(playlist, 0);

    const next = simulateItemFinished(vodInfoFor(first!));
    expect(next?.title).toBe('series1 S1E2');
    const state = overlayState();
    // Nothing removed: the finished item stays in both the queue and playlist.
    expect(state.items.map((i) => i.title)).toEqual(['series1 S1E1', 'series1 S1E2', 'series1 S1E3']);
    expect(useVodPlaylistStore.getState().playlists[0].items.map((i) => i.title)).toEqual([
      'series1 S1E1',
      'series1 S1E2',
      'series1 S1E3',
    ]);
    expect(state.playingXofY).toBe('2/3');
  });

  it('removes the finished item from the queue but does not autoplay when autoplay-next is off', () => {
    const playlist = createThreeEpisodePlaylist();
    useVodPlaylistStore.getState().toggleRemoveAfterWatching(playlist.id); // on
    useVodPlaylistStore.getState().toggleAutoplayNext(playlist.id); // off

    const first = startQueue(playlist, 0);
    const next = simulateItemFinished(vodInfoFor(first!));
    expect(next).toBeNull();

    const state = overlayState();
    // Removed from both stores, but nothing is current (playback ended).
    expect(state.items.map((i) => i.title)).toEqual(['series1 S1E2', 'series1 S1E3']);
    expect(state.playingXofY).toBeNull();
    expect(useVodPlaylistStore.getState().playlists[0].items.map((i) => i.title)).toEqual([
      'series1 S1E2',
      'series1 S1E3',
    ]);
  });

  it('treats a session as stale when the finished video is not the queue current item', () => {
    const playlist = createThreeEpisodePlaylist();
    startQueue(playlist, 0);

    // A completely unrelated video finishes — the session must not hijack it.
    const next = simulateItemFinished({ url: 'https://example.com/other.m3u8', title: 'Other', type: 'movie', mediaId: 'unrelated_123' });
    expect(next).toBeNull();
    expect(useActivePlaylistStore.getState().activePlaylistId).toBeNull();
    expect(useActivePlaylistStore.getState().items).toEqual([]);
  });

  it('does not loop past the end of the queue', () => {
    const plStore = useVodPlaylistStore.getState();
    const playlist = plStore.createPlaylist('Solo');
    plStore.addItemsToPlaylist(playlist.id, [makeEpisode('solo', 1, 1)]);
    plStore.toggleRemoveAfterWatching(playlist.id); // on
    const soloPlaylist = useVodPlaylistStore.getState().playlists.find((p) => p.id === playlist.id)!;

    const first = startQueue(soloPlaylist, 0);
    const next = simulateItemFinished(vodInfoFor(first!));
    expect(next).toBeNull();
    // No wrap-around: the last item's removal empties the session.
    expect(useActivePlaylistStore.getState().activePlaylistId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Reordering / removal keep the playing item aligned
// ---------------------------------------------------------------------------

describe('playlist queue: reorder and remove keep the playing item aligned', () => {
  it('moveItem keeps currentIndex pointed at the playing item', () => {
    const playlist = createThreeEpisodePlaylist();
    const playing = startQueue(playlist, 0); // playing S1E1

    useActivePlaylistStore.getState().moveItem(2, 0); // move S1E3 to front
    const state = overlayState();
    expect(state.items.map((i) => i.title)).toEqual(['series1 S1E3', 'series1 S1E1', 'series1 S1E2']);
    // Playing item still S1E1, now at index 1.
    expect(state.items[state.currentIndex].title).toBe('series1 S1E1');
    expect(state.playingXofY).toBe('2/3');
    expect(isActivePlaylistItem(vodInfoFor(playing!), state.items[state.currentIndex])).toBe(true);
  });

  it('removeItem shifts currentIndex down when removing an item before the playing item', () => {
    const playlist = createThreeEpisodePlaylist();
    const playing = startQueue(playlist, 1); // playing S1E2

    useActivePlaylistStore.getState().removeItem(0); // remove S1E1
    const state = overlayState();
    expect(state.items.map((i) => i.title)).toEqual(['series1 S1E2', 'series1 S1E3']);
    expect(state.items[state.currentIndex].title).toBe('series1 S1E2');
    expect(state.playingXofY).toBe('1/2');
    expect(isActivePlaylistItem(vodInfoFor(playing!), state.items[state.currentIndex])).toBe(true);
  });

  it('previousItem/advanceToNext navigation returns the right items', () => {
    const playlist = createThreeEpisodePlaylist();
    startQueue(playlist, 1); // current = S1E2

    expect(useActivePlaylistStore.getState().previousItem()?.title).toBe('series1 S1E1');
    expect(useActivePlaylistStore.getState().currentIndex).toBe(0);
    expect(useActivePlaylistStore.getState().advanceToNext()?.title).toBe('series1 S1E2');
  });

  it('startPlayback with shuffle keeps the requested start item first', () => {
    const playlist = createThreeEpisodePlaylist();
    const first = startQueue(playlist, 2, true); // shuffle, start at S1E3

    const state = overlayState();
    expect(state.items[0].title).toBe('series1 S1E3');
    expect(state.playingXofY).toBe('1/3');
    expect(new Set(state.items.map((i) => i.title)).size).toBe(3);
    expect(useActivePlaylistStore.getState().isShuffle).toBe(true);
    expect(first?.title).toBe('series1 S1E3');
  });

  it('startPlayback with an empty list does not create a session', () => {
    const playlist = createThreeEpisodePlaylist();
    const empty: PlaylistItem[] = [];
    const result = useActivePlaylistStore.getState().startPlayback(playlist.id, playlist.name, empty, 0, false);
    expect(result).toBeNull();
    expect(useActivePlaylistStore.getState().activePlaylistId).toBeNull();
  });
});
