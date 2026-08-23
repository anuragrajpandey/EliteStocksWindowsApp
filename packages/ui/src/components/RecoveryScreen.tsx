import { useState } from 'react';
import { exportAllData, importAllData } from '../utils/exportImport';
import { clearAllCachedData } from '../db';
import { formatBytes, type DbHealth } from '../services/recovery';
import { clearLocalStorage } from '../services/safeStorage';

interface RecoveryScreenProps {
  health: DbHealth;
  onContinue: () => void;
}

/**
 * Shown instead of the normal UI when the database is oversized or fails to
 * open. Lets the user export their settings/user data, rebuild the database
 * cache, or restore a previous backup before the app would otherwise appear
 * broken (or invisible) on startup.
 */
export function RecoveryScreen({ health, onContinue }: RecoveryScreenProps) {
  const [exporting, setExporting] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAction = async (
    action: () => Promise<void>,
    setBusy: (b: boolean) => void
  ) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleExport = () =>
    runAction(async () => {
      const result = await exportAllData();
      if (result.success) {
        setMessage('Backup saved successfully. Keep this file somewhere safe.');
      } else if (result.error && result.error !== 'Cancelled') {
        throw new Error(result.error);
      }
    }, setExporting);

  const handleRebuild = () =>
    runAction(async () => {
      const confirmed = window.confirm(
        'This will clear the downloaded channel/EPG/VOD cache and rebuild the database to a smaller size. ' +
          'Your sources, settings, favorites, and other user data are preserved. ' +
          'The app will restart and re-sync your sources automatically.\n\nContinue?'
      );
      if (!confirmed) return;
      await clearAllCachedData();
      setMessage('Database rebuilt successfully. Restarting...');
      setTimeout(() => window.location.reload(), 600);
    }, setRebuilding);

  const handleImport = () =>
    runAction(async () => {
      const confirmed = window.confirm(
        'Importing a backup will replace your current settings and user data with the backup contents. ' +
          'For a rebuilt database, wait until your sources have finished syncing before importing.\n\nContinue?'
      );
      if (!confirmed) return;
      const result = await importAllData();
      if (!result.success && result.error && result.error !== 'Cancelled') {
        throw new Error(result.error);
      }
      setMessage('Backup imported. Reloading...');
      setTimeout(() => window.location.reload(), 600);
    }, setImporting);

  const handleClearStorage = () =>
    runAction(async () => {
      const confirmed = window.confirm(
        'This clears the app\'s browser storage (expanded-sidebar state, recent channels, search ' +
          'history, widget layout, cached sports data, etc.). It does NOT touch your sources, ' +
          'settings, favorites, or the database. Use this if the app keeps crashing with a ' +
          'storage-quota error.\n\nContinue?'
      );
      if (!confirmed) return;
      clearLocalStorage();
      setMessage('App storage cleared. Reloading...');
      setTimeout(() => window.location.reload(), 600);
    }, setRebuilding);

  const dbUnavailable = !health.opens_ok;

  const styles = {
    wrapper: {
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0b0e14',
      color: '#e8ecf3',
      fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      padding: '24px',
    } as const,
    card: {
      width: '100%',
      maxWidth: '560px',
      background: '#11161f',
      border: '1px solid #232b3a',
      borderRadius: '12px',
      padding: '28px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    } as const,
    title: { fontSize: '20px', fontWeight: 600, color: '#ffffff' } as const,
    subtitle: { fontSize: '13px', color: '#9aa3b2', lineHeight: 1.5 } as const,
    infoRow: { display: 'flex', gap: '16px', fontSize: '13px', color: '#9aa3b2', flexWrap: 'wrap' as const },
    button: {
      padding: '10px 16px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      background: '#00d4ff',
      color: '#06131a',
    } as const,
    buttonSecondary: {
      background: '#1c2533',
      color: '#d6dde8',
      border: '1px solid #2c3a52',
    } as const,
    buttonDanger: {
      background: '#b42318',
      color: '#ffffff',
    } as const,
    disabled: { opacity: 0.5, cursor: 'not-allowed' } as const,
    message: { color: '#34d399', fontSize: '13px' } as const,
    error: { color: '#f87171', fontSize: '13px', whiteSpace: 'pre-wrap' as const },
    action: { display: 'flex', flexDirection: 'column', gap: '4px' } as const,
    actionHint: { fontSize: '12px', color: '#6b7280' } as const,
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '1px', color: '#00d4ff' }}>EliteStocks TV</div>
        <div style={styles.title}>Database recovery</div>
        <div style={styles.subtitle}>
          The app detected a problem with its database that can prevent it from starting normally.
          You can export a backup of your settings and data, rebuild the database, or restore a
          previous backup below.
        </div>

        <div style={styles.infoRow}>
          <span>Database: <b>{formatBytes(health.db_size)}</b></span>
          <span>Write-ahead log: <b>{formatBytes(health.wal_size)}</b></span>
          <span>Database opens: <b style={{ color: health.opens_ok ? '#34d399' : '#f87171' }}>{health.opens_ok ? 'yes' : 'no'}</b></span>
        </div>

        {dbUnavailable && (
          <div style={styles.error}>
            The database is not responding{health.error ? `: ${health.error}` : ''}. Rebuild and export
            may not work until the app is restarted. Exporting your settings file is still the safest
            first step; if needed, close the app and delete{' '}
            <code>%APPDATA%\com.ynotv.app\ynotv.db</code> (plus <code>ynotv.db-wal</code>) manually,
            then relaunch.
          </div>
        )}

        <div style={styles.action}>
          <button
            style={{ ...styles.button, ...styles.buttonSecondary, ...(exporting ? styles.disabled : {}) }}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exporting…' : 'Export settings & user data'}
          </button>
          <span style={styles.actionHint}>
            Saves your sources, settings, favorites, watchlist, EPG edits, playlist editor data, DVR
            schedules/recordings and more to a JSON file.
          </span>
        </div>

        <div style={styles.action}>
          <button
            style={{ ...styles.button, ...styles.buttonDanger, ...(rebuilding || dbUnavailable ? styles.disabled : {}) }}
            onClick={handleRebuild}
            disabled={rebuilding || dbUnavailable}
          >
            {rebuilding ? 'Rebuilding… (can take a while on a large database)' : 'Rebuild database (clear cache, keep user data)'}
          </button>
          <span style={styles.actionHint}>
            Clears downloaded channels/EPG/VOD cache, shrinks the database file, restarts, and
            re-syncs your sources automatically. Favorites and other user data are preserved.
          </span>
        </div>

        <div style={styles.action}>
          <button
            style={{ ...styles.button, ...styles.buttonSecondary, ...(importing ? styles.disabled : {}) }}
            onClick={handleImport}
            disabled={importing}
          >
            {importing ? 'Importing…' : 'Import backup'}
          </button>
          <span style={styles.actionHint}>
            Restores a previously exported backup. If you just rebuilt the database, wait until your
            sources have finished syncing first.
          </span>
        </div>

        {message && <div style={styles.message}>{message}</div>}
        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.action}>
          <button
            style={{ ...styles.button, ...styles.buttonSecondary, ...(rebuilding ? styles.disabled : {}) }}
            onClick={handleClearStorage}
            disabled={rebuilding}
          >
            Clear app storage (fixes storage-quota crashes)
          </button>
          <span style={styles.actionHint}>
            Clears localStorage (sidebar state, recent channels, search history, widget layout).
            Sources, settings, favorites and the database are untouched.
          </span>
        </div>

        <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={onContinue}>
          Continue anyway
        </button>
      </div>
    </div>
  );
}
