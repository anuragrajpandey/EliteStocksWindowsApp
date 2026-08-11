import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import * as dialog from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import './PlaybackTab.css';

interface PopoutTabProps {
  popoutStopMain: boolean;
  onPopoutStopMainChange: (stop: boolean) => void;
  popoutAlwaysOnTop: boolean;
  onPopoutAlwaysOnTopChange: (onTop: boolean) => void;
  popoutHwdecEnabled?: boolean;
  onPopoutHwdecEnabledChange?: (enabled: boolean) => Promise<void> | void;
  popoutMpvParamsEnabled: boolean;
  onPopoutMpvParamsEnabledChange: (enabled: boolean) => void;
  popoutMpvParams: string;
  onPopoutMpvParamsChange: (params: string) => void;
  externalPlayerPath: string;
  onExternalPlayerPathChange: (path: string) => void;
  externalPlayerReuse: boolean;
  onExternalPlayerReuseChange: (reuse: boolean) => void;
}

export function PopoutTab({
  popoutStopMain,
  onPopoutStopMainChange,
  popoutAlwaysOnTop,
  onPopoutAlwaysOnTopChange,
  popoutHwdecEnabled,
  onPopoutHwdecEnabledChange,
  popoutMpvParamsEnabled,
  onPopoutMpvParamsEnabledChange,
  popoutMpvParams,
  onPopoutMpvParamsChange,
  externalPlayerPath,
  onExternalPlayerPathChange,
  externalPlayerReuse,
  onExternalPlayerReuseChange,
}: PopoutTabProps) {
  useTranslation();
  const [localParams, setLocalParams] = useState(popoutMpvParams);
  const [hasChanges, setHasChanges] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const isPopoutHwdecOverridden = popoutMpvParamsEnabled && /--?hwdec[=\s]/i.test(localParams);

  useEffect(() => {
    setLocalParams(popoutMpvParams);
    setHasChanges(false);
  }, [popoutMpvParams]);

  const handleParamsChange = (value: string) => {
    setLocalParams(value);
    setHasChanges(value !== popoutMpvParams);
  };

  const handleSave = () => {
    onPopoutMpvParamsChange(localParams.trim());
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalParams('');
    onPopoutMpvParamsChange('');
    setHasChanges(false);
  };

  const checkPopoutParams = async () => {
    try {
      const result = await invoke('popout_get_params_debug') as Record<string, unknown>;
      setDebugInfo(JSON.stringify(result, null, 2));
    } catch (e) {
      setDebugInfo(`Error: ${e}`);
    }
  };

  return (
    <div className="settings-tab-content">
      {/* External Player Section */}
      <div className="settings-section" style={{ paddingTop: '8px' }}>
        <div className="section-header">
          <h3>{i18n.t('settings:playback.externalPlayerTitle')}</h3>
        </div>
        <p className="section-description">
          {i18n.t('settings:playback.externalPlayerDesc')}
        </p>

        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
              {i18n.t('settings:playback.playerPathLabel')}
            </label>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px' }}>
              {i18n.t('settings:playback.playerPathHint')}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={externalPlayerPath}
                onChange={(e) => onExternalPlayerPathChange(e.target.value)}
                placeholder="C:\Program Files\mpv\mpv.exe"
                className="query-input"
                style={{ flex: 1 }}
              />
              <button
                className="sync-btn"
                onClick={async () => {
                  const selected = await dialog.open({
                    multiple: false,
                    filters: [{ name: 'Executable', extensions: ['exe', 'cmd', 'bat'] }]
                  });
                  if (selected) {
                    onExternalPlayerPathChange(selected as string);
                  }
                }}
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {i18n.t('settings:playback.browse')}
              </button>
            </div>
          </div>

          <div className="timeshift-toggle-row" style={{ marginTop: '16px' }}>
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">{i18n.t('settings:playback.reusePlayer')}</span>
              <span className="timeshift-toggle-sub">
                {i18n.t('settings:playback.reusePlayerSub')}
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={externalPlayerReuse}
                onChange={(e) => onExternalPlayerReuseChange(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--surface-border)', margin: '0 0 8px 0' }} />

      {/* Popout Player Section */}
      <div className="settings-section" style={{ paddingTop: '8px' }}>
        <div className="section-header">
          <h3>{i18n.t('settings:playback.popoutTitle')}</h3>
        </div>
        <p className="section-description">
          {i18n.t('settings:playback.popoutDesc')}
        </p>

        <div className="timeshift-settings">
          <div className="timeshift-toggle-row">
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">{i18n.t('settings:playback.stopMain')}</span>
              <span className="timeshift-toggle-sub">
                {i18n.t('settings:playback.stopMainSub')}
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={popoutStopMain}
                onChange={(e) => onPopoutStopMainChange(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="timeshift-toggle-row">
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">{i18n.t('settings:playback.alwaysOnTop')}</span>
              <span className="timeshift-toggle-sub">
                {i18n.t('settings:playback.alwaysOnTopSub')}
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={popoutAlwaysOnTop}
                onChange={(e) => onPopoutAlwaysOnTopChange(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>



          <div className="timeshift-toggle-row" style={{ opacity: isPopoutHwdecOverridden ? 0.75 : 1 }}>
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {i18n.t('settings:playback.hwdecLabel')}
                {isPopoutHwdecOverridden && (
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', background: 'rgba(255, 193, 7, 0.15)', color: '#ffc107', border: '1px solid rgba(255, 193, 7, 0.3)', fontWeight: 500 }}>
                    {i18n.t('settings:playback.hwdecManaged')}
                  </span>
                )}
              </span>
              <span className="timeshift-toggle-sub">
                {isPopoutHwdecOverridden
                  ? i18n.t('settings:playback.hwdecOverriddenHint')
                  : i18n.t('settings:playback.popoutHwdecHint')}
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={popoutHwdecEnabled ?? true}
                disabled={isPopoutHwdecOverridden}
                onChange={(e) => onPopoutHwdecEnabledChange?.(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="timeshift-toggle-row">
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">{i18n.t('settings:playback.extraParams')}</span>
              <span className="timeshift-toggle-sub">
                {i18n.t('settings:playback.extraParamsSub')}
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={popoutMpvParamsEnabled}
                onChange={(e) => onPopoutMpvParamsEnabledChange(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {popoutMpvParamsEnabled && (
            <div style={{ marginTop: '12px' }}>
              <div className="playback-section">
                <div className="playback-label">
                  <span>{i18n.t('settings:playback.extraParamsLabel')}</span>
                  <small>
                    {i18n.t('settings:playback.extraParamsHint')}
                  </small>
                </div>

                <textarea
                  className="mpv-params-input"
                  value={localParams}
                  onChange={(e) => handleParamsChange(e.target.value)}
                  placeholder="--hwdec=auto&#10;--cache=yes&#10;--network-timeout=10"
                  rows={8}
                  spellCheck={false}
                />

                <div className="playback-actions">
                  <button
                    className="save-btn"
                    onClick={handleSave}
                    disabled={!hasChanges}
                  >
                    {hasChanges ? i18n.t('settings:playback.saveChanges') : i18n.t('settings:playback.saved')}
                  </button>
                  <button className="clear-btn" onClick={handleReset}>
                    {i18n.t('common:clearAll')}
                  </button>
                </div>

                <div style={{ marginTop: '20px', borderTop: '1px solid var(--surface-border)', paddingTop: '16px' }}>
                  <button
                    className="sync-btn"
                    onClick={checkPopoutParams}
                    style={{ maxWidth: '260px' }}
                  >
                    {i18n.t('settings:playback.checkPopoutParams')}
                  </button>
                  {debugInfo && (
                    <pre style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      maxHeight: '300px',
                      color: 'var(--text-primary)'
                    }}>
                      {debugInfo}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}