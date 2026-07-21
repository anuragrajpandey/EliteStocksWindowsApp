import './PlaybackTab.css';

interface VodTabProps {
  vodAutoPlayNextEpisode: boolean;
  onVodAutoPlayNextEpisodeChange: (enabled: boolean) => void;
  vodShowSourceBadge: boolean;
  onVodShowSourceBadgeChange: (enabled: boolean) => void;
}

export function VodTab({
  vodAutoPlayNextEpisode,
  onVodAutoPlayNextEpisodeChange,
  vodShowSourceBadge,
  onVodShowSourceBadgeChange,
}: VodTabProps) {
  return (
    <div className="settings-tab-content">
      <div className="settings-section" style={{ paddingTop: '8px' }}>
        <div className="section-header">
          <h3>VOD Settings</h3>
        </div>
        <p className="section-description">
          Configure playback settings and preferences for Video on Demand (VOD) content.
        </p>

        <div className="timeshift-settings">
          <div className="timeshift-toggle-row">
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">Auto-Play Next Episode</span>
              <span className="timeshift-toggle-sub">
                Automatically play the next episode of a VOD Series when the current episode ends.
                If it's the end of a season, it will automatically start the first episode of the next season.
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={vodAutoPlayNextEpisode}
                onChange={(e) => onVodAutoPlayNextEpisodeChange(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="timeshift-toggle-row" style={{ marginTop: '12px' }}>
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">Show Source Badge</span>
              <span className="timeshift-toggle-sub">
                Display the provider source badge for VOD Movies and Series cards in Recently Watched on the home page, All Movies/Series page, and Recent page.
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={vodShowSourceBadge}
                onChange={(e) => onVodShowSourceBadgeChange(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
