import { useState, useEffect, useCallback } from 'react';
import type { SportsTeam } from '@ynotv/core';
import {
  getLeagueLeaders,
  type LeadersCategory,
} from '../../services/sports';
import { TeamDetail } from './TeamDetail';
import { AthleteDetailModal } from './AthleteDetailModal';
import './LoadingSkeleton.css';

interface LeadersTabProps {
  onSearchChannels?: (channelName: string) => void;
  onPlayChannel?: (channel: import('../../db').StoredChannel) => void;
}

const LEADERS_LEAGUES = [
  { id: 'nfl', name: 'NFL' },
  { id: 'nba', name: 'NBA' },
  { id: 'mlb', name: 'MLB' },
  { id: 'nhl', name: 'NHL' },
];

export function LeadersTab({ onSearchChannels, onPlayChannel }: LeadersTabProps) {
  const [leaders, setLeaders] = useState<LeadersCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string>('nfl');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<SportsTeam | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  const loadLeaders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLeagueLeaders(selectedLeague);
      setLeaders(data);
      if (data.length > 0) {
        setSelectedCategory(data[0].name);
      }
    } catch (err) {
      console.error('[LeadersTab] Failed to load:', err);
      setError('Failed to load leaders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedLeague]);

  useEffect(() => {
    loadLeaders();
  }, [loadLeaders]);

  if (selectedTeam) {
    return (
      <TeamDetail
        team={selectedTeam}
        onClose={() => setSelectedTeam(null)}
        onChannelClick={onSearchChannels}
        onPlayChannel={onPlayChannel}
        fromTab="Leaders"
      />
    );
  }

  if (loading && leaders.length === 0) {
    return (
      <div className="sports-tab-content">
        <div className="leaders-header">
          <h2>Stat Leaders</h2>
          <div className="leaders-league-tabs">
            {LEADERS_LEAGUES.map(league => (
              <button
                key={league.id}
                className={`leaders-league-tab ${selectedLeague === league.id ? 'active' : ''}`}
                onClick={() => setSelectedLeague(league.id)}
              >
                {league.name}
              </button>
            ))}
          </div>
        </div>
        <div className="leaders-loading-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton skeleton-shimmer" style={{ height: 300, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sports-tab-content">
        <div className="sports-error">
          <p>{error}</p>
          <button className="sports-btn" onClick={loadLeaders}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sports-tab-content">
      <div className="leaders-header">
        <h2>Stat Leaders</h2>
        <div className="leaders-league-tabs">
          {LEADERS_LEAGUES.map(league => (
            <button
              key={league.id}
              className={`leaders-league-tab ${selectedLeague === league.id ? 'active' : ''}`}
              onClick={() => setSelectedLeague(league.id)}
            >
              {league.name}
            </button>
          ))}
        </div>
      </div>

      {leaders.length === 0 ? (
        <div className="sports-empty">
          <h3>No Leaders Available</h3>
          <p>Stat leaders are typically available during the regular season.</p>
        </div>
      ) : (
        <div className="leaders-container">
          <div className="leaders-categories">
            {leaders.map((category) => (
              <button
                key={category.name}
                className={`leaders-category-btn ${selectedCategory === category.name ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.name)}
              >
                {category.shortDisplayName || category.displayName}
              </button>
            ))}
          </div>

          <div className="leaders-table-container">
            {leaders
              .filter(cat => cat.name === selectedCategory)
              .map((category) => (
                <LeadersTable 
                  key={category.name} 
                  category={category} 
                  selectedLeague={selectedLeague}
                  onAthleteClick={(id) => setSelectedAthleteId(id)}
                  onTeamClick={(team) => setSelectedTeam(team)}
                />
              ))}
          </div>
        </div>
      )}

      {selectedAthleteId && (
        <AthleteDetailModal
          athleteId={selectedAthleteId}
          leagueId={selectedLeague}
          onClose={() => setSelectedAthleteId(null)}
        />
      )}
    </div>
  );
}

interface LeadersTableProps {
  category: LeadersCategory;
  selectedLeague: string;
  onAthleteClick: (athleteId: string) => void;
  onTeamClick: (team: SportsTeam) => void;
}

function LeadersTable({ category, selectedLeague, onAthleteClick, onTeamClick }: LeadersTableProps) {
  return (
    <div className="leaders-table-wrapper">
      <h3 className="leaders-table-title">{category.displayName}</h3>
      <table className="leaders-table">
        <thead>
          <tr>
            <th className="leaders-table-rank">#</th>
            <th className="leaders-table-player">Player</th>
            <th className="leaders-table-team">Team</th>
            <th className="leaders-table-stat">{category.shortDisplayName || 'Stat'}</th>
          </tr>
        </thead>
        <tbody>
          {category.leaders.slice(0, 10).map((leader, idx) => (
            <tr key={`${leader.athlete.id}-${idx}`}>
              <td className="leaders-table-rank">{leader.rank}</td>
              <td 
                className="leaders-table-player clickable"
                onClick={() => onAthleteClick(leader.athlete.id)}
              >
                <div className="leaders-player-cell">
                  {leader.athlete.headshot && (
                    <img 
                      src={leader.athlete.headshot} 
                      alt={leader.athlete.name} 
                      className="leaders-table-headshot"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <div className="leaders-player-info">
                    <span className="leaders-player-name">{leader.athlete.name}</span>
                    {leader.athlete.position && (
                      <span className="leaders-player-position">{leader.athlete.position}</span>
                    )}
                  </div>
                </div>
              </td>
              <td 
                className="leaders-table-team clickable"
                onClick={() => onTeamClick({
                  id: leader.team.id,
                  name: leader.team.name,
                  shortName: leader.team.shortName,
                  logo: leader.team.logo,
                  leagueId: selectedLeague,
                })}
              >
                <div className="leaders-team-cell">
                  {leader.team.logo && (
                    <img 
                      src={leader.team.logo} 
                      alt={leader.team.name} 
                      className="leaders-table-team-logo"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <span>{leader.team.shortName || leader.team.name}</span>
                </div>
              </td>
              <td className="leaders-table-stat">
                <span className="leaders-stat-value">{leader.displayValue}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default LeadersTab;
