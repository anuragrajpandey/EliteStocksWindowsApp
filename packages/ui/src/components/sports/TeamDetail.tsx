import { useState, useEffect, useCallback } from 'react';
import type { SportsEvent, SportsTeam } from '@ynotv/core';
import { 
  getTeamSchedule, 
  getTeamDetails, 
  getTeamDepthChart,
  getTeamInjuries,
  getTeamLeaders,
  getTeamNews,
  formatEventTime, 
  formatEventDate,
  type TeamDetails,
  type TeamAthlete,
  type DepthChartGroup,
  type DepthChartPosition,
  type DepthChartAthlete,
  type TeamInjury,
  type TeamLeaderCategory,
  type TeamLeader,
  type TeamNewsArticle,
} from '../../services/sports';
import { useAddFavorite, useRemoveFavorite, useIsFavorite } from '../../stores/sportsFavoritesStore';
import { GameDetail } from './GameDetail';
import { AthleteDetailModal } from './AthleteDetailModal';

interface TeamDetailProps {
  team: SportsTeam;
  onClose: () => void;
  onChannelClick?: (channelName: string) => void;
  onPlayChannel?: (channel: import('../../db').StoredChannel) => void;
}

type TabId = 'schedule' | 'roster' | 'depth' | 'injuries' | 'leaders' | 'news';

