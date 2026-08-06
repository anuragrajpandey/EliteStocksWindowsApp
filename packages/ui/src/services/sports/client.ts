/**
 * ESPN API Client
 *
 * HTTP client for making requests to ESPN API
 */

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { ESPN_API_BASE } from './config';

// Response cache with 30s TTL to prevent duplicate network calls across components
const responseCache = new Map<string, { data: any; expiry: number }>();
// In-flight promise map to deduplicate simultaneous requests for identical URLs
const inFlightRequests = new Map<string, Promise<any>>();

const CACHE_TTL_MS = 30 * 1000;

export interface FetchOptions {
  suppressWarns?: boolean;
  ttlMs?: number;
}

export async function fetchJson<T>(url: string, options?: FetchOptions): Promise<T | null> {
  const targetUrl = url.replace('site.api.espn.com', 'site.web.api.espn.com');
  const now = Date.now();
  const ttl = options?.ttlMs ?? CACHE_TTL_MS;

  // 1. Return cached data if still valid
  const cached = responseCache.get(targetUrl);
  if (cached && cached.expiry > now) {
    return cached.data as T;
  }

  // 2. Return existing in-flight promise if duplicate call is already running
  if (inFlightRequests.has(targetUrl)) {
    return inFlightRequests.get(targetUrl) as Promise<T | null>;
  }

  // 3. Execute HTTP fetch
  const fetchPromise = (async (): Promise<T | null> => {
    try {
      const requestHeaders = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      };

      let response: Response;

      // In Tauri environment, use tauriFetch directly to bypass browser CORS checks and avoid DevTools console errors
      const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

      if (isTauri) {
        try {
          response = await tauriFetch(targetUrl, { method: 'GET', headers: requestHeaders });
        } catch {
          const getNativeFetch = () =>
            typeof window !== 'undefined' && typeof window.fetch === 'function'
              ? window.fetch.bind(window)
              : globalThis.fetch;
          response = await getNativeFetch()(targetUrl, { method: 'GET' });
        }
      } else {
        const getNativeFetch = () =>
          typeof window !== 'undefined' && typeof window.fetch === 'function'
            ? window.fetch.bind(window)
            : globalThis.fetch;
        try {
          response = await getNativeFetch()(targetUrl, { method: 'GET' });
        } catch {
          response = await tauriFetch(targetUrl, { method: 'GET', headers: requestHeaders });
        }
      }

      if (!response.ok && (response.status === 403 || response.status === 0)) {
        try {
          const fallbackUrl = targetUrl.includes('site.web.api.espn.com')
            ? targetUrl.replace('site.web.api.espn.com', 'site.api.espn.com')
            : targetUrl;
          const fallbackResponse = await tauriFetch(fallbackUrl, { method: 'GET', headers: requestHeaders });
          if (fallbackResponse.ok) {
            response = fallbackResponse;
          }
        } catch {
          // ignore fallback error
        }
      }

      if (!response.ok) {
        if (!options?.suppressWarns) {
          console.warn(`[ESPN API] Request failed: ${response.status} ${targetUrl}`);
        }
        return null;
      }

      const text = await response.text();
      const data = JSON.parse(text) as T;
      console.log('[ESPN API] Response received:', targetUrl);

      // Cache successful response
      responseCache.set(targetUrl, { data, expiry: Date.now() + ttl });
      return data;
    } catch (err) {
      if (!options?.suppressWarns) {
        console.error('[ESPN API] Fetch error:', err, url);
      }
      return null;
    } finally {
      inFlightRequests.delete(targetUrl);
    }
  })();

  inFlightRequests.set(targetUrl, fetchPromise);
  return fetchPromise;
}

export function buildScoreboardUrl(sport: string, league: string, date?: Date): string {
  let url = `${ESPN_API_BASE}/${sport}/${league}/scoreboard`;
  
  if (date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    url += `?dates=${year}${month}${day}`;
  }
  
  return url;
}

export function buildDateRangeUrl(sport: string, league: string, startDate: Date, endDate: Date): string {
  const formatDate = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, '');
  const dateRange = `${formatDate(startDate)}-${formatDate(endDate)}`;
  return `${ESPN_API_BASE}/${sport}/${league}/scoreboard?dates=${dateRange}`;
}

export function buildTeamsUrl(sport: string, league: string): string {
  return `${ESPN_API_BASE}/${sport}/${league}/teams`;
}

export function buildTeamUrl(sport: string, league: string, teamId: string): string {
  return `${ESPN_API_BASE}/${sport}/${league}/teams/${teamId}`;
}

export function buildTeamScheduleUrl(sport: string, league: string, teamId: string): string {
  return `${ESPN_API_BASE}/${sport}/${league}/teams/${teamId}/schedule`;
}

export function buildStandingsUrl(sport: string, league: string): string {
  return `https://site.web.api.espn.com/apis/v2/sports/${sport}/${league}/standings`;
}

export function buildNewsUrl(sport: string, league: string, limit: number = 20): string {
  return `${ESPN_API_BASE}/${sport}/${league}/news?limit=${limit}`;
}

export function buildRankingsUrl(sport: string, league: string): string {
  return `${ESPN_API_BASE}/${sport}/${league}/rankings`;
}

export function buildLeadersUrl(sport: string, league: string): string {
  // Leaders endpoint requires v3 API
  return `https://site.web.api.espn.com/apis/site/v3/sports/${sport}/${league}/leaders`;
}

export function buildGameSummaryUrl(sport: string, league: string, eventId: string): string {
  return `${ESPN_API_BASE}/${sport}/${league}/summary?event=${eventId}`;
}

export function buildPlayByPlayUrl(sport: string, league: string, eventId: string): string {
  return `${ESPN_API_BASE}/${sport}/${league}/playbyplay?event=${eventId}`;
}

export function buildUFCRankingsUrl(): string {
  return `${ESPN_API_BASE}/mma/ufc/rankings`;
}

export function buildCoreLeagueUrl(sport: string, league: string): string {
  // Compact league object (with logos) from ESPN's core API
  return `https://sports.core.api.espn.com/v2/sports/${sport}/leagues/${league}`;
}
