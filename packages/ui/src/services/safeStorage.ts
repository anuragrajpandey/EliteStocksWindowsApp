/**
 * Harden `localStorage.setItem` against storage-full crashes.
 *
 * The codebase calls `localStorage.setItem` in ~100 places, almost all of them
 * unguarded. When the WebView2 storage quota is exceeded (a user with a very
 * large setup, or accumulated bloat), ANY of those calls throws
 * QuotaExceededError and — because the window is transparent — previously
 * crashed the renderer into an invisible window. The error boundary now shows
 * the crash, but the writes themselves must not be fatal.
 *
 * This patches setItem once, before the app mounts, so a failed write logs a
 * warning instead of taking down the whole app. Only storage-capacity failures
 * are swallowed; genuine errors (invalid keys etc.) still propagate.
 */
/**
 * Clear all localStorage keys, preserving nothing (used by the recovery
 * screen's storage-quota fix). Data is small/regenerable — DB and settings
 * live elsewhere.
 */
export function clearLocalStorage(): void {
  try {
    window.localStorage.clear();
  } catch (e) {
    console.warn('[safeStorage] localStorage.clear() failed:', e);
  }
}

export interface StorageUsageEntry {
  key: string;
  bytes: number;
}

/**
 * Report how much space each localStorage key consumes (for debugging which
 * key has grown out of control). Returns entries sorted by size, largest
 * first, plus the total bytes used.
 */
export function getLocalStorageUsage(): {
  entries: StorageUsageEntry[];
  totalBytes: number;
} {
  const entries: StorageUsageEntry[] = [];
  let totalBytes = 0;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key === null) continue;
      try {
        const value = window.localStorage.getItem(key);
        // UTF-16: 2 bytes per char (localStorage stores DOMStrings).
        const bytes = (key.length + (value ? value.length : 0)) * 2;
        entries.push({ key, bytes });
        totalBytes += bytes;
      } catch (e) {
        console.warn(`[safeStorage] Could not measure key "${key}":`, e);
      }
    }
  } catch (e) {
    console.warn('[safeStorage] Could not enumerate localStorage:', e);
  }
  entries.sort((a, b) => b.bytes - a.bytes);
  return { entries, totalBytes };
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

export function installSafeStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const proto = Object.getPrototypeOf(window.localStorage) as Storage;
  const originalSetItem = proto.setItem;
  if ((proto as Storage & { __safeSetItemPatched?: boolean }).__safeSetItemPatched) return;

  proto.setItem = function (this: Storage, key: string, value: string) {
    try {
      originalSetItem.call(this, key, value);
    } catch (e) {
      // QuotaExceededError (and any other storage-capacity failure) must not
      // crash the app — the preference simply isn't persisted.
      const name = e instanceof DOMException ? e.name : (e as Error)?.name;
      if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.warn(
          `[safeStorage] localStorage quota exceeded — could not save "${key}". ` +
            'The app keeps running; this preference will not persist until storage is cleared.'
        );
        return;
      }
      throw e;
    }
  };
  (proto as Storage & { __safeSetItemPatched?: boolean }).__safeSetItemPatched = true;
}
