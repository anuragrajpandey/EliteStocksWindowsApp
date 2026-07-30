import React, { useState, useRef, useEffect, useCallback } from 'react';
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
}

export function SplitPlayButton({
  onPlay,
  currentMode = 'embedded',
  onSelectMode,
  label = 'Play',
  className = '',
  size = 'normal',
  disabled = false,
}: SplitPlayButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    embedded: 'Embedded',
    popout: 'Popout',
    external: 'External',
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
          title={`${label} (${modeLabels[currentMode]} Player)`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="split-play-btn__play-icon">
            <path d="M8 5v14l11-7z" />
          </svg>
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
          title={`Choose Player Mode (Current: ${modeLabels[currentMode]})`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="split-play-btn__chevron-icon">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>
      </div>

      {/* Player Selection Dropdown Menu */}
      {isOpen && (
        <div className="split-play-btn__dropdown" role="menu">
          <div className="split-play-btn__menu-header">Player Options</div>
          
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
              <span className="split-play-btn__option-title">Embedded Player</span>
              <span className="split-play-btn__option-desc">Play inside main app window</span>
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
              <span className="split-play-btn__option-title">Popout Player</span>
              <span className="split-play-btn__option-desc">Play in floating popout window</span>
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
              <span className="split-play-btn__option-title">External Player</span>
              <span className="split-play-btn__option-desc">Launch configured external app</span>
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

export function SetPlayerDropdown({
  currentMode = 'embedded',
  onSelectMode,
  className = '',
}: SetPlayerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    embedded: 'Embedded',
    popout: 'Popout',
    external: 'External',
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
        title="Select Default Player Mode"
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
          Player: {modeLabels[currentMode]}
        </span>

        <svg viewBox="0 0 24 24" fill="currentColor" className={`set-player-dropdown-btn__chevron ${isOpen ? 'active' : ''}`}>
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {isOpen && (
        <div className="split-play-btn__dropdown" role="menu">
          <div className="split-play-btn__menu-header">Set Default Player</div>
          
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
              <span className="split-play-btn__option-title">Embedded Player</span>
              <span className="split-play-btn__option-desc">Play inside main app window</span>
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
              <span className="split-play-btn__option-title">Popout Player</span>
              <span className="split-play-btn__option-desc">Play in floating popout window</span>
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
              <span className="split-play-btn__option-title">External Player</span>
              <span className="split-play-btn__option-desc">Launch configured external app</span>
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
