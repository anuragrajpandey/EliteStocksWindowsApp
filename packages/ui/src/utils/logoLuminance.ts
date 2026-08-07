import { LRUCache } from './lru-cache';

/**
 * Logo luminance classification.
 *
 * Most channel logos are transparent PNGs designed to sit on white or light
 * backgrounds, which makes them hard to see on a dark UI. We sample each logo's
 * average luminance once (downscaled to a 16x16 canvas) and classify it as
 * 'dark' (needs a light tile background) or 'light' (fine as-is). Results are
 * cached in memory (LRU) and persisted to localStorage so we never re-sample
 * logos that have already been classified.
 */

export type LogoVerdict = 'light' | 'dark';

const STORAGE_KEY = 'ynotv.logo-luminance.v1';
const MAX_PERSISTED = 10000;
const MAX_CONCURRENT_FETCHES = 8;

const memoryCache = new LRUCache<string, LogoVerdict>({ maxSize: 5000 });
const inFlight = new Map<string, Promise<LogoVerdict>>();
let pendingFetches = 0;

let persisted: Record<string, LogoVerdict> = {};
let persistedLoaded = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function loadPersisted(): Record<string, LogoVerdict> {
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
      // Storage full or unavailable — keep in-memory only
    }
  }, 2000);
}

function getCached(url: string): LogoVerdict | undefined {
  const mem = memoryCache.get(url);
  if (mem) return mem;
  return loadPersisted()[url];
}

/**
 * Synchronously read the cached luminance verdict for a URL (memory +
 * persisted localStorage). Returns the verdict, or `undefined` if it hasn't
 * been classified yet. Use this to seed state before first render so
 * already-classified logos are shown with the correct tile on first paint,
 * avoiding a dark-then-light flash while scrolling.
 */
export function getCachedLogoVerdict(url?: string | null): LogoVerdict | undefined {
  if (!url) return undefined;
  return getCached(url);
}

function setCached(url: string, verdict: LogoVerdict) {
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

/**
 * Compute average luminance of an image element drawn onto a 16x16 canvas.
 * Weighted by alpha so transparent pixels don't skew the average.
 */
function sampleLuminance(img: HTMLImageElement): number {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 255;
  ctx.drawImage(img, 0, 0, 16, 16);
  const { data } = ctx.getImageData(0, 0, 16, 16);

  let sum = 0;
  let weight = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += lum * alpha;
    weight += alpha;
  }
  return weight > 0 ? sum / weight : 255;
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
 * Fetch logo bytes via the Tauri fetch proxy (bypasses CORS) and sample
 * luminance from a same-origin blob URL. Falls back gracefully.
 */
async function sampleFromUrl(url: string): Promise<number | null> {
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
      return sampleLuminance(img);
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
 * Classify a logo URL. `loadedImg` (optional) lets us reuse the already-fetched
 * <img> element for same-origin / CORS-enabled logos; otherwise we fall back to
 * the Tauri fetch proxy. Cached results return immediately.
 */
export async function classifyLogo(url: string, loadedImg?: HTMLImageElement): Promise<LogoVerdict> {
  const cached = getCached(url);
  if (cached) return cached;

  const existing = inFlight.get(url);
  if (existing) return existing;

  const promise = (async () => {
    let lum: number | null = null;

    if (loadedImg && loadedImg.complete && loadedImg.naturalWidth > 0) {
      try {
        lum = sampleLuminance(loadedImg);
      } catch {
        lum = null; // cross-origin tainted canvas — fall back to proxy
      }
    }

    if (lum === null) {
      lum = await sampleFromUrl(url);
    }

    // Conservative threshold: only genuinely dark logos get the light tile
    const verdict: LogoVerdict = lum === null ? 'light' : lum < 70 ? 'dark' : 'light';
    setCached(url, verdict);
    return verdict;
  })().finally(() => inFlight.delete(url));

  inFlight.set(url, promise);
  return promise;
}
