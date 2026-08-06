import { useState, useEffect, useCallback, useMemo } from 'react';
import { useEpgClockFormat } from '../../stores/uiStore';
import type { SportsEvent, SportsLeague, SportsTeam } from '@ynotv/core';
import {
  getAvailableLeagues,
  getLeagueEvents,
  getLeagueTeams,
  getLeagueStandingsGrouped,
  getGolfRankings,
  getTennisRankings,
  getRacingStandings,
  type StandingTeam,
  type StandingGroup,
  type GolfRanking,
  type TennisRanking,
  type RacingStanding,
  formatEventTime,
} from '../../services/sports';
import { TeamDetail } from './TeamDetail';
import { GameDetail } from './GameDetail';
import { useSportsSettingsStore } from '../../stores/sportsSettingsStore';
import { useSportsFavoritesStore } from '../../stores/sportsFavoritesStore';

interface LeaguesTabProps {
  onSearchChannels?: (channelName: string) => void;
  onPlayChannel?: (channel: import('../../db').StoredChannel) => void;
}

type LeagueView = 'teams' | 'schedule' | 'standings';

// Sports that are individual (no teams)
const INDIVIDUAL_SPORTS = ['ufc', 'pga', 'lpga', 'atp', 'wta', 'f1', 'nascar', 'indycar'];

const SPORT_DISPLAY_NAMES: Record<string, string> = {
  football: 'Football',
  basketball: 'Basketball',
  baseball: 'Baseball',
  hockey: 'Hockey',
  soccer: 'Soccer',
  mma: 'MMA & Combat',
  golf: 'Golf',
  tennis: 'Tennis',
  racing: 'Racing',
  rugby: 'Rugby Union',
  'rugby-league': 'Rugby League',
};

const SPORT_GRADIENTS: Record<string, string> = {
  football: 'linear-gradient(135deg, #1b4d3e, #0f2a20)',
  basketball: 'linear-gradient(135deg, #ff8c00, #d35400)',
  baseball: 'linear-gradient(135deg, #f43f5e, #be123c)',
  hockey: 'linear-gradient(135deg, #38bdf8, #0369a1)',
  soccer: 'linear-gradient(135deg, #4ade80, #15803d)',
  mma: 'linear-gradient(135deg, #ef4444, #991b1b)',
  golf: 'linear-gradient(135deg, #10b981, #065f46)',
  tennis: 'linear-gradient(135deg, #a3e635, #4d7c0f)',
  racing: 'linear-gradient(135deg, #4b5563, #111827)',
  rugby: 'linear-gradient(135deg, #ea580c, #7c2d12)',
  'rugby-league': 'linear-gradient(135deg, #f97316, #9a3412)',
};

