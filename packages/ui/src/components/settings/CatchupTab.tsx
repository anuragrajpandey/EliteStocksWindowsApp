import './PlaybackTab.css';

interface CatchupTabProps {
  catchupStartPadding: number;
  onCatchupStartPaddingChange: (padding: number) => void;
  catchupEndPadding: number;
  onCatchupEndPaddingChange: (padding: number) => void;
  catchupContinuePlaying: boolean;
  onCatchupContinuePlayingChange: (enabled: boolean) => void;
}

export function CatchupTab({
  catchupStartPadding,
  onCatchupStartPaddingChange,
  catchupEndPadding,
  onCatchupEndPaddingChange,
  catchupContinuePlaying,
  onCatchupContinuePlayingChange,
}: CatchupTabProps) {
  return (
    <div className="settings-tab-content">
      <div className="settings-section" style={{ paddingTop: '8px' }}>
        <div className="section-header">
          <h3>Catch-up Settings</h3>
        </div>
        <p className="section-description">
          Adjust the playback settings for catch-up (timeshift) programs to prevent shows or sports from being cut off.
        </p>

        <div className="timeshift-settings">
          {/* Start Padding */}
          <div className="timeshift-toggle-row">
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">Start Padding</span>
              <span className="timeshift-toggle-sub">
                Minutes to play before the EPG scheduled start time. This lets you scrub back to the very beginning if needed.
              </span>
            </div>
            <div className="retry-input-wrapper">
              <input
                type="number"
                min={0}
                max={60}
                step={1}
                value={catchupStartPadding}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(60, parseInt(e.target.value, 10) || 0));
                  onCatchupStartPaddingChange(val);
                }}
                className="retry-number-input"
              />
              <span className="retry-input-unit">min</span>
            </div>
          </div>

          {/* End Padding */}
          <div className="timeshift-toggle-row">
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">End Padding</span>
              <span className="timeshift-toggle-sub">
                Minutes of extra time to append after the scheduled program end. Avoids cut-offs for slightly delayed programs.
              </span>
            </div>
            <div className="retry-input-wrapper">
              <input
                type="number"
                min={0}
                max={120}
                step={1}
                value={catchupEndPadding}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(120, parseInt(e.target.value, 10) || 0));
                  onCatchupEndPaddingChange(val);
                }}
                className="retry-number-input"
              />
              <span className="retry-input-unit">min</span>
            </div>
          </div>

          {/* Continue Playing */}
          <div className="timeshift-toggle-row" style={{ marginTop: '12px', borderBottom: 'none' }}>
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">Continue Playing past End Time</span>
              <span className="timeshift-toggle-sub">
                Allows the player to keep streaming past the program end time indefinitely (up to 12 hours) on the channel. Highly recommended for sports.
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={catchupContinuePlaying}
                onChange={(e) => onCatchupContinuePlayingChange(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
