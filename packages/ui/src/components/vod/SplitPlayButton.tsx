import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './SplitPlayButton.css';

export type VodPlayerMode = 'embedded' | 'popout' | 'external';

export interface SplitPlayButtonProps {
  /** Callback triggered when playing. Passes selected or current target player mode. */
  onPlay: (mode?: VodPlayerMode) => void;
  /** Currently active VOD player mode ('embedded' | 'popout' | 'external') */
  currentMode?: VodPlayerMode;
  /** Callback triggered when user selects a new player mode from the dropdown */
  onSelectMode?: (mode: VodPlayerMode) => void;
  /** Main button text label (defaults to "Play") */
  label?: string;
  /** Additional CSS class names */
  className?: string;
  /** Size variant */
  size?: 'normal' | 'large' | 'small';
  /** Disabled state */
  disabled?: boolean;
  /** Custom icon override */
  icon?: React.ReactNode;
}

export function SplitPlayButton({
  onPlay,
  currentMode = 'embedded',
  onSelectMode,
  label = 'Play',
  className = '',
  size = 'normal',
  disabled = false,
  icon,
}: SplitPlayButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation('player');

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMainClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay(currentMode);
  }, [onPlay, currentMode]);

  const handleToggleDropdown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  }, [disabled]);

  const handleOptionSelect = useCallback((mode: VodPlayerMode, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onSelectMode?.(mode);
    onPlay(mode);
  }, [onSelectMode, onPlay]);

  const modeLabels: Record<VodPlayerMode, string> = {
    embedded: t('embedded'),
    popout: t('popout'),
    external: t('external'),
  };

  return (
    <div
      ref={containerRef}
      className={`split-play-btn-container split-play-btn-container--${size} ${disabled ? 'disabled' : ''} ${className}`}
    >
      <div className="split-play-btn">
        {/* Main Action Button */}
        <button
          type="button"
          className="split-play-btn__main"
          onClick={handleMainClick}
          disabled={disabled}
          title={t('playerModeTitle', { label, mode: modeLabels[currentMode] })}
        >
          {icon ? (
            icon
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="split-play-btn__play-icon">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
          <span className="split-play-btn__label">
            {label}
            <span className="split-play-btn__mode-tag">· {modeLabels[currentMode]}</span>
          </span>
        </button>

        {/* Vertical Separator Line */}
        <div className="split-play-btn__divider" />

        {/* Dropdown Toggle Button */}
        <button
          type="button"
          className={`split-play-btn__toggle ${isOpen ? 'active' : ''}`}
          onClick={handleToggleDropdown}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="true"
          title={t('choosePlayerMode', { mode: modeLabels[currentMode] })}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="split-play-btn__chevron-icon">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>
      </div>

      {/* Player Selection Dropdown Menu */}
      {isOpen && (
        <div className="split-play-btn__dropdown" role="menu">
          <div className="split-play-btn__menu-header">{t('playerOptions')}</div>
          
          <button
            type="button"
            className={`split-play-btn__option ${currentMode === 'embedded' ? 'selected' : ''}`}
            onClick={(e) => handleOptionSelect('embedded', e)}
            role="menuitem"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="split-play-btn__option-icon">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <div className="split-play-btn__option-text">
              <span className="split-play-btn__option-title">{t('embeddedPlayer')}</span>
              <span className="split-play-btn__option-desc">{t('embeddedPlayerDesc')}</span>
            </div>
            {currentMode === 'embedded' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="split-play-btn__check-icon">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className={`split-play-btn__option ${currentMode === 'popout' ? 'selected' : ''}`}
            onClick={(e) => handleOptionSelect('popout', e)}
            role="menuitem"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="split-play-btn__option-icon">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <rect x="11" y="11" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.2" />
              <path d="M15 9h4v4" />
              <path d="M19 9l-5 5" />
            </svg>
            <div className="split-play-btn__option-text">
              <span className="split-play-btn__option-title">{t('popoutPlayer')}</span>
              <span className="split-play-btn__option-desc">{t('popoutPlayerDesc')}</span>
            </div>
            {currentMode === 'popout' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="split-play-btn__check-icon">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className={`split-play-btn__option ${currentMode === 'external' ? 'selected' : ''}`}
            onClick={(e) => handleOptionSelect('external', e)}
            role="menuitem"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="split-play-btn__option-icon">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <div className="split-play-btn__option-text">
              <span className="split-play-btn__option-title">{t('externalPlayer')}</span>
              <span className="split-play-btn__option-desc">{t('externalPlayerDesc')}</span>
            </div>
            {currentMode === 'external' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="split-play-btn__check-icon">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export interface SetPlayerDropdownProps {
  currentMode?: VodPlayerMode;
  onSelectMode?: (mode: VodPlayerMode) => void;
  className?: string;
}

export type TrailerSource = 'source' | 'tmdb';

export interface TrailerSourceToggleProps {
  current: TrailerSource;
  onSelect: (source: TrailerSource) => void;
  className?: string;
}

/**
 * A small pill toggle letting the user pick which trailer to play when both the
 * IPTV source and TMDB provide one for the item.
 */
export function TrailerSourceToggle({
  current,
  onSelect,
  className = '',
}: TrailerSourceToggleProps) {
  const { t } = useTranslation('player');
  return (
    <div className={`trailer-source-toggle ${className}`}>
      <button
        type="button"
        className={`trailer-source-toggle__btn ${current === 'source' ? 'active' : ''}`}
        onClick={() => onSelect('source')}
        title={t('trailerSourceTitle')}
      >
        {t('source')}
      </button>
      <button
        type="button"
        className={`trailer-source-toggle__btn ${current === 'tmdb' ? 'active' : ''}`}
        onClick={() => onSelect('tmdb')}
        title={t('trailerTmdbTitle')}
      >
        TMDB
      </button>
    </div>
  );
}
export interface TrailerSplitButtonProps {
  /** Whether a trailer is currently loading */
  loading?: boolean;
  /** Whether the button should be disabled */
  disabled?: boolean;
  /** Currently selected trailer source */
  trailerSource: TrailerSource;
  /** Called when user picks a new trailer source */
  onSelectSource: (source: TrailerSource) => void;
  /** Whether both Source and TMDB trailers are available (shows source section) */
  hasBothSources?: boolean;
  /** Currently active playback mode */
  playerMode: VodPlayerMode;
  /** Called when user selects a playback mode (does NOT auto-play) */
  onSelectMode: (mode: VodPlayerMode) => void;
  /** Called when user clicks the main label area to play immediately */
  onPlay: (mode?: VodPlayerMode) => void;
  /** Additional CSS class */
  className?: string;
}





/**
 * Unified Trailer split-button.
 *
 * Collapsed: ▶ Trailer · TMDB · Embedded ⌄
 *
 * Dropdown:
 *   SOURCE          (only when hasBothSources)
 *     ○ Source  ● TMDB
 *   ─────────────
 *   PLAYBACK
 *     ● Embedded  ○ Popout  ○ External
 */
export function TrailerSplitButton({
  loading = false,
  disabled = false,
  trailerSource,
  onSelectSource,
  hasBothSources = false,
  playerMode,
  onSelectMode,
  onPlay,
  className = '',
}: TrailerSplitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation('player');

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const sourceLabels: Record<TrailerSource, string> = {
    source: t('source'),
    tmdb: 'TMDB',
  };
  const modeLabels: Record<VodPlayerMode, string> = {
    embedded: t('embedded'),
    popout: t('popout'),
    external: t('external'),
  };

  const handleMainClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay(playerMode);
  }, [onPlay, playerMode]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) setIsOpen(prev => !prev);
  }, [disabled]);

  const handleSourceSelect = useCallback((src: TrailerSource, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectSource(src);
    // keep dropdown open so user can also change playback
  }, [onSelectSource]);

  const handleModeSelect = useCallback((mode: VodPlayerMode, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectMode(mode);
    setIsOpen(false);
  }, [onSelectMode]);

  // Label: "Trailer · TMDB · Embedded" (source tag only when both are available)
  const sourceTag = hasBothSources ? ` · ${sourceLabels[trailerSource]}` : '';
  const modeTag = ` · ${modeLabels[playerMode]}`;

  return (
    <div
      ref={containerRef}
      className={`split-play-btn-container split-play-btn-container--normal ${disabled ? 'disabled' : ''} ${className}`}
    >
      <div className="split-play-btn">
        {/* Main action button */}
        <button
          type="button"
          className="split-play-btn__main"
          onClick={handleMainClick}
          disabled={disabled}
          title={t('playTrailer', { mode: hasBothSources ? `${sourceLabels[trailerSource]} · ${modeLabels[playerMode]}` : modeLabels[playerMode] })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="split-play-btn__play-icon">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          <span className="split-play-btn__label">
            {loading ? t('resolving') : t('trailer')}
            {!loading && (
              <span className="split-play-btn__mode-tag">{sourceTag}{modeTag}</span>
            )}
          </span>
        </button>

        {/* Separator */}
        <div className="split-play-btn__divider" />

        {/* Dropdown toggle */}
        <button
          type="button"
          className={`split-play-btn__toggle ${isOpen ? 'active' : ''}`}
          onClick={handleToggle}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="true"
          title={t('trailerOptions')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="split-play-btn__chevron-icon">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="split-play-btn__dropdown trailer-split-btn__dropdown" role="menu">

          {/* SOURCE section — only when both trailers are available */}
          {hasBothSources && (
            <>
              <div className="split-play-btn__menu-header">{t('source')}</div>
              <div className="trailer-split-btn__radio-group">
                {(['source', 'tmdb'] as TrailerSource[]).map((src) => (
                  <button
                    key={src}
                    type="button"
                    className={`trailer-split-btn__radio-btn ${trailerSource === src ? 'selected' : ''}`}
                    onClick={(e) => handleSourceSelect(src, e)}
                    role="menuitemradio"
                    aria-checked={trailerSource === src}
                  >
                    <span className="trailer-split-btn__radio-dot" />
                    {sourceLabels[src]}
                  </button>
                ))}
              </div>
              <div className="trailer-split-btn__section-divider" />
            </>
          )}

          {/* PLAYBACK section */}
          <div className="split-play-btn__menu-header">{t('playback')}</div>
          <div className="trailer-split-btn__radio-group">
            {(['embedded', 'popout', 'external'] as VodPlayerMode[]).map((mode) => {
              const icons: Record<VodPlayerMode, React.ReactNode> = {
                embedded: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="trailer-split-btn__radio-icon">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                ),
                popout: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="trailer-split-btn__radio-icon">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <rect x="11" y="11" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.2" />
                    <path d="M15 9h4v4" />
                    <path d="M19 9l-5 5" />
                  </svg>
                ),
                external: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="trailer-split-btn__radio-icon">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                ),
              };
              return (
                <button
                  key={mode}
                  type="button"
                  className={`trailer-split-btn__radio-btn ${playerMode === mode ? 'selected' : ''}`}
                  onClick={(e) => handleModeSelect(mode, e)}
                  role="menuitemradio"
                  aria-checked={playerMode === mode}
                >
                  {icons[mode]}
                  <span className="trailer-split-btn__radio-dot" />
                  {modeLabels[mode]}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function SetPlayerDropdown({
  currentMode = 'embedded',
  onSelectMode,
  className = '',
}: SetPlayerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation('player');

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleOptionSelect = useCallback((mode: VodPlayerMode, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onSelectMode?.(mode);
  }, [onSelectMode]);

  const modeLabels: Record<VodPlayerMode, string> = {
    embedded: t('embedded'),
    popout: t('popout'),
    external: t('external'),
  };

  return (
    <div ref={containerRef} className={`set-player-dropdown-container ${className}`}>
      <button
        type="button"
        className="set-player-dropdown-btn"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={t('selectDefaultPlayerMode')}
      >
        {currentMode === 'embedded' && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="set-player-dropdown-btn__icon">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )}
        {currentMode === 'popout' && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="set-player-dropdown-btn__icon">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <rect x="11" y="11" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.2" />
            <path d="M15 9h4v4" />
            <path d="M19 9l-5 5" />
          </svg>
        )}
        {currentMode === 'external' && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="set-player-dropdown-btn__icon">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        )}

        <span className="set-player-dropdown-btn__label">
          {t('playerLabel', { mode: modeLabels[currentMode] })}
        </span>

        <svg viewBox="0 0 24 24" fill="currentColor" className={`set-player-dropdown-btn__chevron ${isOpen ? 'active' : ''}`}>
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {isOpen && (
        <div className="split-play-btn__dropdown" role="menu">
          <div className="split-play-btn__menu-header">{t('setDefaultPlayer')}</div>
          
          <button
            type="button"
            className={`split-play-btn__option ${currentMode === 'embedded' ? 'selected' : ''}`}
            onClick={(e) => handleOptionSelect('embedded', e)}
            role="menuitem"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="split-play-btn__option-icon">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <div className="split-play-btn__option-text">
              <span className="split-play-btn__option-title">{t('embeddedPlayer')}</span>
              <span className="split-play-btn__option-desc">{t('embeddedPlayerDesc')}</span>
            </div>
            {currentMode === 'embedded' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="split-play-btn__check-icon">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className={`split-play-btn__option ${currentMode === 'popout' ? 'selected' : ''}`}
            onClick={(e) => handleOptionSelect('popout', e)}
            role="menuitem"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="split-play-btn__option-icon">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <rect x="11" y="11" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.2" />
              <path d="M15 9h4v4" />
              <path d="M19 9l-5 5" />
            </svg>
            <div className="split-play-btn__option-text">
              <span className="split-play-btn__option-title">{t('popoutPlayer')}</span>
              <span className="split-play-btn__option-desc">{t('popoutPlayerDesc')}</span>
            </div>
            {currentMode === 'popout' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="split-play-btn__check-icon">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className={`split-play-btn__option ${currentMode === 'external' ? 'selected' : ''}`}
            onClick={(e) => handleOptionSelect('external', e)}
            role="menuitem"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="split-play-btn__option-icon">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <div className="split-play-btn__option-text">
              <span className="split-play-btn__option-title">{t('externalPlayer')}</span>
              <span className="split-play-btn__option-desc">{t('externalPlayerDesc')}</span>
            </div>
            {currentMode === 'external' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="split-play-btn__check-icon">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