const FALLBACK_DIVISIONS: Record<string, Record<string, string>> = {
  nfl: {
    BUF: 'AFC East', MIA: 'AFC East', NE: 'AFC East', NYJ: 'AFC East',
    BAL: 'AFC North', CIN: 'AFC North', CLE: 'AFC North', PIT: 'AFC North',
    HOU: 'AFC South', IND: 'AFC South', JAX: 'AFC South', JAC: 'AFC South', TEN: 'AFC South',
    DEN: 'AFC West', KC: 'AFC West', LV: 'AFC West', LVR: 'AFC West', LAC: 'AFC West',
    DAL: 'NFC East', NYG: 'NFC East', PHI: 'NFC East', WAS: 'NFC East', WSH: 'NFC East',
    CHI: 'NFC North', DET: 'NFC North', GB: 'NFC North', MIN: 'NFC North',
    ATL: 'NFC South', CAR: 'NFC South', NO: 'NFC South', TB: 'NFC South',
    ARI: 'NFC West', LAR: 'NFC West', SF: 'NFC West', SEA: 'NFC West',
  },
  nba: {
    BOS: 'Atlantic Division', BKN: 'Atlantic Division', NYK: 'Atlantic Division', PHI: 'Atlantic Division', TOR: 'Atlantic Division',
    CHI: 'Central Division', CLE: 'Central Division', DET: 'Central Division', IND: 'Central Division', MIL: 'Central Division',
    ATL: 'Southeast Division', CHA: 'Southeast Division', MIA: 'Southeast Division', ORL: 'Southeast Division', WAS: 'Southeast Division',
    DEN: 'Northwest Division', MIN: 'Northwest Division', OKC: 'Northwest Division', POR: 'Northwest Division', UTA: 'Northwest Division',
    GSW: 'Pacific Division', LAC: 'Pacific Division', LAL: 'Pacific Division', PHX: 'Pacific Division', SAC: 'Pacific Division',
    DAL: 'Southwest Division', HOU: 'Southwest Division', MEM: 'Southwest Division', NOP: 'Southwest Division', SAS: 'Southwest Division',
  },
  mlb: {
    BAL: 'AL East', BOS: 'AL East', NYY: 'AL East', TB: 'AL East', TOR: 'AL East',
    CWS: 'AL Central', CLE: 'AL Central', DET: 'AL Central', KC: 'AL Central', MIN: 'AL Central',
    HOU: 'AL West', LAA: 'AL West', OAK: 'AL West', ATH: 'AL West', SEA: 'AL West', TEX: 'AL West',
    ATL: 'NL East', MIA: 'NL East', NYM: 'NL East', PHI: 'NL East', WAS: 'NL East',
    CHC: 'NL Central', CIN: 'NL Central', MIL: 'NL Central', PIT: 'NL Central', STL: 'NL Central',
    ARI: 'NL West', COL: 'NL West', LAD: 'NL West', SD: 'NL West', SF: 'NL West',
  },
  nhl: {
    BOS: 'Atlantic Division', BUF: 'Atlantic Division', DET: 'Atlantic Division', FLA: 'Atlantic Division', MTL: 'Atlantic Division', OTT: 'Atlantic Division', TB: 'Atlantic Division', TOR: 'Atlantic Division',
    CAR: 'Metropolitan Division', CBJ: 'Metropolitan Division', NJD: 'Metropolitan Division', NYI: 'Metropolitan Division', NYR: 'Metropolitan Division', PHI: 'Metropolitan Division', PIT: 'Metropolitan Division', WSH: 'Metropolitan Division',
    ARI: 'Central Division', CHI: 'Central Division', COL: 'Central Division', DAL: 'Central Division', MIN: 'Central Division', NSH: 'Central Division', STL: 'Central Division', WPG: 'Central Division', UTA: 'Central Division',
    ANA: 'Pacific Division', CGY: 'Pacific Division', EDM: 'Pacific Division', LAK: 'Pacific Division', SJS: 'Pacific Division', SEA: 'Pacific Division', VAN: 'Pacific Division', VGK: 'Pacific Division',
  },
};

const getSportDisplayName = (sport: string) => {
  return SPORT_DISPLAY_NAMES[sport] || (sport.charAt(0).toUpperCase() + sport.slice(1));
};

const getSportGradient = (sport: string) => {
  return SPORT_GRADIENTS[sport] || 'linear-gradient(135deg, #818cf8, #3730a3)';
};

function groupTeamsByDivision(teams: SportsTeam[], leagueId?: string): Map<string, SportsTeam[]> {
  const groups = new Map<string, SportsTeam[]>();

  for (const team of teams) {
    let divName = 'All Teams';
    const teamAny = team as any;
    const summary = teamAny.standingSummary;

    if (summary) {
      const match = summary.match(/in\s+([A-Za-z0-9\s]+)$/i);
      if (match && match[1]) {
        divName = match[1].trim();
      }
    }

    if (divName === 'All Teams' && leagueId && FALLBACK_DIVISIONS[leagueId]) {
      const abbrev = (teamAny.abbreviation || team.shortName || '').toUpperCase();
      if (abbrev && FALLBACK_DIVISIONS[leagueId][abbrev]) {
        divName = FALLBACK_DIVISIONS[leagueId][abbrev];
      }
    }

    if (!groups.has(divName)) {
      groups.set(divName, []);
    }
    groups.get(divName)!.push(team);
  }

  return groups;
}

interface DateRailProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

