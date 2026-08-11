import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

interface DiscordTabProps {
  discordRichPresence: boolean;
  onDiscordRichPresenceChange: (enabled: boolean) => void;
  discordHideTitle: boolean;
  onDiscordHideTitleChange: (enabled: boolean) => void;
  discordShowWhenPaused: boolean;
  onDiscordShowWhenPausedChange: (enabled: boolean) => void;
  discordShowWhenBrowsing: boolean;
  onDiscordShowWhenBrowsingChange: (enabled: boolean) => void;
  discordShowPoster: boolean;
  onDiscordShowPosterChange: (enabled: boolean) => void;
  discordShowTimestamp: boolean;
  onDiscordShowTimestampChange: (enabled: boolean) => void;
}

export function DiscordTab({
  discordRichPresence,
  onDiscordRichPresenceChange,
  discordHideTitle,
  onDiscordHideTitleChange,
  discordShowWhenPaused,
  onDiscordShowWhenPausedChange,
  discordShowWhenBrowsing,
  onDiscordShowWhenBrowsingChange,
  discordShowPoster,
  onDiscordShowPosterChange,
  discordShowTimestamp,
  onDiscordShowTimestampChange,
}: DiscordTabProps) {
  useTranslation();
  return (
    <div className="settings-tab-content" style={{ overflowY: 'auto', maxHeight: '100%', textTransform: 'none' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderRadius: '10px',
          backgroundColor: discordRichPresence ? 'rgba(88, 101, 242, 0.12)' : 'var(--surface-color)',
          border: discordRichPresence ? '1px solid rgba(88, 101, 242, 0.35)' : '1px solid var(--border-color)',
          marginBottom: '1.75rem',
          boxShadow: discordRichPresence ? '0 0 20px rgba(88, 101, 242, 0.12)' : 'none',
          transition: 'all 0.3s ease',
          textTransform: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <svg width="42" height="32" viewBox="0 0 127.14 96.36" fill="#5865F2">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22c2.72-27.18-4.57-50.9-18.9-72.15ZM42.45,65.69C36.18,65.69,31,59.93,31,52.87s5-12.81,11.45-12.81C48.9,40.06,54,45.82,53.89,52.87S48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,59.93,73.25,52.87s5-12.81,11.44-12.81C91.13,40.06,96.2,45.82,96.1,52.87S91.07,65.69,84.69,65.69Z" />
          </svg>
          <div>
            <div style={{ fontSize: '0.8rem', textTransform: 'none', letterSpacing: 'normal', color: 'var(--text-secondary)' }}>
              {i18n.t('settings:discord.integration')}
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, textTransform: 'none', color: discordRichPresence ? '#5865F2' : 'var(--text-secondary)', marginTop: '0.2rem' }}>
              {discordRichPresence ? i18n.t('settings:discord.activeStatus') : i18n.t('settings:discord.disabledStatus')}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', textTransform: 'none', color: discordRichPresence ? '#5865F2' : 'var(--text-secondary)', fontWeight: 600 }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: discordRichPresence ? '#5865F2' : '#6b7280', boxShadow: discordRichPresence ? '0 0 10px #5865F2' : 'none' }} />
          {discordRichPresence ? i18n.t('settings:discord.active') : i18n.t('settings:discord.inactive')}
        </div>
      </div>

      {/* Main Settings Section */}
      <div className="settings-section" style={{ textTransform: 'none' }}>
        <div className="section-header">
          <h3 style={{ textTransform: 'none', letterSpacing: 'normal', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {i18n.t('settings:discord.title')}
          </h3>
        </div>
        <p className="section-description" style={{ textTransform: 'none', letterSpacing: 'normal' }}>
          {i18n.t('settings:discord.description')}
        </p>

        <div className="tmdb-form" style={{ marginTop: '1.5rem', textTransform: 'none' }}>
          {/* Main Enable Toggle */}
          <div className="form-group" style={{ marginBottom: '1.75rem', textTransform: 'none' }}>
            <label className="genre-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none', textTransform: 'none' }}>
              <input
                type="checkbox"
                checked={discordRichPresence}
                onChange={(e) => onDiscordRichPresenceChange(e.target.checked)}
              />
              <span className="genre-name" style={{ fontSize: '1rem', fontWeight: 600, textTransform: 'none', letterSpacing: 'normal' }}>
                {i18n.t('settings:discord.showOnDiscord')}
              </span>
            </label>
            <p className="form-hint" style={{ marginTop: '0.5rem', textTransform: 'none', letterSpacing: 'normal' }}>
              {i18n.t('settings:discord.showOnDiscordHint')}
            </p>
          </div>

          {/* Sub-options revealed when enabled */}
          {discordRichPresence && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingLeft: '1rem', borderLeft: '2px solid rgba(88, 101, 242, 0.3)', marginTop: '1.25rem', textTransform: 'none' }}>
              <SubToggleRow
                title={i18n.t('settings:discord.hideTitle')}
                description={i18n.t('settings:discord.hideTitleDesc')}
                checked={discordHideTitle}
                onChange={onDiscordHideTitleChange}
              />

              <SubToggleRow
                title={i18n.t('settings:discord.showPaused')}
                description={i18n.t('settings:discord.showPausedDesc')}
                checked={discordShowWhenPaused}
                onChange={onDiscordShowWhenPausedChange}
              />

              <SubToggleRow
                title={i18n.t('settings:discord.showBrowsing')}
                description={i18n.t('settings:discord.showBrowsingDesc')}
                checked={discordShowWhenBrowsing}
                onChange={onDiscordShowWhenBrowsingChange}
              />

              <SubToggleRow
                title={i18n.t('settings:discord.showPoster')}
                description={i18n.t('settings:discord.showPosterDesc')}
                checked={discordShowPoster}
                onChange={onDiscordShowPosterChange}
              />

              <SubToggleRow
                title={i18n.t('settings:discord.showTimestamp')}
                description={i18n.t('settings:discord.showTimestampDesc')}
                checked={discordShowTimestamp}
                onChange={onDiscordShowTimestampChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="form-group" style={{ marginBottom: 0, textTransform: 'none' }}>
      <label className="genre-checkbox" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', userSelect: 'none', textTransform: 'none' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ marginTop: '0.2rem' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', textTransform: 'none' }}>
          <span className="genre-name" style={{ fontSize: '0.92rem', fontWeight: 600, textTransform: 'none', letterSpacing: 'normal' }}>
            {title}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: '1.35', textTransform: 'none', letterSpacing: 'normal' }}>
            {description}
          </span>
        </div>
      </label>
    </div>
  );
}
