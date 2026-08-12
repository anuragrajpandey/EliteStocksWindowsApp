import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { StoredMovie, StoredSeries, StoredEpisode } from '../../db';
import { useVodPlaylistStore, type PlaylistItem } from '../../stores/vodPlaylistStore';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useModal } from '../Modal';
import './AddToPlaylistModal.css';

export interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie?: StoredMovie | null;
  series?: StoredSeries | null;
  seasons?: Record<number, StoredEpisode[]>;
  preselectedEpisode?: StoredEpisode | null;
  sourceName?: string;
  posterUrl?: string | null;
}

export function AddToPlaylistModal({
  isOpen,
  onClose,
  movie,
  series,
  seasons = {},
  preselectedEpisode,
  sourceName,
  posterUrl,
}: AddToPlaylistModalProps) {
  useTranslation();
  const { playlists, createPlaylist, addItemToPlaylist, addItemsToPlaylist } = useVodPlaylistStore();
  const { showError, ModalComponent } = useModal();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Available season numbers
  const seasonNumbers = useMemo(() => {
    const numbers = Object.keys(seasons).map(Number).sort((a, b) => a - b);
    return numbers.length > 0 ? numbers : [1];
  }, [seasons]);

  const [selectedSeason, setSelectedSeason] = useState<number>(seasonNumbers[0] || 1);
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<Set<string>>(new Set());

  // Initialize selected season & episodes only when the modal opens, so that
  // re-renders while open (e.g. lazy metadata resolving in the detail page)
  // don't wipe the user's episode selections mid-interaction.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!justOpened) return;
    if (preselectedEpisode) {
      setSelectedSeason(preselectedEpisode.season_num || 1);
      setSelectedEpisodeIds(new Set([preselectedEpisode.id]));
    } else if (seasonNumbers.length > 0) {
      setSelectedSeason(seasonNumbers[0]);
      // Default to selecting all episodes in season 1
      const seasonEps = seasons[seasonNumbers[0]] || [];
      setSelectedEpisodeIds(new Set(seasonEps.map((ep) => ep.id)));
    }
  }, [isOpen, preselectedEpisode, seasonNumbers, seasons]);

  if (!isOpen) return null;

  const currentSeasonEpisodes = seasons[selectedSeason] || [];

  const toggleEpisode = (epId: string) => {
    setSelectedEpisodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(epId)) {
        next.delete(epId);
      } else {
        next.add(epId);
      }
      return next;
    });
  };

  const selectAllCurrentSeason = () => {
    setSelectedEpisodeIds((prev) => {
      const next = new Set(prev);
      currentSeasonEpisodes.forEach((ep) => next.add(ep.id));
      return next;
    });
  };

  const deselectAllCurrentSeason = () => {
    setSelectedEpisodeIds((prev) => {
      const next = new Set(prev);
      currentSeasonEpisodes.forEach((ep) => next.delete(ep.id));
      return next;
    });
  };

  // Bulk actions across ALL seasons (multi-season series only).
  const selectAllSeasons = () => {
    const allIds = new Set<string>();
    Object.values(seasons).forEach((epList) => epList.forEach((ep) => allIds.add(ep.id)));
    setSelectedEpisodeIds(allIds);
  };

  const deselectAllSeasons = () => {
    setSelectedEpisodeIds(new Set());
  };

  const handleAddToPlaylist = (playlistId: string, playlistName: string) => {
    if (movie) {
      const item: Omit<PlaylistItem, 'id' | 'playlistId' | 'addedAt'> = {
        itemType: 'movie',
        mediaId: movie.stream_id,
        title: movie.title || movie.name,
        poster: posterUrl || movie.stream_icon,
        backdropUrl: movie.backdrop_path || movie.stream_icon,
        directUrl: movie.direct_url,
        sourceId: movie.source_id,
        sourceName: sourceName || undefined,
        duration: movie.duration ? movie.duration * 60 : undefined,
      };
      addItemToPlaylist(playlistId, item);
      setAddedToast(i18n.t('vod:addedToPlaylist', { name: playlistName }));
      setTimeout(() => {
        setAddedToast(null);
        onClose();
      }, 1200);
    } else if (series) {
      // Gather selected episodes across seasons or current season
      const episodesToAdd: StoredEpisode[] = [];
      Object.values(seasons).forEach((epList) => {
        epList.forEach((ep) => {
          if (selectedEpisodeIds.has(ep.id)) {
            episodesToAdd.push(ep);
          }
        });
      });

      if (episodesToAdd.length === 0) {
        showError(i18n.t('vod:noEpisodesSelected'), i18n.t('vod:selectEpisodesFirst'));
        return;
      }

      const items: Array<Omit<PlaylistItem, 'id' | 'playlistId' | 'addedAt'>> = episodesToAdd.map((ep) => ({
        itemType: 'episode',
        mediaId: ep.id,
        seriesId: series.series_id,
        seriesTitle: series.title || series.name,
        seasonNum: ep.season_num,
        episodeNum: ep.episode_num,
        episodeTitle: ep.title || `Episode ${ep.episode_num}`,
        title: `${series.title || series.name} - S${ep.season_num}E${ep.episode_num}${ep.title ? `: ${ep.title}` : ''}`,
        poster: posterUrl || series.cover,
        backdropUrl: series.backdrop_path || series.cover,
        directUrl: ep.direct_url,
        sourceId: series.source_id,
        sourceName: sourceName,
        duration: ep.duration ? ep.duration * 60 : undefined,
      }));

      addItemsToPlaylist(playlistId, items);
      setAddedToast(i18n.t('vod:addedToPlaylist', { name: playlistName }));
      setTimeout(() => {
        setAddedToast(null);
        onClose();
      }, 1200);
    }
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const newPl = createPlaylist(newPlaylistName);
    setNewPlaylistName('');
    handleAddToPlaylist(newPl.id, newPl.name);
  };

  const displayTitle = movie ? (movie.title || movie.name) : series ? (series.title || series.name) : '';

  return (
    <div className="add-to-playlist-overlay" onClick={onClose}>
      <div className="add-to-playlist-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-to-playlist-modal__header">
          <h3 className="add-to-playlist-modal__title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            {i18n.t('vod:addToPlaylist')}
          </h3>
          <button className="add-to-playlist-modal__close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="add-to-playlist-modal__body">
          {/* Media Header Preview */}
          <div className="add-to-playlist-preview">
            {posterUrl && <img src={posterUrl} alt="" className="add-to-playlist-preview__poster" />}
            <div className="add-to-playlist-preview__info">
              <span className="add-to-playlist-preview__title">{displayTitle}</span>
              <span className="add-to-playlist-preview__sub">
                {movie ? i18n.t('vod:movie') : series ? i18n.t('vod:series') : ''}
                {sourceName ? ` • ${sourceName}` : ''}
              </span>
            </div>
          </div>

          {/* Episode Picker for TV Series */}
          {series && (
            <div className="add-to-playlist-episodes-section">
              <div className="add-to-playlist-season-selector">
                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                  {i18n.t('vod:selectSeason')}:
                </label>
                <select
                  className="add-to-playlist-season-select"
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                >
                  {seasonNumbers.map((num) => (
                    <option key={num} value={num}>
                      {i18n.t('vod:seasonNum', { num })} ({seasons[num]?.length || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="add-to-playlist-episodes-actions">
                {seasonNumbers.length > 1 && (
                  <>
                    <button className="add-to-playlist-select-btn" onClick={selectAllSeasons}>
                      {i18n.t('vod:selectAllSeasons')}
                    </button>
                    <button className="add-to-playlist-select-btn" onClick={deselectAllSeasons}>
                      {i18n.t('vod:deselectAllSeasons')}
                    </button>
                  </>
                )}
                <button className="add-to-playlist-select-btn" onClick={selectAllCurrentSeason}>
                  {i18n.t('vod:selectAllEpisodes')}
                </button>
                <button className="add-to-playlist-select-btn" onClick={deselectAllCurrentSeason}>
                  {i18n.t('vod:deselectAllEpisodes')}
                </button>
              </div>

              <div className="add-to-playlist-episodes-list">
                {currentSeasonEpisodes.map((ep: StoredEpisode) => {
                  const isChecked = selectedEpisodeIds.has(ep.id);
                  return (
                    <div
                      key={ep.id}
                      className="add-to-playlist-episode-row"
                      onClick={() => toggleEpisode(ep.id)}
                    >
                      <input
                        type="checkbox"
                        className="add-to-playlist-episode-checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                      />
                      <span className="add-to-playlist-episode-title">
                        E{ep.episode_num} - {ep.title || `Episode ${ep.episode_num}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Added Confirmation Toast */}
          {addedToast ? (
            <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '10px', color: '#10b981', textAlign: 'center', fontWeight: '600' }}>
              ✓ {addedToast}
            </div>
          ) : (
            <>
              {/* Playlists List */}
              <div className="add-to-playlist-list">
                {playlists.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', margin: '10px 0', fontSize: '0.9rem' }}>
                    {i18n.t('vod:noPlaylistsFound')}
                  </p>
                ) : (
                  playlists.map((pl) => (
                    <div key={pl.id} className="add-to-playlist-item">
                      <div className="add-to-playlist-item__info">
                        <span className="add-to-playlist-item__name">{pl.name}</span>
                        <span className="add-to-playlist-item__count">
                          {i18n.t('vod:itemCount', { count: pl.items.length })}
                        </span>
                      </div>
                      <button
                        className="add-to-playlist-item__add-btn"
                        onClick={() => handleAddToPlaylist(pl.id, pl.name)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        {i18n.t('vod:addToPlaylist')}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Create New Playlist Form */}
              <form className="add-to-playlist-create" onSubmit={handleCreateAndAdd}>
                <div className="add-to-playlist-create__input-group">
                  <input
                    type="text"
                    className="add-to-playlist-create__input"
                    placeholder={i18n.t('vod:playlistNamePlaceholder')}
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                  />
                  <button type="submit" className="add-to-playlist-create__btn" disabled={!newPlaylistName.trim()}>
                    + {i18n.t('vod:createPlaylist')}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      <ModalComponent />
    </div>
  );
}