function HorizontalDateRail({ selectedDate, onSelectDate }: DateRailProps) {
  const [baseDate, setBaseDate] = useState<Date>(() => new Date(selectedDate));

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const handlePrevWeek = () => {
    const prev = new Date(baseDate);
    prev.setDate(prev.getDate() - 7);
    setBaseDate(prev);
    onSelectDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + 7);
    setBaseDate(next);
    onSelectDate(next);
  };

  const handleJumpToday = () => {
    const today = new Date();
    setBaseDate(today);
    onSelectDate(today);
  };

  const days: Date[] = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const isTodayActive = isSameDay(selectedDate, new Date());

  const formattedTitle = selectedDate.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="horizontal-date-rail-container">
      <div className="horizontal-date-rail">
        <button
          className="date-rail-nav-btn"
          onClick={handlePrevWeek}
          title="Previous week"
        >
          ‹
        </button>

        <div className="date-rail-pills">
          {days.map((day) => {
            const active = isSameDay(day, selectedDate);
            const dayName = day.toLocaleDateString(undefined, { weekday: 'short' });
            const dayNum = day.getDate();

            return (
              <button
                key={day.toISOString()}
                className={`date-rail-pill${active ? ' active' : ''}`}
                onClick={() => onSelectDate(day)}
              >
                <span className="date-rail-day-name">{dayName}</span>
                <span className="date-rail-day-num">{dayNum}</span>
              </button>
            );
          })}
        </div>

        <button
          className="date-rail-nav-btn"
          onClick={handleNextWeek}
          title="Next week"
        >
          ›
        </button>

        {!isTodayActive && (
          <button className="date-rail-today-btn" onClick={handleJumpToday}>
            Today
          </button>
        )}
      </div>

      <div className="date-rail-title">{formattedTitle}</div>
    </div>
  );
}

interface LeagueGameCardProps {
  event: SportsEvent;
  isIndividualSport: boolean;
  onChannelClick?: (channelName: string) => void;
  onClick?: () => void;
}

function LeagueGameCard({ event, isIndividualSport, onChannelClick, onClick }: LeagueGameCardProps) {
  const epgClockFormat = useEpgClockFormat();
  const isLive = event.status === 'live';
  const isFinished = event.status === 'finished';

  const networkName = event.channels && event.channels.length > 0 ? event.channels[0].name : null;

  if (isIndividualSport) {
    return (
      <div className="league-game-card individual" onClick={onClick}>
        <div className="game-card-main">
          <div className="game-card-individual-info">
            <span className="game-card-event-title">{event.title}</span>
            {event.venue && <span className="game-card-venue">{event.venue}</span>}
          </div>
        </div>

        <div className="game-card-right">
          <div className="game-card-time">
            {event.startTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: epgClockFormat !== '24h' })}
          </div>
          {networkName && <span className="game-card-network-badge-btn">{networkName}</span>}
        </div>
      </div>
    );
  }

  const homeWinning = (event.homeScore ?? 0) > (event.awayScore ?? 0);
  const awayWinning = (event.awayScore ?? 0) > (event.homeScore ?? 0);

  const awayAbbrev = (event.awayTeam as any).abbreviation || event.awayTeam.name.slice(0, 3).toUpperCase();
  const homeAbbrev = (event.homeTeam as any).abbreviation || event.homeTeam.name.slice(0, 3).toUpperCase();
  const awayRecord = (event as any).awayRecord || '0-0';
  const homeRecord = (event as any).homeRecord || '0-0';

  return (
    <div className={`league-game-card${isLive ? ' live' : ''}`} onClick={onClick}>
      <div className="game-card-teams-area">
        {/* Away Team */}
        <div className={`game-card-team away${isFinished && awayWinning ? ' winner' : ''}`}>
          {event.awayTeam.logo ? (
            <img src={event.awayTeam.logo} alt="" className="game-card-logo" />
          ) : (
            <div className="game-card-logo-placeholder">{awayAbbrev.slice(0, 3).toUpperCase()}</div>
          )}
          <div className="game-card-team-info">
            <span className="game-card-team-name">{awayAbbrev}</span>
            <span className="game-card-team-record">{awayRecord}</span>
          </div>
          <span className="game-card-score">{event.awayScore ?? 0}</span>
        </div>

        {/* Versus / Divider */}
        <div className="game-card-divider">
          {isLive ? (
            <span className="game-card-live-pill">
              <span className="live-dot" />
              {event.period || event.timeElapsed || 'LIVE'}
            </span>
          ) : (
            <span className="game-card-vs">vs</span>
          )}
        </div>

        {/* Home Team */}
        <div className={`game-card-team home${isFinished && homeWinning ? ' winner' : ''}`}>
          <span className="game-card-score">{event.homeScore ?? 0}</span>
          <div className="game-card-team-info">
            <span className="game-card-team-name">{homeAbbrev}</span>
            <span className="game-card-team-record">{homeRecord}</span>
          </div>
          {event.homeTeam.logo ? (
            <img src={event.homeTeam.logo} alt="" className="game-card-logo" />
          ) : (
            <div className="game-card-logo-placeholder">{homeAbbrev.slice(0, 3).toUpperCase()}</div>
          )}
        </div>
      </div>

      {/* Right Side: Start Time & Network Badge */}
      <div className="game-card-right">
        <span className="game-card-time">
          {formatEventTime(event.startTime, epgClockFormat !== '24h')}
        </span>
        {networkName ? (
          <button
            className="game-card-network-badge-btn"
            onClick={(e) => {
              e.stopPropagation();
              onChannelClick?.(networkName);
            }}
            title={`Search channels for ${networkName}`}
          >
            {networkName}
          </button>
        ) : (
          <span className="game-card-network-placeholder">TBD</span>
        )}
      </div>
    </div>
  );
}

