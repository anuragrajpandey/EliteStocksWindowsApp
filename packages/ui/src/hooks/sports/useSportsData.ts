/**
 * useSportsData Hook
 * 
 * Reusable hook for fetching sports data with loading, error, and retry states
 */

import { useState, useEffect, useCallback } from 'react';

import i18n, { translateNativeError } from '../../i18n';

interface UseSportsDataOptions<T> {
  fetchFn: () => Promise<T>;
  enabled?: boolean;
  deps?: React.DependencyList;
}

interface UseSportsDataResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSportsData<T>({
  fetchFn,
  enabled = true,
  deps = [],
}: UseSportsDataOptions<T>): UseSportsDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      console.error('[useSportsData] Fetch error:', err);
      setError(translateNativeError(err instanceof Error ? err.message : undefined) || i18n.t('sports:failedToLoadData'));
    } finally {
      setLoading(false);
    }
  }, [fetchFn, enabled]);

  useEffect(() => {
    fetchData();
  }, deps);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data: data as T,
    loading,
    error,
    refresh,
  };
}

// Hook for fetching data that depends on settings being loaded
interface UseSportsDataWithSettingsOptions<T> extends UseSportsDataOptions<T> {
  settingsLoaded: boolean;
}

export function useSportsDataWithSettings<T>({
  fetchFn,
  settingsLoaded,
  deps = [],
}: UseSportsDataWithSettingsOptions<T>): UseSportsDataResult<T> {
  return useSportsData({
    fetchFn,
    enabled: settingsLoaded,
    deps: [settingsLoaded, ...deps],
  });
}
