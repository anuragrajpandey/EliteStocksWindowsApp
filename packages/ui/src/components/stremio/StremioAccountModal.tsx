import { useState, useEffect } from 'react';
import { useStremioAuthStore } from '../../stores/stremioAuthStore';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { formatTime } from '../../utils/dateTime';
import './StremioAccountModal.css';

interface StremioAccountModalProps {
  onClose: () => void;
}

export function StremioAccountModal({ onClose }: StremioAccountModalProps) {
  useTranslation();
  const {
    authKey,
    user,
    syncLibrary,
    syncProgress,
    syncAddons,
    isSyncing,
    error,
    login,
    logout,
    setSyncLibrary,
    setSyncProgress,
    setSyncAddons,
    syncNow,
    lastSyncTime,
  } = useStremioAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setLocalError(error);
  }, [error]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setLocalError(null);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setLocalError(err.message ?? 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    return formatTime(new Date(lastSyncTime), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="stremio-modal-backdrop" onClick={onClose}>
      <div className="stremio-account-modal" onClick={(e) => e.stopPropagation()}>
        <div className="stremio-modal-header">
          <h2>{i18n.t('stremio:stremioAccount')}</h2>
          <button className="stremio-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="stremio-modal-body">
          {!authKey ? (
            <form onSubmit={handleLogin} className="stremio-login-form">
              <p className="stremio-login-subtitle">
                {i18n.t('stremio:loginSubtitle')}
              </p>

              {localError && <div className="stremio-form-error">{localError}</div>}

              <div className="stremio-input-group">
                <label htmlFor="stremio-email">{i18n.t('stremio:emailAddress')}</label>
                <input
                  id="stremio-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="stremio-input-group">
                <label htmlFor="stremio-password">{i18n.t('stremio:password')}</label>
                <input
                  id="stremio-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="stremio-sync-settings stremio-login-sync-settings">
                <h3>{i18n.t('stremio:initialSyncSettings')}</h3>

                <div className="stremio-toggle-row">
                  <div className="stremio-toggle-info">
                    <span className="stremio-toggle-title">{i18n.t('stremio:syncLibraryWatchlist')}</span>
                    <span className="stremio-toggle-desc">{i18n.t('stremio:syncLibraryWatchlistDescLogin')}</span>
                  </div>
                  <label className="stremio-switch">
                    <input
                      type="checkbox"
                      checked={syncLibrary}
                      onChange={(e) => setSyncLibrary(e.target.checked)}
                      disabled={loading}
                    />
                    <span className="stremio-slider"></span>
                  </label>
                </div>

                <div className="stremio-toggle-row">
                  <div className="stremio-toggle-info">
                    <span className="stremio-toggle-title">{i18n.t('stremio:syncPlaybackProgress')}</span>
                    <span className="stremio-toggle-desc">{i18n.t('stremio:syncPlaybackProgressDescLogin')}</span>
                  </div>
                  <label className="stremio-switch">
                    <input
                      type="checkbox"
                      checked={syncProgress}
                      onChange={(e) => setSyncProgress(e.target.checked)}
                      disabled={loading}
                    />
                    <span className="stremio-slider"></span>
                  </label>
                </div>

                <div className="stremio-toggle-row">
                  <div className="stremio-toggle-info">
                    <span className="stremio-toggle-title">{i18n.t('stremio:syncAddons')}</span>
                    <span className="stremio-toggle-desc">{i18n.t('stremio:syncAddonsDescLogin')}</span>
                  </div>
                  <label className="stremio-switch">
                    <input
                      type="checkbox"
                      checked={syncAddons}
                      onChange={(e) => setSyncAddons(e.target.checked)}
                      disabled={loading}
                    />
                    <span className="stremio-slider"></span>
                  </label>
                </div>
              </div>

              {syncAddons && (
                <div className="stremio-login-warning">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="warning-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{i18n.t('stremio:syncAddonsWarning')}</span>
                </div>
              )}

              <button type="submit" className="stremio-login-btn" disabled={loading}>
                {loading ? i18n.t('stremio:loggingIn') : i18n.t('stremio:logIn')}
              </button>
              <p className="stremio-login-disclaimer">
                {i18n.t('stremio:disclaimer')}
              </p>
            </form>
          ) : (
            <div className="stremio-account-details">
              <div className="stremio-user-profile">
                <div className="stremio-avatar">
                  {user?.fullname ? user.fullname.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="stremio-user-info">
                  <div className="stremio-user-name">{user?.fullname || i18n.t('stremio:stremioUser')}</div>
                  <div className="stremio-user-email">{user?.email}</div>
                  <div className="stremio-status-badge">{i18n.t('stremio:connected')}</div>
                </div>
              </div>

              {localError && <div className="stremio-form-error">{localError}</div>}

              <div className="stremio-sync-settings">
                <h3>{i18n.t('stremio:syncSettings')}</h3>

                <div className="stremio-toggle-row">
                  <div className="stremio-toggle-info">
                    <span className="stremio-toggle-title">{i18n.t('stremio:syncLibraryWatchlist')}</span>
                    <span className="stremio-toggle-desc">{i18n.t('stremio:syncLibraryWatchlistDesc')}</span>
                  </div>
                  <label className="stremio-switch">
                    <input
                      type="checkbox"
                      checked={syncLibrary}
                      onChange={(e) => setSyncLibrary(e.target.checked)}
                    />
                    <span className="stremio-slider"></span>
                  </label>
                </div>

                <div className="stremio-toggle-row">
                  <div className="stremio-toggle-info">
                    <span className="stremio-toggle-title">{i18n.t('stremio:syncPlaybackProgress')}</span>
                    <span className="stremio-toggle-desc">{i18n.t('stremio:syncPlaybackProgressDesc')}</span>
                  </div>
                  <label className="stremio-switch">
                    <input
                      type="checkbox"
                      checked={syncProgress}
                      onChange={(e) => setSyncProgress(e.target.checked)}
                    />
                    <span className="stremio-slider"></span>
                  </label>
                </div>

                <div className="stremio-toggle-row">
                  <div className="stremio-toggle-info">
                    <span className="stremio-toggle-title">{i18n.t('stremio:syncAddons')}</span>
                    <span className="stremio-toggle-desc">{i18n.t('stremio:syncAddonsDesc')}</span>
                  </div>
                  <label className="stremio-switch">
                    <input
                      type="checkbox"
                      checked={syncAddons}
                      onChange={(e) => setSyncAddons(e.target.checked)}
                    />
                    <span className="stremio-slider"></span>
                  </label>
                </div>
              </div>

              <div className="stremio-sync-actions">
                <div className="stremio-sync-meta">
                  {i18n.t('stremio:lastSynced')}: <span className="sync-time">{formatLastSync()}</span>
                </div>
                <div className="stremio-action-buttons">
                  <button
                    className="stremio-sync-now-btn"
                    onClick={() => syncNow()}
                    disabled={isSyncing}
                  >
                    {isSyncing ? i18n.t('stremio:syncing') : i18n.t('stremio:syncNow')}
                  </button>
                  <button className="stremio-logout-btn" onClick={logout}>
                    {i18n.t('stremio:logOut')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
