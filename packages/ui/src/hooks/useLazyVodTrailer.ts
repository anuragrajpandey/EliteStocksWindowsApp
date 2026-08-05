import { useState, useEffect, useRef } from 'react';
import type { StoredMovie, StoredSeries } from '../db';
import {
  getTmdb,
  searchMovies,
  searchTvShows,
  getMovieVideos,
  getTvShowVideos,
  findTrailerUrl,
} from '../services/tmdb';

export function useLazyVodTrailer(
  item: StoredMovie | StoredSeries | null,
  type: 'movie' | 'series',
  accessToken: string | null
): { trailerUrl: string | null; loading: boolean } {
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lastItemIdRef = useRef<string | number | null>(null);
  const fetchingRef = useRef(false);

  const itemId = item ? ('stream_id' in item ? item.stream_id : (item as StoredSeries).series_id) : null;

  if (itemId !== lastItemIdRef.current) {
    lastItemIdRef.current = itemId;
    setTrailerUrl(null);
  }

  useEffect(() => {
    if (!item || !accessToken || !accessToken.trim()) {
      setTrailerUrl(null);
      setLoading(false);
      return;
    }

    // 1. Check if stored item has youtube_trailer field
    const storedTrailer = (item as any).youtube_trailer;
    if (storedTrailer && typeof storedTrailer === 'string' && storedTrailer.trim()) {
      const cleanTrailer = storedTrailer.trim();
      if (cleanTrailer.startsWith('http://') || cleanTrailer.startsWith('https://')) {
        setTrailerUrl(cleanTrailer);
        return;
      } else {
        setTrailerUrl(`https://www.youtube.com/watch?v=${cleanTrailer}`);
        return;
      }
    }

    if (fetchingRef.current) return;

    let cancelled = false;

    const fetchTrailer = async () => {
      fetchingRef.current = true;
      setLoading(true);

      try {
        const isSeries = type === 'series';
        const title = item.title || item.name;
        const year = item.year || (item as any).release_date?.slice(0, 4);

        let tmdbId: number | null = item.tmdb_id ? Number(item.tmdb_id) : null;

        // Try finding by IMDb ID via TMDB find API if no tmdbId
        if (!tmdbId && item.imdb_id && item.imdb_id.startsWith('tt')) {
          try {
            const tmdb = getTmdb(accessToken);
            const findResult = await tmdb.find.byExternalId(item.imdb_id, { external_source: 'imdb_id' });
            if (isSeries) {
              tmdbId = findResult.tv_results?.[0]?.id || null;
            } else {
              tmdbId = findResult.movie_results?.[0]?.id || null;
            }
          } catch (err) {
            console.error('[TMDB] Find by IMDb ID failed in VOD trailer hook:', err);
          }
        }

        // Fallback to title & year search
        if (!tmdbId && title) {
          if (isSeries) {
            const results = await searchTvShows(accessToken, title, year ? parseInt(String(year)) : undefined);
            if (!cancelled && results.length > 0) {
              tmdbId = results[0].id;
            }
          } else {
            const results = await searchMovies(accessToken, title, year ? parseInt(String(year)) : undefined);
            if (!cancelled && results.length > 0) {
              tmdbId = results[0].id;
            }
          }
        }

        if (!tmdbId || cancelled) {
          fetchingRef.current = false;
          setLoading(false);
          return;
        }

        const videos = isSeries
          ? await getTvShowVideos(accessToken, tmdbId)
          : await getMovieVideos(accessToken, tmdbId);

        if (!cancelled) {
          const url = findTrailerUrl(videos);
          setTrailerUrl(url);
        }
      } catch (err) {
        console.error('[TMDB] Failed to fetch VOD trailer:', err);
      } finally {
        fetchingRef.current = false;
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrailer();

    return () => {
      cancelled = true;
      fetchingRef.current = false;
    };
  }, [itemId, item?.title, item?.name, item?.tmdb_id, item?.imdb_id, type, accessToken]);

  return { trailerUrl, loading };
}

export function useTrailerPlayerMode(): [import('../components/vod/SplitPlayButton').VodPlayerMode, (mode: import('../components/vod/SplitPlayButton').VodPlayerMode) => void] {
  const [mode, setModeState] = useState<import('../components/vod/SplitPlayButton').VodPlayerMode>('embedded');

  useEffect(() => {
    async function load() {
      if (!window.storage) return;
      try {
        const res = await window.storage.getSettings();
        if (res.data?.trailerPlayerMode) {
          setModeState(res.data.trailerPlayerMode as import('../components/vod/SplitPlayButton').VodPlayerMode);
        }
      } catch (e) {
        console.warn('[useTrailerPlayerMode] Failed to load trailerPlayerMode:', e);
      }
    }
    load();
  }, []);

  const setMode = (newMode: import('../components/vod/SplitPlayButton').VodPlayerMode) => {
    setModeState(newMode);
    if (window.storage) {
      window.storage.updateSettings({ trailerPlayerMode: newMode }).catch(console.error);
    }
  };

  return [mode, setMode];
}
