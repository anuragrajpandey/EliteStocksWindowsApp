/**
 * Athlete Service API
 *
 * Functions for fetching individual athlete profiles, overview stats, and game logs from ESPN API.
 */

import type {
  AthleteBio,
  AthleteStatSplit,
  AthleteGameLogData,
  AthleteGameLogRow,
  TeamNewsArticle,
} from './types';
import { SPORT_CONFIG } from './config';
import { fetchJson } from './client';

export interface AthleteProfileResponse {
  bio: AthleteBio;
  overviewSplits: AthleteStatSplit[];
  seasonHistory: AthleteStatSplit[];
  news: TeamNewsArticle[];
}

export async function getAthleteDetails(
  athleteId: string,
  leagueId: string
): Promise<AthleteProfileResponse | null> {
  const config = SPORT_CONFIG[leagueId] || SPORT_CONFIG['nfl'];
  if (!config) return null;

  try {
    const [bioData, overviewData, statsData] = await Promise.all([
      fetchJson<{
        athlete?: {
          id: string;
          displayName: string;
          firstName?: string;
          lastName?: string;
          jersey?: string;
          displayHeight?: string;
          displayWeight?: string;
          age?: number;
          dateOfBirth?: string;
          position?: { displayName: string; abbreviation?: string };
          team?: { id: string; displayName: string; logos?: Array<{ href: string }> };
          headshot?: { href: string };
          college?: { name: string };
          experience?: { years?: number; displayValue?: string };
          draft?: { displayText?: string };
          injuries?: Array<{ status?: string; comment?: string }>;
        };
      }>(`https://site.api.espn.com/apis/common/v3/sports/${config.sport}/${config.league}/athletes/${athleteId}`),

      fetchJson<{
        statistics?: {
          labels?: string[];
          splits?: Array<{
            displayName?: string;
            abbreviation?: string;
            stats?: string[];
          }>;
        };
        news?: {
          articles?: Array<{
            id: string;
            headline: string;
            description?: string;
            published?: string;
            images?: Array<{ url: string }>;
            links?: { web?: { href: string } };
          }>;
        };
      }>(`https://site.web.api.espn.com/apis/common/v3/sports/${config.sport}/${config.league}/athletes/${athleteId}/overview`),

      fetchJson<{
        categories?: Array<{
          name?: string;
          displayName?: string;
          labels?: string[];
          statistics?: Array<{
            season?: { year?: number; displayName?: string };
            teamSlug?: string;
            position?: string;
            stats?: string[];
          }>;
        }>;
      }>(`https://site.web.api.espn.com/apis/common/v3/sports/${config.sport}/${config.league}/athletes/${athleteId}/stats`),
    ]);

    const a = bioData?.athlete;
    if (!a) return null;

    const bio: AthleteBio = {
      id: a.id,
      name: a.displayName,
      firstName: a.firstName,
      lastName: a.lastName,
      jersey: a.jersey,
      position: a.position?.displayName,
      positionAbbrev: a.position?.abbreviation,
      teamId: a.team?.id,
      teamName: a.team?.displayName,
      teamLogo: a.team?.logos?.[0]?.href,
      headshot: a.headshot?.href || `https://a.espncdn.com/i/headshots/${config.sport}/players/full/${a.id}.png`,
      height: a.displayHeight,
      weight: a.displayWeight,
      age: a.age,
      birthDate: a.dateOfBirth,
      experience: a.experience?.displayValue || (a.experience?.years !== undefined ? `${a.experience.years} yrs` : undefined),
      college: a.college?.name,
      draftSummary: a.draft?.displayText,
      injuryStatus: a.injuries?.[0]?.status,
    };

    const overviewSplits: AthleteStatSplit[] = [];
    const overviewLabels = overviewData?.statistics?.labels || [];

    if (overviewData?.statistics?.splits && overviewLabels.length > 0) {
      for (const split of overviewData.statistics.splits) {
        if (split.stats && split.stats.length > 0) {
          overviewSplits.push({
            category: split.displayName || split.abbreviation || 'Summary',
            labels: overviewLabels,
            rows: [
              {
                title: split.displayName || 'Summary',
                stats: split.stats,
              },
            ],
          });
        }
      }
    }

    const seasonHistory: AthleteStatSplit[] = [];
    if (statsData?.categories) {
      for (const cat of statsData.categories) {
        if (cat.statistics && cat.statistics.length > 0) {
          const labels = ['YEAR', 'TEAM', 'POS', ...(cat.labels || [])];
          const rows = cat.statistics.map((s) => ({
            title: s.season?.displayName || String(s.season?.year || ''),
            stats: [
              s.season?.displayName || String(s.season?.year || ''),
              s.teamSlug ? s.teamSlug.replace(/-/g, ' ').toUpperCase() : '-',
              s.position || '-',
              ...(s.stats || []),
            ],
          }));

          seasonHistory.push({
            category: cat.displayName || cat.name || 'Career Stats',
            labels,
            rows,
          });
        }
      }
    }

    const news: TeamNewsArticle[] = (overviewData?.news?.articles || []).map(art => ({
      id: art.id,
      headline: art.headline,
      description: art.description,
      published: art.published,
      imageUrl: art.images?.[0]?.url,
      link: art.links?.web?.href,
    }));

    return { bio, overviewSplits, seasonHistory, news };
  } catch (err) {
    console.error('[ESPN API] Failed to fetch athlete profile:', err);
    return null;
  }
}

export async function getAthleteGameLog(
  athleteId: string,
  leagueId: string
): Promise<AthleteGameLogData | null> {
  const config = SPORT_CONFIG[leagueId] || SPORT_CONFIG['nfl'];
  if (!config) return null;

  try {
    const data = await fetchJson<{
      labels?: string[];
      events?: Record<
        string,
        {
          gameDate?: string;
          atVs?: string;
          score?: string;
          gameResult?: string;
          opponent?: {
            displayName?: string;
            logo?: string;
          };
          stats?: string[];
        }
      >;
      seasonTypes?: Array<{
        categories?: Array<{
          events?: Array<{
            eventId?: string;
            stats?: string[];
          }>;
        }>;
      }>;
    }>(`https://site.web.api.espn.com/apis/common/v3/sports/${config.sport}/${config.league}/athletes/${athleteId}/gamelog`);

    if (!data?.labels || !data?.events) return null;

    // Build map of eventId -> stats array from seasonTypes categories
    const statsMap = new Map<string, string[]>();
    if (data.seasonTypes) {
      for (const st of data.seasonTypes) {
        for (const cat of st.categories || []) {
          for (const item of cat.events || []) {
            if (item.eventId && item.stats) {
              statsMap.set(item.eventId, item.stats);
            }
          }
        }
      }
    }

    const labels = data.labels;
    const rows: AthleteGameLogRow[] = [];

    for (const [eventId, ev] of Object.entries(data.events)) {
      if (!ev) continue;
      const stats = statsMap.get(eventId) || ev.stats || [];
      rows.push({
        id: eventId,
        gameDate: ev.gameDate || '',
        opponentName: ev.opponent?.displayName || 'Opponent',
        opponentLogo: ev.opponent?.logo,
        atVs: ev.atVs || '@',
        gameResult: ev.gameResult || '',
        score: ev.score || '',
        stats,
      });
    }

    return { labels, rows };
  } catch (err) {
    console.error('[ESPN API] Failed to fetch athlete gamelog:', err);
    return null;
  }
}
