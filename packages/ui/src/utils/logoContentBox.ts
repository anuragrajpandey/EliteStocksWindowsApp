import { LRUCache } from './lru-cache';

/**
 * Logo content-box detection (smart trim).
 *
 * Many channel logos are shipped with a lot of transparent padding baked into
 * the image, which makes them look tiny inside a fixed-size tile when rendered
 * with `object-fit: contain` — and `object-fit: cover` (the old "remove
 * padding" workaround) crops parts of the logo off.
 *
 * This util samples the opaque pixels of a logo once and computes the bounding
 * box of the actual visible content (normalized 0..1 fractions of the image).
 * The UI can then zoom into that region so the logo fills its tile edge-to-edge
 * without ever cropping content.
 *
 * Results are cached in memory (LRU) and persisted to localStorage so we never
 * re-sample logos that have already been analyzed.
 */

export interface LogoContentBox {
  /** Normalized fractions (0..1) of the opaque content within the image. */
  l: number;
  t: number;
  r: number;
  b: number;
}

const STORAGE_KEY = 'ynotv.logo-contentbox.v1';
const MAX_PERSISTED = 10000;
const MAX_CONCURRENT_FETCHES = 8;
const MAX_ANALYSIS_DIM = 160;
const ALPHA_THRESHOLD = 24;
const SAFETY_MARGIN = 0.02;

const memoryCache = new LRUCache<string, LogoContentBox | null>({ maxSize: 5000 });
const inFlight = new Map<string, Promise<LogoContentBox | null>>();
let pendingFetches = 0;

let persisted: Record<string, LogoContentBox | null> = {};
let persistedLoaded = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function loadPersisted(): Record<string, LogoContentBox | null> {
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

function getCached(url: string): LogoContentBox | null | undefined {
  const mem = memoryCache.get(url);
  if (mem !== undefined) return mem;
  const persistedValue = loadPersisted();
  if (Object.prototype.hasOwnProperty.call(persistedValue, url)) {
    return persistedValue[url];
  }
  return undefined;
}

/**
 * Synchronously read the cached content box for a URL (memory + persisted
 * localStorage). Returns the box, `null` if it was previously analyzed as
 * empty/unusable, or `undefined` if it hasn't been seen yet. Use this to seed
 * state before first render so already-corrected logos render trimmed with no
 * post-load "snap".
 */
export function getCachedLogoContentBox(url?: string | null): LogoContentBox | null | undefined {
  if (!url) return undefined;
  return getCached(url);
}

function setCached(url: string, box: LogoContentBox | null) {
  memoryCache.set(url, box);
  const map = loadPersisted();
  if (map[url] !== box) {
    if (Object.keys(map).length >= MAX_PERSISTED) {
      // Evict ~25% of oldest keys to bound storage growth
      const keys = Object.keys(map);
      for (let i = 0; i < Math.floor(keys.length * 0.25); i++) {
        delete map[keys[i]];
      }
    }
    map[url] = box;
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
 * Compute the bounding box of opaque pixels. Throws on cross-origin tainted
 * canvases (caller falls back to the fetch proxy in that case).
 */
function computeContentBox(img: HTMLImageElement): LogoContentBox | null {
  const nW = img.naturalWidth;
  const nH = img.naturalHeight;
  if (!nW || !nH) return null;

  const scale = Math.min(1, MAX_ANALYSIS_DIM / Math.max(nW, nH));
  const cw = Math.max(1, Math.round(nW * scale));
  const ch = Math.max(1, Math.round(nH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, cw, ch);
  const { data } = ctx.getImageData(0, 0, cw, ch);

  let minX = -1;
  let minY = -1;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (data[(y * cw + x) * 4 + 3] < ALPHA_THRESHOLD) continue;
      if (minX === -1 || x < minX) minX = x;
      if (maxX === -1 || x > maxX) maxX = x;
      if (minY === -1 || y < minY) minY = y;
      if (maxY === -1 || y > maxY) maxY = y;
    }
  }

  if (minX === -1) return null;

  // Safety margin so faint drop-shadows / anti-aliasing are not cut flush.
  const margin = SAFETY_MARGIN;
  const l = Math.max(0, minX / (cw - 1) - margin);
  const t = Math.max(0, minY / (ch - 1) - margin);
  const r = Math.min(1, maxX / (cw - 1) + margin);
  const b = Math.min(1, maxY / (ch - 1) + margin);

  return { l, t, r, b };
}

/**
 * Fetch logo bytes via the Tauri fetch proxy (bypasses CORS) and analyze them
 * from a same-origin blob URL. Falls back gracefully.
 */
async function analyzeFromUrl(url: string): Promise<LogoContentBox | null> {
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
      return computeContentBox(img);
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
 * Get the opaque content box for a logo URL, or `null` when it can't be
 * determined (fully transparent image, cross-origin without proxy, etc.).
 * `loadedImg` (optional) lets us reuse the already-fetched <img> element for
 * same-origin / CORS-enabled logos; otherwise we fall back to the Tauri fetch
 * proxy. Cached results return immediately.
 */
export async function getLogoContentBox(
  url: string,
  loadedImg?: HTMLImageElement
): Promise<LogoContentBox | null> {
  const cached = getCached(url);
  if (cached !== undefined) return cached;

  const existing = inFlight.get(url);
  if (existing) return existing;

  const promise = (async () => {
    let box: LogoContentBox | null = null;

    if (loadedImg && loadedImg.complete && loadedImg.naturalWidth > 0) {
      try {
        box = computeContentBox(loadedImg);
      } catch {
        box = null; // cross-origin tainted canvas — fall back to proxy
      }
    }

    if (box === null) {
      box = await analyzeFromUrl(url);
    }

    setCached(url, box);
    inFlight.delete(url);
    return box;
  })();

  inFlight.set(url, promise);
  return promise;
}