export function TeamDetail({ team, onClose, onChannelClick, onPlayChannel }: TeamDetailProps) {
  const [details, setDetails] = useState<TeamDetails | null>(null);
  const [upcoming, setUpcoming] = useState<SportsEvent[]>([]);
  const [past, setPast] = useState<SportsEvent[]>([]);
  const [depthChart, setDepthChart] = useState<DepthChartGroup[]>([]);
  const [injuries, setInjuries] = useState<TeamInjury[]>([]);
  const [leaders, setLeaders] = useState<TeamLeaderCategory[]>([]);
  const [news, setNews] = useState<TeamNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SportsEvent | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('schedule');

  const isFavorite = useIsFavorite(team.id);
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  useEffect(() => {
    setLoading(true);
    const leagueId = team.leagueId || 'nfl';
    
    Promise.all([
      getTeamDetails(team.id, leagueId),
      getTeamSchedule(team.id, leagueId),
      getTeamDepthChart(team.id, leagueId),
      getTeamInjuries(team.id, leagueId),
      getTeamLeaders(team.id, leagueId),
      getTeamNews(team.id, leagueId),
    ])
      .then(([detailsResult, scheduleResult, depthRes, injRes, leadersRes, newsRes]) => {
        setDetails(detailsResult);
        setUpcoming(scheduleResult.upcoming);
        setPast(scheduleResult.past);
        setDepthChart(depthRes);
        setInjuries(injRes);
        setLeaders(leadersRes);
        setNews(newsRes);
      })
      .finally(() => setLoading(false));
  }, [team.id, team.leagueId]);

  const handleToggleFavorite = useCallback(() => {
    if (isFavorite) {
      removeFavorite(team.id);
    } else {
      addFavorite(team);
    }
  }, [isFavorite, team, addFavorite, removeFavorite]);

  const teamColor = details?.color || '00338d';
  const teamColorStyle = `#${teamColor}`;

  if (selectedEvent) {
    return (
      <GameDetail
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onChannelClick={onChannelClick}
        onPlayChannel={onPlayChannel}
      />
    );
  }

  return (
    <div className="sports-tab-content">
      <button className="sports-back-link" onClick={onClose}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {loading ? (
        <div className="sports-loading">
          <div className="sports-spinner" />
          <span>Loading team info...</span>
        </div>
      ) : (
        <>
          <div className="team-header" style={{ '--team-color': teamColorStyle } as React.CSSProperties}>
            <div className="team-header-banner" style={{ background: `linear-gradient(135deg, #${details?.color || '333'} 0%, #${details?.alternateColor || '111'} 100%)` }}>
              <div className="team-header-content">
                {details?.logo && (
                  <img 
                    src={details.logo} 
                    alt={details.name} 
                    className="team-header-logo"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                <div className="team-header-info">
                  <span className="team-header-location">{details?.location}</span>
                  <h1 className="team-header-name">{details?.name || team.name}</h1>
                  {details?.standingSummary && (
                    <span className="team-header-standing">{details.standingSummary}</span>
                  )}
                </div>
                <button
                  className={`team-favorite-btn ${isFavorite ? 'is-favorite' : ''}`}
                  onClick={handleToggleFavorite}
                  title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {details?.record && (
            <div className="team-record-section">
              <div className="team-record-cards">
                <div className="team-record-card overall">
                  <span className="team-record-label">Overall</span>
                  <span className="team-record-value">{details.record.overall}</span>
                  {details.record.winPercent !== undefined && (
                    <span className="team-record-percent">
                      {(details.record.winPercent * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="team-record-card home">
                  <span className="team-record-label">Home</span>
                  <span className="team-record-value">{details.record.home}</span>
                </div>
                <div className="team-record-card away">
                  <span className="team-record-label">Away</span>
                  <span className="team-record-value">{details.record.away}</span>
                </div>
              </div>

              {Boolean(details.record.pointsFor || details.record.pointsAgainst) && (
                <div className="team-stats-row">
                  <div className="team-stat-item">
                    <span className="team-stat-value">{details.record.pointsFor || 0}</span>
                    <span className="team-stat-label">Points For</span>
                  </div>
                  <div className="team-stat-divider">
                    <span className={details.record.pointDifferential && details.record.pointDifferential > 0 ? 'positive' : 'negative'}>
                      {details.record.pointDifferential && details.record.pointDifferential > 0 ? '+' : ''}{details.record.pointDifferential || 0}
                    </span>
                    <span className="team-stat-label">Diff</span>
                  </div>
                  <div className="team-stat-item">
                    <span className="team-stat-value">{details.record.pointsAgainst || 0}</span>
                    <span className="team-stat-label">Points Against</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {(() => {
            const nextGame = (upcoming && upcoming.length > 0)
              ? upcoming[0]
              : (details?.nextEvent && new Date(details.nextEvent.startTime) >= new Date())
                ? details.nextEvent
                : undefined;

            if (!nextGame) return null;

            return (
              <div className="team-next-game" onClick={() => setSelectedEvent(nextGame)}>
                <span className="team-next-label">Next Game</span>
                <div className="team-next-content">
                  <span className="team-next-opponent">
                    {nextGame.homeTeam.id === team.id ? 'vs ' : '@ '}
                    {nextGame.homeTeam.id === team.id 
                      ? nextGame.awayTeam.name 
                      : nextGame.homeTeam.name}
                  </span>
                  <span className="team-next-date">
                    {formatEventDate(nextGame.startTime)} at {formatEventTime(nextGame.startTime)}
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="team-tabs">
            <button 
              className={`team-tab ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              Schedule ({upcoming.length + past.length})
            </button>
            <button 
              className={`team-tab ${activeTab === 'roster' ? 'active' : ''}`}
              onClick={() => setActiveTab('roster')}
            >
              Roster ({details?.athletes.length || 0})
            </button>
            {depthChart.length > 0 && (
              <button 
                className={`team-tab ${activeTab === 'depth' ? 'active' : ''}`}
                onClick={() => setActiveTab('depth')}
              >
                Depth Chart
              </button>
            )}
            {injuries.length > 0 && (
              <button 
                className={`team-tab ${activeTab === 'injuries' ? 'active' : ''}`}
                onClick={() => setActiveTab('injuries')}
              >
                Injuries ({injuries.length})
              </button>
            )}
            {leaders.length > 0 && (
              <button 
                className={`team-tab ${activeTab === 'leaders' ? 'active' : ''}`}
                onClick={() => setActiveTab('leaders')}
              >
                Leaders
              </button>
            )}
            {news.length > 0 && (
              <button 
                className={`team-tab ${activeTab === 'news' ? 'active' : ''}`}
                onClick={() => setActiveTab('news')}
              >
                News ({news.length})
              </button>
            )}
          </div>

          <div className="team-tab-content">
            {activeTab === 'schedule' && (
              <>
                {upcoming.length > 0 && (
                  <section className="sports-section">
                    <h3 className="sports-section-title">Upcoming ({upcoming.length})</h3>
                    <div className="team-schedule-grid">
                      {upcoming.map(event => (
                        <TeamEventCard
                          key={event.id}
                          event={event}
                          teamId={team.id}
                          onClick={() => setSelectedEvent(event)}
                          onChannelClick={onChannelClick}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {past.length > 0 && (
                  <section className="sports-section">
                    <h3 className="sports-section-title">Results ({past.length})</h3>
                    <div className="team-schedule-grid">
                      {past.slice(0, 10).map(event => (
                        <TeamEventCard
                          key={event.id}
                          event={event}
                          teamId={team.id}
                          onClick={() => setSelectedEvent(event)}
                          onChannelClick={onChannelClick}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {upcoming.length === 0 && past.length === 0 && (
                  <div className="sports-empty">
                    <p>No schedule available.</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'roster' && (
              <TeamRoster
                athletes={details?.athletes || []}
                onAthleteClick={(id) => setSelectedAthleteId(id)}
              />
            )}

            {activeTab === 'depth' && (
              <TeamDepthChart
                depthChart={depthChart}
                onAthleteClick={(id) => setSelectedAthleteId(id)}
              />
            )}

            {activeTab === 'injuries' && (
              <TeamInjuries
                injuries={injuries}
                onAthleteClick={(id) => setSelectedAthleteId(id)}
              />
            )}

            {activeTab === 'leaders' && (
              <TeamLeaders
                leaders={leaders}
                onAthleteClick={(id) => setSelectedAthleteId(id)}
              />
            )}

            {activeTab === 'news' && (
              <TeamNews news={news} />
            )}
          </div>
        </>
      )}

      {selectedAthleteId && (
        <AthleteDetailModal
          athleteId={selectedAthleteId}
          leagueId={team.leagueId || 'nfl'}
          onClose={() => setSelectedAthleteId(null)}
        />
      )}
    </div>
  );
}

interface TeamEventCardProps {
  event: SportsEvent;
  teamId: string;
  onClick: () => void;
  onChannelClick?: (channelName: string) => void;
}

function TeamEventCard({ event, teamId, onClick, onChannelClick }: TeamEventCardProps) {
  const isHome = event.homeTeam.id === teamId;
  const opponent = isHome ? event.awayTeam : event.homeTeam;
  const teamScore = isHome ? event.homeScore : event.awayScore;
  const opponentScore = isHome ? event.awayScore : event.homeScore;
  const isPast = event.startTime.getTime() < Date.now();
  const isLive = event.status === 'live';

  const getResultClass = () => {
    if (teamScore === undefined || opponentScore === undefined) return '';
    if (teamScore > opponentScore) return 'win';
    if (teamScore < opponentScore) return 'loss';
    return 'draw';
  };

  return (
    <div className="team-schedule-card" onClick={onClick}>
      <div className="team-schedule-card-header">
        <span className="team-schedule-card-date">
          {event.startTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <span className="team-schedule-card-time">
          {event.startTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </span>
        {isLive && <span className="team-schedule-live">LIVE</span>}
      </div>
      
      <div className="team-schedule-card-match">
        <div className="team-schedule-card-opponent">
          {opponent.logo && (
            <img src={opponent.logo} alt="" className="team-schedule-card-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          )}
          <div className="team-schedule-card-opponent-info">
            <span className="team-schedule-card-vs">{isHome ? 'vs' : '@'}</span>
            <span className="team-schedule-card-opponent-name">{opponent.shortName || opponent.name}</span>
          </div>
        </div>
        
        {isPast && teamScore !== undefined && opponentScore !== undefined && (
          <div className={`team-schedule-card-score ${getResultClass()}`}>
            <span className="team-schedule-card-score-team">{teamScore}</span>
            <span className="team-schedule-card-score-sep">-</span>
            <span className="team-schedule-card-score-opp">{opponentScore}</span>
          </div>
        )}
      </div>
      
      <div className="team-schedule-card-footer">
        {isPast && teamScore !== undefined && opponentScore !== undefined && (
          <span className={`team-schedule-card-result ${getResultClass()}`}>
            {teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'T'}
          </span>
        )}
        {event.channels.length > 0 && (
          <button
            className="team-schedule-card-channel"
            onClick={(e) => {
              e.stopPropagation();
              onChannelClick?.(event.channels[0].name);
            }}
          >
            {event.channels[0].name}
          </button>
        )}
      </div>
    </div>
  );
}

interface TeamRosterProps {
  athletes: TeamAthlete[];
  onAthleteClick?: (athleteId: string) => void;
}

function TeamRoster({ athletes, onAthleteClick }: TeamRosterProps) {
  const [selectedPosition, setSelectedPosition] = useState<string>('all');

  const positions = [...new Set(athletes.map(a => a.position))].sort();
  
  const filteredAthletes = selectedPosition === 'all' 
    ? athletes 
    : athletes.filter(a => a.position === selectedPosition);

  const groupedByPosition = filteredAthletes.reduce((acc, athlete) => {
    if (!acc[athlete.position]) acc[athlete.position] = [];
    acc[athlete.position].push(athlete);
    return acc;
  }, {} as Record<string, TeamAthlete[]>);

  const positionOrder = [
    'Quarterback', 'Running Back', 'Wide Receiver', 'Tight End', 'Fullback',
    'Offensive Tackle', 'Guard', 'Center',
    'Defensive End', 'Defensive Tackle', 'Linebacker', 'Cornerback', 'Safety',
    'Place Kicker', 'Punter', 'Long Snapper',
    'Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center',
    'Goalkeeper', 'Defender', 'Midfielder', 'Forward',
  ];

  const sortedPositions = Object.keys(groupedByPosition).sort((a, b) => {
    const aIdx = positionOrder.indexOf(a);
    const bIdx = positionOrder.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  if (athletes.length === 0) {
    return (
      <div className="sports-empty">
        <p>No roster information available.</p>
      </div>
    );
  }

  return (
    <div className="team-roster">
      <div className="team-roster-filters">
        <select 
          value={selectedPosition} 
          onChange={(e) => setSelectedPosition(e.target.value)}
          className="team-roster-select"
        >
          <option value="all">All Positions ({athletes.length})</option>
          {positions.map(pos => (
            <option key={pos} value={pos}>{pos} ({athletes.filter(a => a.position === pos).length})</option>
          ))}
        </select>
      </div>

      {sortedPositions.map(position => (
        <div key={position} className="team-roster-group">
          <h4 className="team-roster-group-title">{position}</h4>
          <div className="team-roster-list">
            {groupedByPosition[position].map(athlete => (
              <div
                key={athlete.id}
                className="team-roster-player clickable"
                onClick={() => onAthleteClick?.(athlete.id)}
              >
                {athlete.headshot && (
                  <img 
                    src={athlete.headshot} 
                    alt={athlete.name} 
                    className="team-roster-headshot"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                <div className="team-roster-player-info">
                  {athlete.jersey && (
                    <span className="team-roster-jersey">#{athlete.jersey}</span>
                  )}
                  <span className="team-roster-name">{athlete.name}</span>
                  <div className="team-roster-details">
                    {athlete.experience && <span>{athlete.experience}</span>}
                    {athlete.experience && athlete.college && <span> • </span>}
                    {athlete.college && <span>{athlete.college}</span>}
                  </div>
                </div>
                <div className="team-roster-physical">
                  {athlete.height && <span>{athlete.height}</span>}
                  {athlete.height && athlete.weight && <span> / </span>}
                  {athlete.weight && <span>{athlete.weight}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamDepthChart({
  depthChart,
  onAthleteClick,
}: {
  depthChart: DepthChartGroup[];
  onAthleteClick: (athleteId: string) => void;
}) {
  const [activeGroup, setActiveGroup] = useState<string>(depthChart[0]?.id || '');

  const currentGroup = depthChart.find(g => g.id === activeGroup) || depthChart[0];

  if (!currentGroup) return null;

  return (
    <div className="team-depth-chart">
      {depthChart.length > 1 && (
        <div className="team-depth-pills">
          {depthChart.map(g => (
            <button
              key={g.id}
              className={`sports-standings-pill ${currentGroup.id === g.id ? 'active' : ''}`}
              onClick={() => setActiveGroup(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      <div className="team-depth-grid">
        {currentGroup.positions.map((pos: DepthChartPosition) => (
          <div key={pos.name} className="team-depth-pos-card">
            <div className="team-depth-pos-header">
              <span className="team-depth-pos-title">{pos.displayName}</span>
              <span className="team-depth-pos-abbrev">{pos.abbreviation}</span>
            </div>
            <div className="team-depth-players">
              {pos.athletes.map((ath: DepthChartAthlete) => (
                <button
                  key={ath.id}
                  className="team-depth-player-btn"
                  onClick={() => onAthleteClick(ath.id)}
                >
                  <span className={`team-depth-rank ${ath.rank === 1 ? 'starter' : ''}`}>
                    {ath.rank === 1 ? 'STARTER' : `#${ath.rank}`}
                  </span>
                  {ath.headshot && (
                    <img src={ath.headshot} alt="" className="team-depth-avatar" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  )}
                  <span className="team-depth-player-name">{ath.name}</span>
                  {ath.jersey && <span className="team-depth-player-jersey">#{ath.jersey}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamInjuries({
  injuries,
  onAthleteClick,
}: {
  injuries: TeamInjury[];
  onAthleteClick: (athleteId: string) => void;
}) {
  return (
    <div className="team-injuries-list">
      {injuries.map(inj => (
        <div
          key={inj.id}
          className="team-injury-card clickable"
          onClick={() => onAthleteClick(inj.athleteId)}
        >
          {inj.headshot && (
            <img src={inj.headshot} alt="" className="team-injury-headshot" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          )}
          <div className="team-injury-info">
            <div className="team-injury-header-line">
              <span className="team-injury-name">{inj.athleteName}</span>
              {inj.jersey && <span className="team-injury-jersey">#{inj.jersey}</span>}
              {inj.position && <span className="team-injury-pos">{inj.position}</span>}
              <span className={`team-injury-badge ${inj.status.toLowerCase().replace(/[^a-z]/g, '')}`}>
                {inj.status}
              </span>
            </div>
            {inj.location && (
              <span className="team-injury-details">
                Injury: {inj.location} {inj.type ? `(${inj.type})` : ''} {inj.returnDate ? `• Return Date: ${inj.returnDate}` : ''}
              </span>
            )}
            {inj.comment && (
              <p className="team-injury-comment">{inj.comment}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamLeaders({
  leaders,
  onAthleteClick,
}: {
  leaders: TeamLeaderCategory[];
  onAthleteClick: (athleteId: string) => void;
}) {
  return (
    <div className="team-leaders-grid">
      {leaders.map(cat => (
        <div key={cat.name} className="team-leader-card">
          <h4 className="team-leader-title">{cat.displayName}</h4>
          <div className="team-leader-players">
            {cat.leaders.slice(0, 3).map((l: TeamLeader, idx: number) => (
              <button
                key={l.athleteId + idx}
                className="team-leader-player-row"
                onClick={() => onAthleteClick(l.athleteId)}
              >
                <span className="team-leader-rank">#{idx + 1}</span>
                {l.headshot && (
                  <img src={l.headshot} alt="" className="team-leader-avatar" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                )}
                <div className="team-leader-player-info">
                  <span className="team-leader-name">{l.name}</span>
                  {l.position && <span className="team-leader-pos">{l.position}</span>}
                </div>
                <span className="team-leader-val">{l.valueDisplay}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamNews({ news }: { news: TeamNewsArticle[] }) {
  return (
    <div className="team-news-grid">
      {news.map(art => (
        <a
          key={art.id}
          href={art.link}
          target="_blank"
          rel="noopener noreferrer"
          className="team-news-card"
        >
          {art.imageUrl && (
            <img src={art.imageUrl} alt="" className="team-news-thumb" />
          )}
          <div className="team-news-content">
            <h4 className="team-news-headline">{art.headline}</h4>
            {art.description && (
              <p className="team-news-desc">{art.description}</p>
            )}
            {art.published && (
              <span className="team-news-date">
                {new Date(art.published).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}

export default TeamDetail;

