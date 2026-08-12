import type { StoredMovie, StoredSeries } from '../../db';
import { activeLocale } from '../../utils/dateTime';
import { resolveVodYear } from './vodYear';

/**
 * Shared VOD sort utilities used by both the Favorites view and the main
 * All Movies / All Series / category browse views.
 *
 * 'default' = recently added to favorites (uses addedAtMap)
 * 'added'   = recently added to the source (uses the synced `added` column)
 */
export type VodSortKey = 'default' | 'added' | 'name' | 'year' | 'rating' | 'lastWatched';
export type SortDirection = 'asc' | 'desc';

// Default direction per sort key (matches what users would expect at first click)
export const DEFAULT_SORT_DIRECTION: Record<VodSortKey, SortDirection> = {
  default: 'desc',      // Newest favorites first
  added: 'desc',        // Newest added to source first
  name: 'asc',          // A-Z
  year: 'desc',         // Newest first
  rating: 'desc',       // Highest first
  lastWatched: 'desc',  // Most recently watched first
};

export function getVodItemId(item: StoredMovie | StoredSeries, type: 'movie' | 'series'): string {
  return type === 'movie'
    ? (item as StoredMovie).stream_id
    : (item as StoredSeries).series_id;
}

export interface VodSortMaps {
  /** favorite id -> when it was added to favorites (for 'default') */
  addedAtMap?: Map<string, number>;
  /** media id -> last watched timestamp (for 'lastWatched') */
  lastWatchedMap?: Map<string, number>;
}

export function getVodSortValue(
  item: StoredMovie | StoredSeries,
  type: 'movie' | 'series',
  sortKey: VodSortKey,
  maps: VodSortMaps = {}
): number | string {
  const id = getVodItemId(item, type);
  switch (sortKey) {
    case 'default':
      return maps.addedAtMap?.get(id) ?? 0;
    case 'added': {
      const added = (item as any).added;
      const t = typeof added === 'number' ? added : Date.parse(String(added ?? ''));
      return isNaN(t) ? 0 : t;
    }
    case 'name':
      return item.title || item.name || '';
    case 'year': {
      // Shared with MediaCard so cards and sorting always agree. Handles
      // quoted years from older native syncs, release_date/releaseDate,
      // and a trailing year embedded in the name.
      const year = resolveVodYear(item, type);
      return year !== null ? year : -Infinity;
    }
    case 'rating': {
      // rating_5based exists on the DB row but not on the TS type (see db/sync.ts)
      const raw = (item as any).rating_5based ?? item.rating;
      const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/[^\d.]/g, ''));
      return isNaN(parsed) ? -Infinity : parsed;
    }
    case 'lastWatched':
      return maps.lastWatchedMap?.get(id) ?? 0;
    default:
      return 0;
  }
}

export function sortVodItems(
  items: (StoredMovie | StoredSeries)[],
  type: 'movie' | 'series',
  sortKey: VodSortKey,
  direction: SortDirection,
  maps: VodSortMaps = {}
): (StoredMovie | StoredSeries)[] {
  const dir = direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = getVodSortValue(a, type, sortKey, maps);
    const bv = getVodSortValue(b, type, sortKey, maps);
    if (typeof av === 'string' && typeof bv === 'string') {
      return av.localeCompare(bv, activeLocale()) * dir;
    }
    return ((av as number) - (bv as number)) * dir;
  });
}
