import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../utils/dateTime';
import {
  getAthleteDetails,
  getAthleteGameLog,
  type AthleteProfileResponse,
  type AthleteGameLogData,
  type AthleteGameLogRow,
} from '../../services/sports';

interface AthleteDetailModalProps {
  athleteId: string;
  leagueId?: string;
  onClose: () => void;
}

type TabId = 'overview' | 'stats' | 'gamelog';

export function AthleteDetailModal({ athleteId, leagueId = 'nfl', onClose }: AthleteDetailModalProps) {
  const { t } = useTranslation('sports');
  const [profile, setProfile] = useState<AthleteProfileResponse | null>(null);
  const [gamelog, setGamelog] = useState<AthleteGameLogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      getAthleteDetails(athleteId, leagueId),
      getAthleteGameLog(athleteId, leagueId),
    ])
      .then(([profileRes, gamelogRes]) => {
        if (isMounted) {
          setProfile(profileRes);
          setGamelog(gamelogRes);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [athleteId, leagueId]);

  const bio = profile?.bio;

  return createPortal(
    <div className="athlete-modal-overlay" onClick={onClose}>
      <div className="athlete-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="athlete-modal-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {loading ? (
          <div className="sports-loading" style={{ padding: '60px 0' }}>
            <div className="sports-spinner" />
            <span>{t('loadingPlayerProfile')}</span>
          </div>
        ) : !bio ? (
          <div className="sports-empty" style={{ padding: '60px 0' }}>
            <p>{t('playerDetailsUnavailable')}</p>
          </div>
        ) : (
          <>
            {/* Header Banner */}
            <div className="athlete-header-banner">
              <div className="athlete-header-main">
                {bio.headshot ? (
                  <img
                    src={bio.headshot}
                    alt={bio.name}
                    className="athlete-headshot"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="athlete-headshot-placeholder">
                    <span>{bio.name.charAt(0)}</span>
                  </div>
                )}
                <div className="athlete-header-info">
                  <div className="athlete-name-row">
                    <h2 className="athlete-name">{bio.name}</h2>
                    {bio.jersey && <span className="athlete-jersey">#{bio.jersey}</span>}
                  </div>

                  <div className="athlete-team-position">
                    {bio.position && <span className="athlete-position">{bio.position}</span>}
                    {bio.position && bio.teamName && <span className="athlete-bullet">•</span>}
                    {bio.teamName && (
                      <span className="athlete-team">
                        {bio.teamLogo && (
                          <img src={bio.teamLogo} alt="" className="athlete-team-logo" />
                        )}
                        {bio.teamName}
                      </span>
                    )}
                  </div>

                  {/* Bio Pills / Badges */}
                  <div className="athlete-bio-pills">
                    {bio.height && <span className="athlete-bio-pill">Ht: {bio.height}</span>}
                    {bio.weight && <span className="athlete-bio-pill">Wt: {bio.weight}</span>}
                    {bio.age !== undefined && <span className="athlete-bio-pill">Age: {bio.age}</span>}
                    {bio.experience && <span className="athlete-bio-pill">Exp: {bio.experience}</span>}
                    {bio.college && <span className="athlete-bio-pill">College: {bio.college}</span>}
                    {bio.injuryStatus && (
                      <span className="athlete-bio-pill injury">
                        {bio.injuryStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="athlete-tabs">
              <button
                className={`athlete-tab ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`athlete-tab ${activeTab === 'stats' ? 'active' : ''}`}
                onClick={() => setActiveTab('stats')}
              >
                Season Stats
              </button>
              <button
                className={`athlete-tab ${activeTab === 'gamelog' ? 'active' : ''}`}
                onClick={() => setActiveTab('gamelog')}
              >
                Game Log ({gamelog?.rows.length || 0})
              </button>
            </div>

            {/* Tab Body */}
            <div className="athlete-tab-body">
              {activeTab === 'overview' && (
                <div className="athlete-overview-section">
                  {profile?.overviewSplits && profile.overviewSplits.length > 0 ? (
                    <div className="athlete-overview-splits">
                      {profile.overviewSplits.map((split) => (
                        <div key={split.category} className="athlete-split-card">
                          <h4 className="athlete-split-title">{split.category}</h4>
                          <div className="athlete-stats-table-wrapper">
                            <table className="athlete-stats-table">
                              <thead>
                                <tr>
                                  {split.labels.map((lbl: string, idx: number) => (
                                    <th key={idx}>{lbl}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {split.rows.map((row, rIdx: number) => (
                                  <tr key={rIdx}>
                                    {row.stats.map((val: string, cIdx: number) => (
                                      <td key={cIdx}>{val}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="sports-empty">
                      <p>{t('overviewStatsUnavailable')}</p>
                    </div>
                  )}

                  {profile?.news && profile.news.length > 0 && (
                    <div className="athlete-news-section">
                      <h4 className="athlete-section-subtitle">Related News</h4>
                      <div className="athlete-news-list">
                        {profile.news.slice(0, 3).map((art) => (
                          <a
                            key={art.id}
                            href={art.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="athlete-news-item"
                          >
                            {art.imageUrl && (
                              <img src={art.imageUrl} alt="" className="athlete-news-img" />
                            )}
                            <div className="athlete-news-info">
                              <span className="athlete-news-headline">{art.headline}</span>
                              {art.description && (
                                <p className="athlete-news-desc">{art.description}</p>
                              )}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'stats' && (
                <div className="athlete-stats-section">
                  {profile?.seasonHistory && profile.seasonHistory.length > 0 ? (
                    profile.seasonHistory.map((split) => (
                      <div key={split.category} className="athlete-split-card">
                        <h4 className="athlete-split-title">{split.category}</h4>
                        <div className="athlete-stats-table-wrapper">
                          <table className="athlete-stats-table">
                            <thead>
                              <tr>
                                {split.labels.map((lbl: string, idx: number) => (
                                  <th key={idx}>{lbl}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {split.rows.map((row, rIdx: number) => (
                                <tr key={rIdx}>
                                  {row.stats.map((val: string, cIdx: number) => (
                                    <td key={cIdx}>{val}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="sports-empty">
                      <p>{t('careerStatsUnavailable')}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'gamelog' && (
                <div className="athlete-gamelog-section">
                  {gamelog && gamelog.rows.length > 0 ? (
                    <div className="athlete-stats-table-wrapper">
                      <table className="athlete-stats-table gamelog">
                        <thead>
                          <tr>
                            <th>{t('date')}</th>
                            <th>{t('opponent')}</th>
                            <th>{t('result')}</th>
                            {gamelog.labels.map((lbl: string, idx: number) => (
                              <th key={idx}>{lbl}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {gamelog.rows.map((row: AthleteGameLogRow) => (
                            <tr key={row.id}>
                              <td className="gamelog-date">
                                {formatDate(new Date(row.gameDate), {
                                  month: 'numeric',
                                  day: 'numeric',
                                })}
                              </td>
                              <td className="gamelog-opponent">
                                <span className="gamelog-atvs">{row.atVs}</span>
                                {row.opponentLogo && (
                                  <img src={row.opponentLogo} alt="" className="gamelog-opp-logo" />
                                )}
                                <span className="gamelog-opp-name">{row.opponentName}</span>
                              </td>
                              <td className="gamelog-result">
                                <span className={`gamelog-tag ${row.gameResult.toLowerCase()}`}>
                                  {row.gameResult} {row.score}
                                </span>
                              </td>
                              {row.stats.map((val: string, cIdx: number) => (
                                <td key={cIdx}>{val}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="sports-empty">
                      <p>{t('gameLogUnavailable')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
