/**
 * ESPN API Client
 *
 * HTTP client for making requests to ESPN API
 */

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { ESPN_API_BASE } from './config';

export async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    console.log('[ESPN API] Fetching:', url);
    // ESPN API endpoints return Access-Control-Allow-Origin: * (CORS enabled).
    // Using Tauri's plugin-http routes requests through Rust reqwest whose User-Agent/TLS fingerprint
    // is blocked with 403 Forbidden by ESPN's Akamai WAF. Native fetch uses the Webview engine.
    let response: Response;
    const getNativeFetch = () =>
      typeof window !== 'undefined' && typeof window.fetch === 'function'
        ? window.fetch.bind(window)
        : globalThis.fetch;

    try {
      response = await getNativeFetch()(url, { method: 'GET' });
    } catch (nativeErr) {
      console.warn('[ESPN API] Native fetch failed, trying Tauri HTTP plugin:', nativeErr);
      response = await tauriFetch(url, { method: 'GET' });
    }

    if (!response.ok && response.status === 403) {
      console.warn(`[ESPN API] Received 403 with primary fetch, trying fallback for: ${url}`);
      try {
        const fallbackResponse = await tauriFetch(url, { method: 'GET' });
        if (fallbackResponse.ok) {
          response = fallbackResponse;
        }
      } catch {
        // ignore fallback errors
      }
    }

    if (!response.ok) {
      console.warn(`[ESPN API] Request failed: ${response.status} ${url}`);
      return null;
    }
    const text = await response.text();
    const data = JSON.parse(text) as T;
    console.log('[ESPN API] Response received:', url);
    return data;
  } catch (err) {
    console.error('[ESPN API] Fetch error:', err, url);
    return null;
  }
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
  return `https://site.api.espn.com/apis/site/v3/sports/${sport}/${league}/leaders`;
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
