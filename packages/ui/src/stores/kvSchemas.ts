// ─────────────────────────────────────────────────────────────────────────────
// KV value schemas — the single source of truth for what shapes each KV key is
// allowed to hydrate. Every shape a key has had across app versions is listed
// here so an old persisted copy can never poison a store again (this is the
// bug class behind the `library is not iterable` crash after the zustand
// persist → SQLite migration: the old value was `{ state: { ... }, version }`,
// but the new parser read `.library` straight off it, hydrating `undefined`).
//
// Each sanitizer either coerces the parsed value to the current safe shape or
// returns `null`, in which case bindStoreToKv rejects the value and the store
// keeps its default state.
// ─────────────────────────────────────────────────────────────────────────────

import type { LibraryItem } from './stremioLibraryStore';
import type { StremioWatchEntry, StremioEpisodeProgress } from './stremioWatchStore';

export interface LibraryKvValue {
  library: LibraryItem[];
}

export interface WatchKvValue {
  history: StremioWatchEntry[];
  episodeProgress: Record<string, StremioEpisodeProgress>;
}

/** Pick an array off one of the historical shapes, or `null` when absent. */
function pickArray(parsed: unknown, currentKey: string): unknown[] | null {
  const p = parsed as Record<string, any> | any[];
  if (Array.isArray(p)) return p;
  if (p && typeof p === 'object' && !Array.isArray(p)) {
    if (Array.isArray(p[currentKey])) return p[currentKey];
    const state = p.state;
    if (state && typeof state === 'object' && !Array.isArray(state) && Array.isArray(state[currentKey])) {
      return state[currentKey];
    }
  }
  return null;
}

/**
 * Every shape the `stremio-library` KV value has had:
 * - current:        `{ library: [...] }`
 * - legacy wrapper: `{ state: { library: [...] }, version }` (zustand persist)
 * - oldest:         a bare array
 * Returns `null` for anything else so hydration is rejected, never applied.
 */
export function sanitizeLibraryValue(value: unknown): LibraryKvValue | null {
  const library = pickArray(value, 'library');
  return library === null ? null : { library: library as LibraryItem[] };
}

/**
 * Every shape the `stremio-watch-history` KV value has had (same evolution as
 * the library). `episodeProgress` defaults to `{}` when absent. Returns `null`
 * when history isn't an array so hydration is rejected.
 */
export function sanitizeWatchState(value: unknown): WatchKvValue | null {
  const history = pickArray(value, 'history');
  if (history === null) return null;
  const p = value as Record<string, any> | null;
  const rawProgress =
    p && typeof p === 'object' && !Array.isArray(p)
      ? (p.episodeProgress ?? p.state?.episodeProgress)
      : undefined;
  const episodeProgress =
    rawProgress && typeof rawProgress === 'object' && !Array.isArray(rawProgress)
      ? rawProgress
      : {};
  return { history: history as StremioWatchEntry[], episodeProgress };
}
