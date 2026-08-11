import { useState } from 'react';
import { relaunch } from '@tauri-apps/plugin-process';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import '../Modal.css';

interface ProxyTabProps {
  socks5ProxyEnabled: boolean;
  onSocks5ProxyEnabledChange: (val: boolean) => void;
  socks5ProxyServer: string;
  onSocks5ProxyServerChange: (val: string) => void;
  socks5ProxyUsername: string;
  onSocks5ProxyUsernameChange: (val: string) => void;
  socks5ProxyPassword: string;
  onSocks5ProxyPasswordChange: (val: string) => void;
}

export function ProxyTab({
  socks5ProxyEnabled,
  onSocks5ProxyEnabledChange,
  socks5ProxyServer,
  onSocks5ProxyServerChange,
  socks5ProxyUsername,
  onSocks5ProxyUsernameChange,
  socks5ProxyPassword,
  onSocks5ProxyPasswordChange,
}: ProxyTabProps) {
  useTranslation();
  const [enabled, setEnabled] = useState(socks5ProxyEnabled);
  const [server, setServer] = useState(socks5ProxyServer);
  const [username, setUsername] = useState(socks5ProxyUsername);
  const [password, setPassword] = useState(socks5ProxyPassword);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);

  // Diagnostics state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; ip?: string; error?: string } | null>(null);

  const hasUnsavedChanges =
    enabled !== socks5ProxyEnabled ||
    server !== socks5ProxyServer ||
    username !== socks5ProxyUsername ||
    password !== socks5ProxyPassword;

  function handleSaveClick() {
    setShowRestartModal(true);
  }

  async function handleSaveAndRestart() {
    setIsSaving(true);
    setSaveStatus('idle');
    setShowRestartModal(false);
    try {
      onSocks5ProxyEnabledChange(enabled);
      onSocks5ProxyServerChange(server);
      onSocks5ProxyUsernameChange(username);
      onSocks5ProxyPasswordChange(password);

      if (window.storage) {
        await window.storage.updateSettings({
          socks5ProxyEnabled: enabled,
          socks5ProxyServer: server,
          socks5ProxyUsername: username,
          socks5ProxyPassword: password,
        });

        // Notify backend to reload environment variables and apply changes
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('update_proxy_settings');
      }
      setSaveStatus('success');
      
      // Relaunch the application to fully apply proxy variables system-wide
      await relaunch();
    } catch (err) {
      console.error('[ProxyTab] Failed to save and restart:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDisableAndRestart() {
    setIsSaving(true);
    setShowDisableModal(false);
    try {
      setEnabled(false);
      onSocks5ProxyEnabledChange(false);
      
      if (window.storage) {
        await window.storage.updateSettings({
          socks5ProxyEnabled: false,
        });

        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('update_proxy_settings');
      }
      setSaveStatus('success');
      
      // Relaunch the application to revert settings system-wide
      await relaunch();
    } catch (err) {
      console.error('[ProxyTab] Failed to disable and restart:', err);
      setSaveStatus('error');
      setEnabled(true); // Revert on failure
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const ip = await invoke<string>('test_proxy_connection');
      setTestResult({ success: true, ip });
    } catch (err: any) {
      console.error('[ProxyTab] Proxy test failed:', err);
      setTestResult({ success: false, error: err?.toString() || 'Unknown error occurred' });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="settings-tab-content" style={{ overflowY: 'auto', maxHeight: '100%' }}>
      {/* Visual Status Indicator Card */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.25rem',
        borderRadius: '8px',
        backgroundColor: socks5ProxyEnabled ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-color)',
        border: socks5ProxyEnabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
        marginBottom: '1.5rem',
        boxShadow: socks5ProxyEnabled ? '0 0 15px rgba(16, 185, 129, 0.1)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            {i18n.t('settings:proxy.systemStatus')}
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: socks5ProxyEnabled ? '#10b981' : 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {socks5ProxyEnabled ? i18n.t('settings:proxy.activeStatus') : i18n.t('settings:proxy.disabledStatus')}
          </div>
          {socks5ProxyEnabled && socks5ProxyServer && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontFamily: 'monospace', opacity: 0.8 }}>
              {i18n.t('settings:proxy.serverLabel', { server: socks5ProxyServer })}
            </div>
          )}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: socks5ProxyEnabled ? '#10b981' : 'var(--text-secondary)',
          fontWeight: 600,
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: socks5ProxyEnabled ? '#10b981' : '#6b7280',
            boxShadow: socks5ProxyEnabled ? '0 0 10px #10b981' : 'none',
            transition: 'all 0.3s ease',
          }} />
          {socks5ProxyEnabled ? i18n.t('settings:proxy.active') : i18n.t('settings:proxy.inactive')}
        </div>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <h3>{i18n.t('settings:proxy.title')}</h3>
        </div>

        <p className="section-description">
          {i18n.t('settings:proxy.description')}
        </p>

        <div className="tmdb-form" style={{ marginTop: '1.5rem' }}>
          {/* Toggle Button */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="genre-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => {
                  const nextVal = e.target.checked;
                  if (!nextVal && socks5ProxyEnabled) {
                    setShowDisableModal(true);
                  } else {
                    setEnabled(nextVal);
                    setSaveStatus('idle');
                  }
                }}
              />
              <span className="genre-name" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                {i18n.t('settings:proxy.enableProxy')}
              </span>
            </label>
            <p className="form-hint" style={{ marginTop: '0.5rem' }}>
              {i18n.t('settings:proxy.enableProxyHint')}
            </p>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem', opacity: enabled ? 1 : 0.5, transition: 'opacity 0.2s' }}>
            <label>{i18n.t('settings:proxy.serverAddress')}</label>
            <input
              type="text"
              value={server}
              disabled={!enabled}
              onChange={(e) => {
                setServer(e.target.value);
                setSaveStatus('idle');
              }}
              placeholder={i18n.t('settings:proxy.serverPlaceholder')}
              style={{ width: '100%' }}
            />
            <p className="form-hint">
              {i18n.t('settings:proxy.serverHint')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem', opacity: enabled ? 1 : 0.5, transition: 'opacity 0.2s' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>{i18n.t('settings:proxy.username')}</label>
              <input
                type="text"
                value={username}
                disabled={!enabled}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setSaveStatus('idle');
                }}
                placeholder={i18n.t('settings:proxy.usernamePlaceholder')}
                style={{ width: '100%' }}
              />
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>{i18n.t('settings:proxy.password')}</label>
              <input
                type="password"
                value={password}
                disabled={!enabled}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSaveStatus('idle');
                }}
                placeholder={i18n.t('settings:proxy.passwordPlaceholder')}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="form-group inline" style={{ marginTop: '2rem' }}>
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={isSaving}
              className={saveStatus === 'success' ? 'success' : saveStatus === 'error' ? 'error' : 'save-btn'}
              style={{ minWidth: '180px' }}
            >
              {isSaving ? i18n.t('settings:proxy.saving') : saveStatus === 'success' ? i18n.t('settings:proxy.saved') : saveStatus === 'error' ? i18n.t('settings:proxy.failed') : i18n.t('settings:proxy.saveProxy')}
            </button>
          </div>
        </div>
      </div>

      {/* Diagnostics / Verification Section */}
      <div className="settings-section" style={{ marginTop: '2.5rem', borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem' }}>
        <div className="section-header">
          <h3>{i18n.t('settings:proxy.diagnosticsTitle')}</h3>
        </div>
        <p className="section-description">
          {i18n.t('settings:proxy.diagnosticsSub')}
        </p>

        <div style={{ marginTop: '1.25rem' }}>
          {hasUnsavedChanges && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              color: '#f59e0b',
              fontSize: '0.85rem',
              marginBottom: '1rem',
            }}>
              <span style={{ fontSize: '1.1rem' }}>⚠️</span>
              <span>
                {i18n.t('settings:proxy.unsavedWarning')}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !socks5ProxyEnabled}
              className="sync-button"
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.85rem',
                opacity: socks5ProxyEnabled ? 1 : 0.5,
                cursor: socks5ProxyEnabled ? 'pointer' : 'not-allowed',
              }}
            >
              {testing ? i18n.t('settings:proxy.testing') : i18n.t('settings:proxy.runTest')}
            </button>
            {!socks5ProxyEnabled && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {i18n.t('settings:proxy.enableToTest')}
              </span>
            )}
          </div>

          {testResult && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '6px',
              backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: testResult.success ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
              color: testResult.success ? '#10b981' : '#ef4444',
              fontSize: '0.85rem',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {testResult.success ? (
                  <>
                    <span>✓</span> {i18n.t('settings:proxy.testSuccess')}
                  </>
                ) : (
                  <>
                    <span>✗</span> {i18n.t('settings:proxy.testFailed')}
                  </>
                )}
              </div>
              <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                {testResult.success ? (
                  <>
                    {i18n.t('settings:proxy.egressIp')}: <strong style={{ color: '#10b981' }}>{testResult.ip}</strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem', fontFamily: 'sans-serif' }}>
                      {i18n.t('settings:proxy.routingOk')}
                    </div>
                  </>
                ) : (
                  <>
                    {i18n.t('settings:proxy.errorDetail')}: {testResult.error}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verification / FAQ Guide */}
      <div className="settings-section" style={{ marginTop: '2.5rem', borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
        <div className="section-header">
          <h3>{i18n.t('settings:proxy.faqTitle')}</h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {i18n.t('settings:proxy.faqQ1')}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {i18n.t('settings:proxy.faqA1Pre')}<code>--http-proxy</code>{i18n.t('settings:proxy.faqA1Mid')}<code>socks5h://</code>{i18n.t('settings:proxy.faqA1Post')}
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {i18n.t('settings:proxy.faqQ2')}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {i18n.t('settings:proxy.faqA2Pre')}<strong>{i18n.t('settings:proxy.faqA2Strong')}</strong>{i18n.t('settings:proxy.faqA2Post')}
            </p>
          </div>
        </div>
      </div>

      <p className="settings-disclaimer">
        {i18n.t('settings:proxy.disclaimer')}
      </p>

      {showRestartModal && (
        <div className="modal-overlay" onClick={() => setShowRestartModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{i18n.t('settings:proxy.restartRequired')}</h3>
            </div>
            <div className="modal-body">
              <p className="modal-message">
                {i18n.t('settings:proxy.restartMsg')}
                <br /><br />
                {i18n.t('settings:proxy.restartQuestion')}
              </p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-secondary" onClick={() => setShowRestartModal(false)}>
                {i18n.t('common:cancel')}
              </button>
              <button className="modal-btn modal-btn-primary" onClick={handleSaveAndRestart}>
                {i18n.t('settings:proxy.saveAndRestart')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDisableModal && (
        <div className="modal-overlay" onClick={() => {
          setShowDisableModal(false);
          setEnabled(true);
        }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{i18n.t('settings:proxy.restartRequiredDisable')}</h3>
            </div>
            <div className="modal-body">
              <p className="modal-message">
                {i18n.t('settings:proxy.restartDisableMsg')}
                <br /><br />
                {i18n.t('settings:proxy.disableQuestion')}
              </p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-secondary" onClick={() => {
                setShowDisableModal(false);
                setEnabled(true);
              }}>
                {i18n.t('common:cancel')}
              </button>
              <button className="modal-btn modal-btn-primary" onClick={handleDisableAndRestart}>
                {i18n.t('settings:proxy.disableAndRestart')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