function SportIcon({ sport, size = 20 }: { sport: string; size?: number }) {
  switch (sport.toLowerCase()) {
    case 'football':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22V14" />
          <path d="M5 14h14" />
          <path d="M5 14V4" />
          <path d="M19 14V4" />
        </svg>
      );
    case 'basketball':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2v20" />
          <path d="M5 5c3.5 3.5 3.5 10.5 0 14M19 5c-3.5 3.5-3.5 10.5 0 14" />
        </svg>
      );
    case 'baseball':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M6 18c2-3 2-9 0-12M18 18c-2-3-2-9 0-12" />
        </svg>
      );
    case 'hockey':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 4L6.5 17.5L4 16.5M6 4l11.5 13.5L20 16.5" />
          <ellipse cx="12" cy="18.5" rx="3" ry="1.5" fill="currentColor" />
        </svg>
      );
    case 'soccer':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="12,8 15.5,10.5 14,14.5 10,14.5 8.5,10.5" fill="currentColor" />
          <line x1="12" y1="8" x2="12" y2="2" />
          <line x1="15.5" y1="10.5" x2="21.5" y2="8.5" />
          <line x1="14" y1="14.5" x2="18" y2="20" />
          <line x1="10" y1="14.5" x2="6" y2="20" />
          <line x1="8.5" y1="10.5" x2="2.5" y2="8.5" />
        </svg>
      );
    case 'mma':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="8,3 16,3 21,8 21,16 16,21 8,21 3,16 3,8" />
          <path d="M3 8l18 8M3 16l18-8M8 3l8 18M16 3L8 21" strokeOpacity="0.3" />
          <circle cx="12" cy="12" r="3.5" fill="currentColor" />
        </svg>
      );
    case 'golf':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="3" x2="8" y2="19" />
          <path d="M8 19c-1 0-2 .5-2 1.5s1.5 1.5 2.5 1.5 1.5-1 1.5-2-.5-1-2-1z" fill="currentColor" />
          <circle cx="15" cy="19" r="1.5" fill="currentColor" />
          <path d="M5 3v10M5 3l5 2.5L5 8" fill="none" />
        </svg>
      );
    case 'tennis':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="7" r="2.5" fill="currentColor" />
          <path d="M6 18l5-5M6 18a3 3 0 1 1-4.24-4.24A3 3 0 0 1 6 18z" />
          <path d="M18 18l-5-5M18 18a3 3 0 1 0 4.24-4.24A3 3 0 0 0 18 18z" />
          <path d="M9 15l6-6" />
        </svg>
      );
    case 'racing':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 22V3" />
          <path d="M4 5c3-1.5 5 1.5 8 0s5-1.5 8 0v8c-3-1.5-5 1.5-8 0s-5-1.5-8 0z" />
          <rect x="4" y="5" width="4" height="4" fill="currentColor" stroke="none" />
          <rect x="12" y="5" width="4" height="4" fill="currentColor" stroke="none" />
          <rect x="8" y="9" width="4" height="4" fill="currentColor" stroke="none" />
          <rect x="16" y="9" width="4" height="4" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'rugby':
    case 'rugby-league':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="12" rx="10" ry="7" transform="rotate(-30 12 12)" />
          <path d="M3.5 17c5-3 12-3 17 0" transform="rotate(-30 12 12)" />
          <path d="M3.5 7c5 3 12 3 17 0" transform="rotate(-30 12 12)" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M6 4h12v8c0 3-2.5 5.5-6 5.5S6 15 6 12V4z" />
          <path d="M12 17.5v3M8 20.5h8" />
        </svg>
      );
  }
}

