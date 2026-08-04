import { LRUCache } from './lru-cache';

/**
 * Logo aspect-ratio classification.
 *
 * Loads each logo once (via Tauri fetch proxy to bypass CORS) and classifies
 * its natural aspect ratio as 'wide' (width/height > 1.5 — better in a wide
 * rectangle tile) or 'square' (<= 1.5 — fine in a square tile).
 *
 * Results are cached in memory (LRU) and persisted to localStorage so we
 * never re-fetch logos that have already been classified.
 */

export type AspectVerdict = 'wide' | 'square';

const STORAGE_KEY = 'ynotv.logo-aspect.v1';
const MAX_PERSISTED = 10000;
const MAX_CONCURRENT_FETCHES = 8;

/** Aspect ratio threshold above which a logo is considered 'wide' */
const WIDE_THRESHOLD = 1.5;

const memoryCache = new LRUCache<string, AspectVerdict>({ maxSize: 5000 });
const inFlight = new Map<string, Promise<AspectVerdict>>();
let pendingFetches = 0;

let persisted: Record<string, AspectVerdict> = {};
let persistedLoaded = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function loadPersisted(): Record<string, AspectVerdict> {
  if (persistedLoaded) return persisted;
  persistedLoaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    persisted = raw ? JSON.parse(raw) : {};
  } catch {
    persisted = {};
  }
  return persisted;
}

function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Storage full or unavailable -- keep in-memory only
    }
  }, 2000);
}

function getCached(url: string): AspectVerdict | undefined {
  const mem = memoryCache.get(url);
  if (mem) return mem;
  return loadPersisted()[url];
}

function setCached(url: string, verdict: AspectVerdict) {
  memoryCache.set(url, verdict);
  const map = loadPersisted();
  if (map[url] !== verdict) {
    if (Object.keys(map).length >= MAX_PERSISTED) {
      // Evict ~25% of oldest keys to bound storage growth
      const keys = Object.keys(map);
      for (let i = 0; i < Math.floor(keys.length * 0.25); i++) {
        delete map[keys[i]];
      }
    }
    map[url] = verdict;
    schedulePersist();
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

/**
 * Measure aspect ratio via the Tauri fetch proxy (bypasses CORS).
 * Falls back gracefully if the proxy is unavailable.
 */
async function measureFromUrl(url: string): Promise<number | null> {
  if (pendingFetches >= MAX_CONCURRENT_FETCHES) return null;
  if (typeof window === 'undefined' || !window.fetchProxy?.fetchBinary) return null;

  pendingFetches++;
  try {
    const res = await window.fetchProxy.fetchBinary(url, { timeout: 10000 });
    if (!res?.success || !res.data) return null;
    const bytes = res.data.buffer.slice(
      res.data.byteOffset,
      res.data.byteOffset + res.data.byteLength
    ) as ArrayBuffer;
    const blob = new Blob([bytes]);
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await loadImage(objectUrl);
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        return img.naturalWidth / img.naturalHeight;
      }
      return null;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  } finally {
    pendingFetches--;
  }
}

/**
 * Classify a logo URL's aspect ratio.
 * `loadedImg` (optional) lets us reuse the already-fetched <img> element for
 * same-origin / CORS-enabled logos; otherwise falls back to the Tauri proxy.
 * Cached results return immediately.
 */
export async function classifyLogoAspect(
  url: string,
  loadedImg?: HTMLImageElement
): Promise<AspectVerdict> {
  const cached = getCached(url);
  if (cached) return cached;

  const existing = inFlight.get(url);
  if (existing) return existing;

  const promise = (async () => {
    let ratio: number | null = null;

    // Try reusing the already-loaded <img> element first (fast path)
    if (loadedImg && loadedImg.complete && loadedImg.naturalWidth > 0 && loadedImg.naturalHeight > 0) {
      try {
        ratio = loadedImg.naturalWidth / loadedImg.naturalHeight;
      } catch {
        ratio = null;
      }
    }

    // Fall back to fetch proxy for cross-origin images
    if (ratio === null) {
      ratio = await measureFromUrl(url);
    }

    const verdict: AspectVerdict = ratio !== null && ratio > WIDE_THRESHOLD ? 'wide' : 'square';
    setCached(url, verdict);
    inFlight.delete(url);
    return verdict;
  })();

  inFlight.set(url, promise);
  return promise;
}
