import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../utils/dateTime';
import i18n from '../../i18n';
import {
  getLeagueNews,
  getAvailableLeagues,
  type NewsArticle,
} from '../../services/sports';
import { useSportsSettingsStore } from '../../stores/sportsSettingsStore';
import './LoadingSkeleton.css';

interface NewsTabProps {
  onSearchChannels?: (channelName: string) => void;
}

export function NewsTab({ }: NewsTabProps) {
  useTranslation();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  
  const { newsLeagues, loaded, loadSettings } = useSportsSettingsStore();
  const leagues = getAvailableLeagues();

  useEffect(() => {
    if (!loaded) {
      loadSettings();
    }
  }, [loaded, loadSettings]);

  const loadNews = useCallback(async () => {
    if (!loaded) return;
    setLoading(true);
    setError(null);
    try {
      if (selectedLeague === 'all') {
        const allNews: NewsArticle[] = [];
        for (const leagueId of newsLeagues) {
          const leagueNews = await getLeagueNews(leagueId, 10);
          allNews.push(...leagueNews);
        }
        allNews.sort((a, b) => {
          if (!a.published && !b.published) return 0;
          if (!a.published) return 1;
          if (!b.published) return -1;
          return b.published.getTime() - a.published.getTime();
        });
        setNews(allNews.slice(0, 50));
      } else {
        const leagueNews = await getLeagueNews(selectedLeague, 30);
        setNews(leagueNews);
      }
    } catch (err) {
      console.error('[NewsTab] Failed to load:', err);
      setError(i18n.t('sports:failedLoadNews'));
    } finally {
      setLoading(false);
    }
  }, [selectedLeague, newsLeagues, loaded]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  if (loading && news.length === 0) {
    return (
      <div className="sports-tab-content">
        <div className="news-header">
          <h2>{i18n.t('sports:news')}</h2>
          <div className="skeleton skeleton-badge skeleton-shimmer" style={{ width: '120px', height: '36px' }} />
        </div>
        <div className="skeleton-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton-news-card">
              <div className="skeleton skeleton-image skeleton-shimmer" />
              <div className="skeleton-news-content">
                <div className="skeleton skeleton-text skeleton-text-sm skeleton-shimmer" />
                <div className="skeleton skeleton-text skeleton-text-lg skeleton-shimmer" />
                <div className="skeleton skeleton-text skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sports-error">
        <p>{error}</p>
        <button className="sports-btn" onClick={loadNews}>{i18n.t('common:retry')}</button>
      </div>
    );
  }

  return (
    <div className="sports-tab-content">
      <div className="news-header">
        <h2>{i18n.t('sports:news')}</h2>
        <select
          className="news-league-select"
          value={selectedLeague}
          onChange={(e) => setSelectedLeague(e.target.value)}
        >
          <option value="all">{i18n.t('sports:allLeagues')}</option>
          {leagues.map(league => (
            <option key={league.id} value={league.id}>{league.name}</option>
          ))}
        </select>
      </div>

      {news.length === 0 ? (
        <div className="sports-empty">
          <h3>{i18n.t('sports:noNewsAvailable')}</h3>
          <p>{i18n.t('sports:noNewsCheckBack')}</p>
        </div>
      ) : (
        <div className="news-grid">
          {news.map((article, idx) => (
            <NewsCard key={`${article.id}-${idx}`} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}

interface NewsCardProps {
  article: NewsArticle;
}

function NewsCard({ article }: NewsCardProps) {
  useTranslation();
  const formatRelativeDate = (date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return i18n.t('time:justNow');
    if (hours < 24) return i18n.t('time:hAgo', { count: hours });
    if (days < 7) return i18n.t('time:dAgo', { count: days });
    return formatDate(date);
  };

  return (
    <a
      href={article.link}
      className="news-card"
      target="_blank"
      rel="noopener noreferrer"
    >
      {article.image && (
        <div className="news-card-image-wrapper">
          <img 
            src={article.image} 
            alt={article.title} 
            className="news-card-image"
            onError={(e) => { 
              e.currentTarget.parentElement!.style.display = 'none'; 
            }}
          />
        </div>
      )}
      <div className="news-card-content">
        <div className="news-card-meta">
          <span className="news-card-league">{article.leagueId.replace('-', ' ').toUpperCase()}</span>
          {article.published && (
            <span className="news-card-date">{formatRelativeDate(article.published)}</span>
          )}
        </div>
        <h3 className="news-card-title">{article.title}</h3>
        {article.description && (
          <p className="news-card-desc">{article.description}</p>
        )}
      </div>
    </a>
  );
}
