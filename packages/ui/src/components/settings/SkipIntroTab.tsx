import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import './PlaybackTab.css';

interface SkipIntroTabProps {
  skipIntroTimerSeconds: number;
  onSkipIntroTimerSecondsChange: (seconds: number) => void;
  skipIntroAutoSkip: boolean;
  onSkipIntroAutoSkipChange: (auto: boolean) => void;
}

export function SkipIntroTab({
  skipIntroTimerSeconds,
  onSkipIntroTimerSecondsChange,
  skipIntroAutoSkip,
  onSkipIntroAutoSkipChange,
}: SkipIntroTabProps) {
  useTranslation();
  return (
    <div className="settings-tab-content">
      <div className="settings-section" style={{ paddingTop: '8px' }}>
        <div className="section-header">
          <h3>{i18n.t('settings:playback.skipIntroTitle')}</h3>
        </div>
        <p className="section-description">
          {i18n.t('settings:playback.skipIntroDesc')}
        </p>

        <div className="timeshift-settings">
          <div className="timeshift-toggle-row">
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">{i18n.t('settings:playback.autoSkip')}</span>
              <span className="timeshift-toggle-sub">
                {i18n.t('settings:playback.autoSkipSub')}
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={skipIntroAutoSkip}
                onChange={(e) => onSkipIntroAutoSkipChange(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="timeshift-toggle-row">
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">{i18n.t('settings:playback.buttonDuration')}</span>
              <span className="timeshift-toggle-sub">
                {i18n.t('settings:playback.buttonDurationSub')}
              </span>
            </div>
            <input
              type="number"
              min={3}
              max={30}
              step={1}
              value={skipIntroTimerSeconds}
              onChange={(e) => {
                const n = Math.max(3, Math.min(30, parseInt(e.target.value, 10) || 10));
                onSkipIntroTimerSecondsChange(n);
              }}
              className="query-input"
              style={{ width: '80px', textAlign: 'center' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}