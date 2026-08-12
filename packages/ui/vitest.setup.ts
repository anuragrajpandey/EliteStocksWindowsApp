// zustand's persist middleware reads localStorage when a store module is
// imported — stub it here (setupFiles run before any test-file imports) so
// store tests can hydrate in a node environment.
const storageMap = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, value: string) => void storageMap.set(key, value),
    removeItem: (key: string) => void storageMap.delete(key),
    clear: () => void storageMap.clear(),
  },
  configurable: true,
  writable: true,
});
