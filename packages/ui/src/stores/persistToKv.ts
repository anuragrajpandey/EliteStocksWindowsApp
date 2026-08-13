import {
  readAppKvSync,
  loadAppKv,
  writeAppKv,
  migrateFromLocalStorage,
} from '../services/appKv';
import { registerOnAppClose } from '../services/tauri-bridge';

// `registerOnAppClose` keeps a single callback, so all KV flushes are
// registered through one shared handler instead of each store replacing the
// previous one.
const flushHandlers: Array<() => Promise<void>> = [];
let closeHandlerRegistered = false;
function ensureCloseHandler(): void {
  if (closeHandlerRegistered) return;
  closeHandlerRegistered = true;
  registerOnAppClose(async () => {
    await Promise.all(flushHandlers.map((fn) => fn().catch(() => {})));
  });
}

/**
 * Wire a UI store's state to the SQLite-backed KV store:
 *
 * 1. Bootstrap synchronously from localStorage so first paint has data.
 * 2. Load the authoritative copy from SQLite (merging anything newer that was
 *    in localStorage) and apply it to the store.
 * 3. Every subsequent state change is persisted to SQLite (debounced).
 *
 * Returns `whenReady` — resolves once the SQLite copy has been loaded/applied,
 * so exporters can await it before reading store state.
 */
export interface KvBinding {
  whenReady: Promise<void>;
  flush: () => Promise<void>;
}

export function bindStoreToKv<T>(
  key: string,
  parse: (raw: string) => T,
  apply: (value: T | null) => void,
  serialize: (state: T) => string,
  getCurrent: () => T,
  onChange: (fn: () => void) => () => void
): KvBinding {
  // 1. Synchronous bootstrap from localStorage (old location) for first paint.
  const bootstrapRaw = readAppKvSync(key);
  if (bootstrapRaw !== null) {
    try {
      apply(parse(bootstrapRaw));
    } catch (e) {
      console.warn(`[persistToKv] Failed to parse bootstrap for "${key}":`, e);
    }
  }

  // 2. Authoritative load from SQLite.
  const whenReady = loadAppKv(key).then((raw) => {
    if (raw !== null) {
      try {
        apply(parse(raw));
      } catch (e) {
        console.warn(`[persistToKv] Failed to parse stored value for "${key}":`, e);
      }
    }
  });

  // 3. Debounced persistence of subsequent changes.
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSerialized: string | null = null;
  const flush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const current = serialize(getCurrent());
    if (current === lastSerialized) return;
    lastSerialized = current;
    await writeAppKv(key, current);
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      flush().catch(() => {});
    }, 250);
  };
  onChange(schedule);

  // Kick off the migration (also covered by loadAppKv, but ensure ordering).
  migrateFromLocalStorage(key).catch(() => {});

  // Register this store's flush with the shared close handler.
  flushHandlers.push(flush);
  ensureCloseHandler();

  return { whenReady, flush };
}