export function LeaguesTab({ onSearchChannels, onPlayChannel }: LeaguesTabProps) {
  const [leagues, setLeagues] = useState<SportsLeague[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<SportsLeague | null>(null);
  const [leagueEvents, setLeagueEvents] = useState<SportsEvent[]>([]);
  const [leagueTeams, setLeagueTeams] = useState<SportsTeam[]>([]);
  const [leagueStandings, setLeagueStandings] = useState<StandingTeam[]>([]);
  const [leagueStandingsGroups, setLeagueStandingsGroups] = useState<StandingGroup[]>([]);
  const [golfRankings, setGolfRankings] = useState<GolfRanking[]>([]);
  const [tennisRankings, setTennisRankings] = useState<TennisRanking[]>([]);
  const [racingStandings, setRacingStandings] = useState<RacingStanding[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<LeagueView>('teams');
  const [selectedTeam, setSelectedTeam] = useState<SportsTeam | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SportsEvent | null>(null);
  const [activeSport, setActiveSport] = useState<string>('');
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<Date | null>(null);
  const [teamSearchQuery, setTeamSearchQuery] = useState<string>('');

  const favorites = useSportsFavoritesStore((s) => s.favorites);
  const addFavorite = useSportsFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useSportsFavoritesStore((s) => s.removeFavorite);

  const isUFC = selectedLeague?.id === 'ufc';
  const isGolf = selectedLeague?.id === 'pga' || selectedLeague?.id === 'lpga';
  const isTennis = selectedLeague?.id === 'atp' || selectedLeague?.id === 'wta';
  const isRacing = selectedLeague?.id === 'f1' || selectedLeague?.id === 'nascar' || selectedLeague?.id === 'indycar';
  const isIndividualSport = selectedLeague ? INDIVIDUAL_SPORTS.includes(selectedLeague.id) : false;

  const { enabledLeagues, loaded, loadSettings } = useSportsSettingsStore();

  useEffect(() => {
    if (!loaded) {
      loadSettings();
    }
  }, [loaded, loadSettings]);

  useEffect(() => {
    const allLeagues = getAvailableLeagues();
    if (loaded) {
      setLeagues(allLeagues.filter(l => enabledLeagues.includes(l.id)));
    } else {
      setLeagues(allLeagues);
    }
  }, [loaded, enabledLeagues]);

  useEffect(() => {
    if (leagues.length > 0 && (!activeSport || !leagues.some(l => l.sport === activeSport))) {
      setActiveSport(leagues[0].sport || 'football');
    }
  }, [leagues, activeSport]);

  useEffect(() => {
    if (selectedLeague) {
      setLoading(true);
      setSelectedScheduleDate(null);
      setTeamSearchQuery('');
      // For individual sports, default to schedule (events)
      setActiveView(isIndividualSport ? 'schedule' : 'teams');
      
      if (isIndividualSport) {
        // Load events for individual sports
        getLeagueEvents(selectedLeague.id)
          .then(setLeagueEvents)
          .finally(() => setLoading(false));
      } else {
        getLeagueTeams(selectedLeague.id)
          .then(setLeagueTeams)
          .finally(() => setLoading(false));
      }
    }
  }, [selectedLeague, isIndividualSport]);

  const handleDateChange = useCallback((date: Date | null) => {
    if (!selectedLeague) return;
    setSelectedScheduleDate(date);
    setLoading(true);

    getLeagueEvents(selectedLeague.id, date || undefined)
      .then(setLeagueEvents)
      .finally(() => setLoading(false));
  }, [selectedLeague]);

  const handleViewChange = useCallback((view: LeagueView) => {
    if (!selectedLeague) return;
    setActiveView(view);

    if (view === 'schedule' && leagueEvents.length === 0) {
      setLoading(true);
      getLeagueEvents(selectedLeague.id, selectedScheduleDate || undefined)
        .then(setLeagueEvents)
        .finally(() => setLoading(false));
    } else if (view === 'standings') {
      if (isGolf && golfRankings.length === 0) {
        setLoading(true);
        getGolfRankings(selectedLeague.id as any)
          .then(setGolfRankings)
          .finally(() => setLoading(false));
      } else if (isTennis && tennisRankings.length === 0) {
        setLoading(true);
        getTennisRankings(selectedLeague.id as any)
          .then(setTennisRankings)
          .finally(() => setLoading(false));
      } else if (isRacing && racingStandings.length === 0) {
        setLoading(true);
        getRacingStandings(selectedLeague.id as any)
          .then(setRacingStandings)
          .finally(() => setLoading(false));
      } else if (!isIndividualSport && leagueStandings.length === 0 && leagueStandingsGroups.length === 0) {
        setLoading(true);
        getLeagueStandingsGrouped(selectedLeague.id)
          .then((groups) => {
            setLeagueStandingsGroups(groups);
            setLeagueStandings(groups.flatMap(g => g.teams));
          })
          .finally(() => setLoading(false));
      }
    }
  }, [selectedLeague, leagueEvents.length, leagueStandings.length, leagueStandingsGroups.length, golfRankings.length, tennisRankings.length, racingStandings.length, isGolf, isTennis, isRacing, isIndividualSport, selectedScheduleDate]);

  const filteredTeams = useMemo(() => {
    if (!teamSearchQuery.trim()) return leagueTeams;
    const q = teamSearchQuery.toLowerCase();
    return leagueTeams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.shortName?.toLowerCase().includes(q) ||
        (t as any).abbreviation?.toLowerCase().includes(q) ||
        (t as any).location?.toLowerCase().includes(q)
    );
  }, [leagueTeams, teamSearchQuery]);

  const teamGroups = useMemo(() => {
    return groupTeamsByDivision(filteredTeams, selectedLeague?.id);
  }, [filteredTeams, selectedLeague]);

  const leaguesBySport = useMemo(() => {
    const grouped = leagues.reduce((acc, league) => {
      const sport = league.sport || 'Other';
      if (!acc[sport]) acc[sport] = [];
      acc[sport].push(league);
      return acc;
    }, {} as Record<string, SportsLeague[]>);

    const sportOrder = ['football', 'basketball', 'baseball', 'hockey', 'soccer'];
    const sortedSports = Object.keys(grouped).sort((a, b) => {
      const aIdx = sportOrder.indexOf(a);
      const bIdx = sportOrder.indexOf(b);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });

    return { grouped, sortedSports };
  }, [leagues]);

  const handleChannelClick = (channelName: string) => {
    if (onSearchChannels) {
      onSearchChannels(channelName);
    }
  };

  if (selectedTeam) {
    return (
      <TeamDetail
        team={selectedTeam}
        onClose={() => setSelectedTeam(null)}
        onChannelClick={handleChannelClick}
        onPlayChannel={onPlayChannel}
      />
    );
  }

  if (selectedEvent) {
    return (
      <GameDetail
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onChannelClick={handleChannelClick}
        onPlayChannel={onPlayChannel}
      />
    );
  }

  return (
    <div className="sports-tab-content">
      {!selectedLeague ? (
        <div className="sports-leagues-layout">
          {/* Left Sidebar: Sport Tabs */}
          <div className="sports-leagues-sidebar">
            {leaguesBySport.sortedSports.map((sport) => {
              const count = leaguesBySport.grouped[sport]?.length || 0;
              const isActive = activeSport === sport;
              return (
                <button
                  key={sport}
                  className={`sports-leagues-sidebar-item${isActive ? ' active' : ''}`}
                  onClick={() => setActiveSport(sport)}
                >
                  <div
                    className="sports-leagues-sidebar-icon"
                    style={{ background: getSportGradient(sport) }}
                  >
                    <SportIcon sport={sport} size={16} />
                  </div>
                  <span className="sports-leagues-sidebar-name">{getSportDisplayName(sport)}</span>
                  <span className="sports-leagues-sidebar-badge">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Right Panel: Leagues Grid */}
          <div className="sports-leagues-content">
            <div className="sports-leagues-content-header">
              <div
                className="sports-leagues-content-icon"
                style={{ background: getSportGradient(activeSport) }}
              >
                <SportIcon sport={activeSport} size={24} />
              </div>
              <div>
                <h3 className="sports-leagues-content-title">{getSportDisplayName(activeSport)}</h3>
                <p className="sports-leagues-content-subtitle">
                  {(leaguesBySport.grouped[activeSport] || []).length}{' '}
                  {(leaguesBySport.grouped[activeSport] || []).length === 1 ? 'league' : 'leagues'} available
                </p>
              </div>
            </div>

            <div className="sports-leagues-grid-layout">
              {(leaguesBySport.grouped[activeSport] || []).map((league) => (
                <button
                  key={league.id}
                  className="sports-leagues-item-btn"
                  onClick={() => setSelectedLeague(league)}
                >
                  <div className="sports-leagues-item-info">
                    <span className="sports-leagues-name">{league.name}</span>
                    <span className="sports-leagues-sub">
                      {league.country || getSportDisplayName(league.sport)}
                    </span>
                  </div>
                  <svg
                    className="sports-leagues-chevron"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="sports-league-detail-view">
          <div className="sports-league-header">
            <button
              className="sports-back-link"
              onClick={() => {
                setSelectedLeague(null);
                setLeagueEvents([]);
                setLeagueTeams([]);
                setLeagueStandings([]);
                setLeagueStandingsGroups([]);
                setGolfRankings([]);
                setTennisRankings([]);
                setRacingStandings([]);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to All Leagues
            </button>

            <div className="sports-league-info">
              <div
                className="sports-leagues-content-icon"
                style={{ background: getSportGradient(selectedLeague.sport), width: 52, height: 52 }}
              >
                <SportIcon sport={selectedLeague.sport} size={28} />
              </div>
              <div>
                <h2 className="sports-league-detail-name">{selectedLeague.name}</h2>
                <span className="sports-league-detail-country">
                  {selectedLeague.country || getSportDisplayName(selectedLeague.sport)}
                </span>
              </div>
            </div>

            <div className="sports-league-nav" style={{ marginTop: 20 }}>
              {!isIndividualSport && (
                <button
                  className={`sports-league-nav-btn ${activeView === 'teams' ? 'active' : ''}`}
                  onClick={() => handleViewChange('teams')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Teams
                </button>
              )}
              <button
                className={`sports-league-nav-btn ${activeView === 'schedule' ? 'active' : ''}`}
                onClick={() => handleViewChange('schedule')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {isIndividualSport ? 'Schedule' : 'Games'}
              </button>
              {!isUFC && (
                <button
                  className={`sports-league-nav-btn ${activeView === 'standings' ? 'active' : ''}`}
                  onClick={() => handleViewChange('standings')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  {isIndividualSport ? 'Rankings' : 'Standings'}
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="sports-loading">
              <div className="sports-spinner" />
              <span>Loading...</span>
            </div>
          ) : (
            <>
              {activeView === 'teams' && (
                <section className="sports-section">
                  <div className="league-teams-top-bar">
                    <div className="league-teams-search-box">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        className="league-teams-search-input"
                        placeholder="Search teams by name or location..."
                        value={teamSearchQuery}
                        onChange={(e) => setTeamSearchQuery(e.target.value)}
                      />
                      {teamSearchQuery && (
                        <button className="league-teams-search-clear" onClick={() => setTeamSearchQuery('')}>
                          ✕
                        </button>
                      )}
                    </div>
                    <span className="league-teams-count-badge">
                      {filteredTeams.length} {filteredTeams.length === 1 ? 'team' : 'teams'}
                    </span>
                  </div>

                  {Array.from(teamGroups.entries()).map(([divName, divTeams]) => (
                    <div key={divName} className="league-division-group">
                      <h4 className="league-division-title">{divName}</h4>
                      <div className="sports-teams-grid-v2">
                        {divTeams.map((team) => {
                          const teamAny = team as any;
                          const isFav = favorites.some((f) => f.id === team.id);
                          const primaryColor = teamAny.color ? `#${teamAny.color.replace('#', '')}` : '#6366f1';

                          return (
                            <div
                              key={team.id}
                              className={`sports-team-card-v2${isFav ? ' favorite' : ''}`}
                              style={{ borderLeftColor: primaryColor }}
                              onClick={() => setSelectedTeam(team)}
                            >
                              <div className="team-card-v2-main">
                                {team.logo ? (
                                  <img src={team.logo} alt={team.name} className="sports-team-card-logo" />
                                ) : (
                                  <div className="sports-team-card-logo-placeholder" style={{ backgroundColor: primaryColor }}>
                                    {(teamAny.abbreviation || team.name.slice(0, 3)).toUpperCase()}
                                  </div>
                                )}
                                <div className="sports-team-card-info">
                                  <span className="sports-team-card-name">{team.name}</span>
                                  {teamAny.standingSummary ? (
                                    <span className="sports-team-card-sub">{teamAny.standingSummary}</span>
                                  ) : team.shortName ? (
                                    <span className="sports-team-card-sub">{team.shortName}</span>
                                  ) : null}
                                </div>
                              </div>

                              <button
                                className={`sports-team-card-star${isFav ? ' active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isFav) {
                                    removeFavorite(team.id);
                                  } else {
                                    addFavorite({
                                      id: team.id,
                                      name: team.name,
                                      shortName: team.shortName,
                                      location: teamAny.location,
                                      abbreviation: teamAny.abbreviation,
                                      color: teamAny.color,
                                      alternateColor: teamAny.alternateColor,
                                      logo: team.logo,
                                      leagueId: selectedLeague.id,
                                    } as any);
                                  }
                                }}
                                title={isFav ? 'Remove from favorite teams' : 'Add to favorite teams'}
                              >
                                ★
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {activeView === 'schedule' && (
                <section className="sports-section">
                  <HorizontalDateRail
                    selectedDate={selectedScheduleDate || new Date()}
                    onSelectDate={(d) => handleDateChange(d)}
                  />

                  {leagueEvents.length > 0 ? (
                    <div className="league-game-cards-list">
                      {leagueEvents.slice(0, 50).map((event) => (
                        <LeagueGameCard
                          key={event.id}
                          event={event}
                          isIndividualSport={isIndividualSport}
                          onChannelClick={handleChannelClick}
                          onClick={() => setSelectedEvent(event)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="sports-empty">
                      <p>No games or events scheduled for this date</p>
                    </div>
                  )}
                </section>
              )}

              {activeView === 'standings' && !isIndividualSport && (
                <section className="sports-section">
                  <h3 className="sports-section-title">Standings</h3>
                  {(() => {
                    const activeGroups = leagueStandingsGroups.length > 0 ? leagueStandingsGroups : [];
                    const isPreseason = activeGroups.every((g) => g.teams.every((t) => t.wins === 0 && t.losses === 0)) ||
                      (leagueStandings.length > 0 && leagueStandings.every((t) => t.wins === 0 && t.losses === 0));

                    return (
                      <>
                        {isPreseason && (
                          <div className="standings-preseason-banner">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="16" x2="12" y2="12" />
                              <circle cx="12" cy="8" r="0.5" fill="currentColor" />
                            </svg>
                            <span>Preseason / Offseason — Official standings will update as games count</span>
                          </div>
                        )}

                        {activeGroups.length > 0 ? (
                          <div className="sports-standings-groups">
                            {activeGroups.map((group) => (
                              <div key={group.name} className="sports-standings-group">
                                <h4 className="sports-standings-conference">{group.name}</h4>
                                <div className="sports-standings-table">
                                  <div className="sports-standings-header">
                                    <span>#</span>
                                    <span>Team</span>
                                    <span>W</span>
                                    <span>L</span>
                                    <span>PCT</span>
                                  </div>
                                  {group.teams.map((team, idx) => (
                                    <div key={team.id} className={`sports-standings-row${idx === 0 || team.rank === 1 ? ' leader-row' : ''}`}>
                                      <span>{team.rank}</span>
                                      <button
                                        className="sports-standings-team"
                                        onClick={() => setSelectedTeam({ id: team.id, name: team.name, shortName: team.shortName, logo: team.logo, leagueId: selectedLeague.id })}
                                      >
                                        {team.logo && (
                                          <img src={team.logo} alt="" className="sports-standings-logo" />
                                        )}
                                        {team.name}
                                      </button>
                                      <span>{team.wins}</span>
                                      <span>{team.losses}</span>
                                      <span>{team.winPercent}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : leagueStandings.length > 0 ? (
                          <div className="sports-standings-table">
                            <div className="sports-standings-header">
                              <span>#</span>
                              <span>Team</span>
                              <span>W</span>
                              <span>L</span>
                              <span>PCT</span>
                            </div>
                            {leagueStandings.map((team, idx) => (
                              <div key={team.id} className={`sports-standings-row${idx === 0 ? ' leader-row' : ''}`}>
                                <span>{idx + 1}</span>
                                <button
                                  className="sports-standings-team"
                                  onClick={() => setSelectedTeam({ id: team.id, name: team.name, shortName: team.shortName, logo: team.logo, leagueId: selectedLeague.id })}
                                >
                                  {team.logo && (
                                    <img src={team.logo} alt="" className="sports-standings-logo" />
                                  )}
                                  {team.name}
                                </button>
                                <span>{team.wins}</span>
                                <span>{team.losses}</span>
                                <span>{team.winPercent}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="sports-empty">
                            <p>Standings not available</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default LeaguesTab;
