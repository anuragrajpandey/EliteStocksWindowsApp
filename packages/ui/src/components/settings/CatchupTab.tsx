import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
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
  useTranslation();
  return (
    <div className="settings-tab-content">
      <div className="settings-section" style={{ paddingTop: '8px' }}>
        <div className="section-header">
          <h3>{i18n.t('settings:playback.catchupTitle')}</h3>
        </div>
        <p className="section-description">
          {i18n.t('settings:playback.catchupDesc')}
        </p>

        <div className="timeshift-settings">
          {/* Start Padding */}
          <div className="timeshift-toggle-row">
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">{i18n.t('settings:playback.startPadding')}</span>
              <span className="timeshift-toggle-sub">
                {i18n.t('settings:playback.startPaddingSub')}
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
              <span className="retry-input-unit">{i18n.t('settings:playback.minUnit')}</span>
            </div>
          </div>

          {/* End Padding */}
          <div className="timeshift-toggle-row">
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">{i18n.t('settings:playback.endPadding')}</span>
              <span className="timeshift-toggle-sub">
                {i18n.t('settings:playback.endPaddingSub')}
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
              <span className="retry-input-unit">{i18n.t('settings:playback.minUnit')}</span>
            </div>
          </div>

          {/* Continue Playing */}
          <div className="timeshift-toggle-row" style={{ marginTop: '12px', borderBottom: 'none' }}>
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">{i18n.t('settings:playback.continuePlaying')}</span>
              <span className="timeshift-toggle-sub">
                {i18n.t('settings:playback.continuePlayingSub')}
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
