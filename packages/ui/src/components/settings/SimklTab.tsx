import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { scrobbler } from '../../services/scrobbler';
import '../Modal.css';
import './PlaybackTab.css';

export function SimklTab() {
  const [simklScrobbleEnabled, setSimklScrobbleEnabled] = useState(false);
  const [simklLinked, setSimklLinked] = useState(false);

  const [authState, setAuthState] = useState<'idle' | 'polling' | 'success' | 'error'>('idle');
  const [userCode, setUserCode] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const pollTimer = useRef<any>(null);
  const countdownTimer = useRef<any>(null);

  const clearTimers = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    pollTimer.current = null;
    countdownTimer.current = null;
  };

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  const loadSettings = async () => {
    if (!window.storage) return;
    try {
      const res = await window.storage.getSettings();
      const s = res.data || {};

      setSimklScrobbleEnabled(s.simklScrobbleEnabled ?? false);
      setSimklLinked(Boolean(s.simklAccessToken));
    } catch (e) {
      console.error('Error loading Simkl settings:', e);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSettingUpdate = async (update: any) => {
    if (!window.storage) return;
    try {
      await window.storage.updateSettings(update);
      await loadSettings();
    } catch (e) {
      console.error('Error updating Simkl settings:', e);
    }
  };

  const startSimklPinAuth = async () => {
    clearTimers();
    setErrorMessage('');
    setAuthState('idle');
    try {
      const pinData = await scrobbler.generateSimklPinCode();
      setUserCode(pinData.user_code);
      setVerificationUrl(pinData.verification_uri || pinData.verification_url || 'https://simkl.com/pin');
      setExpiresIn(pinData.expires_in);
      setAuthState('polling');

      let timeLeft = pinData.expires_in;
      countdownTimer.current = setInterval(() => {
        timeLeft -= 1;
        setExpiresIn(timeLeft);
        if (timeLeft <= 0) {
          clearTimers();
          setAuthState('error');
          setErrorMessage('The code has expired. Please start over.');
        }
      }, 1000);

      const intervalSec = Math.max(1, pinData.interval || 5);
      const startTime = Date.now();
      pollTimer.current = setInterval(async () => {
        if (Date.now() - startTime > pinData.expires_in * 1000) return;
        try {
          const pollRes = await scrobbler.pollSimklPin(pinData.user_code);
          if (pollRes.success) {
            clearTimers();
            setAuthState('success');
            setTimeout(() => {
              setAuthState('idle');
              setUserCode('');
              setVerificationUrl('');
              loadSettings();
            }, 2000);
          } else if (pollRes.error) {
            clearTimers();
            setAuthState('error');
            setErrorMessage(pollRes.error);
          }
        } catch (e) {
          console.error('Simkl polling failed:', e);
        }
      }, intervalSec * 1000);
    } catch (e: any) {
      console.error('Failed to initiate Simkl PIN auth:', e);
      setErrorMessage(e.message || 'Failed to start authentication flow.');
      setAuthState('error');
    }
  };

  const cancelSimklAuth = () => {
    clearTimers();
    setAuthState('idle');
    setUserCode('');
    setVerificationUrl('');
    setErrorMessage('');
  };

  const handleSimklUnlink = async () => {
    if (confirm('Are you sure you want to disconnect your Simkl account?')) {
      await scrobbler.logoutSimkl();
      await loadSettings();
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const authContainerStyle: CSSProperties = {
    marginTop: '16px',
    padding: '20px',
    background: 'rgba(0,0,0,0.25)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.08)',
  };

  return (
    <div className="settings-tab-content">
      <div className="settings-section">
        <div className="section-header">
          <h3>Simkl</h3>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '3px 8px',
            borderRadius: '4px',
            color: simklLinked ? '#2ed573' : 'rgba(255,255,255,0.3)',
            background: simklLinked ? 'rgba(46,213,115,0.1)' : 'rgba(255,255,255,0.03)',
          }}>
            {simklLinked ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        <p className="section-description">
          Automatically scrobble your live playback progress across Movies, TV Shows, and Anime directly to your Simkl profile. Uses Simkl's secure PIN device authorization.
        </p>

        {!simklLinked ? (
          <div>
            {authState === 'idle' && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  className="sync-btn"
                  onClick={startSimklPinAuth}
                  style={{ padding: '8px 20px', fontSize: '0.9rem' }}
                >
                  Connect Simkl Account
                </button>
                <a
                  href="https://simkl.com"
                  target="_blank"
                  rel="noreferrer"
                  className="sync-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 20px',
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                    background: 'rgba(255,255,255,0.05)',
                  }}
                >
                  About Simkl ↗
                </a>
              </div>
            )}

            {authState === 'polling' && (
              <div style={authContainerStyle}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
                  Step 1: Enter this code on Simkl
                </div>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', margin: '0 0 12px 0' }}>
                  Go to Simkl in your browser and enter the code below to grant authorization to ynotv:
                </p>

                <button
                  onClick={() => navigator.clipboard.writeText(userCode)}
                  title="Click to copy"
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '16px',
                    marginBottom: '12px',
                    background: 'rgba(0, 212, 255, 0.1)',
                    border: '1px dashed rgba(0, 212, 255, 0.5)',
                    borderRadius: '8px',
                    color: '#00d4ff',
                    fontWeight: 700,
                    fontSize: '2rem',
                    letterSpacing: '0.4em',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                  }}
                >
                  {userCode}
                </button>

                <div style={{ marginBottom: '12px' }}>
                  <a
                    href={verificationUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '8px 16px',
                      background: 'rgba(0, 212, 255, 0.15)',
                      border: '1px solid rgba(0, 212, 255, 0.4)',
                      borderRadius: '6px',
                      color: '#00d4ff',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                    }}
                  >
                    Open simkl.com/pin ↗
                  </a>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                  {expiresIn > 0 ? `Code expires in ${formatCountdown(expiresIn)}` : 'Checking authorization...'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>
                  Waiting for you to authorize... this page updates automatically.
                </div>

                {errorMessage && (
                  <div style={{ color: '#ff4757', fontSize: '0.82rem', marginBottom: '12px' }}>
                    {errorMessage}
                  </div>
                )}

                <button
                  onClick={cancelSimklAuth}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Cancel Authorization
                </button>
              </div>
            )}

            {authState === 'success' && (
              <div style={{
                ...authContainerStyle,
                background: 'rgba(46,213,115,0.1)',
                borderColor: 'rgba(46,213,115,0.25)',
                color: '#2ed573',
                fontWeight: 600,
                textAlign: 'center',
              }}>
                ✓ Simkl account successfully connected!
              </div>
            )}

            {authState === 'error' && (
              <div style={{
                ...authContainerStyle,
                background: 'rgba(255,71,87,0.1)',
                borderColor: 'rgba(255,71,87,0.25)',
                color: '#ff4757',
                textAlign: 'center',
              }}>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                  {errorMessage || 'Authentication failed.'}
                </div>
                <button
                  className="sync-btn"
                  onClick={startSimklPinAuth}
                  style={{ color: '#ff4757', borderColor: 'rgba(255,71,87,0.4)', background: 'rgba(255,71,87,0.15)' }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="timeshift-toggle-row" style={{ marginBottom: '16px', marginTop: '12px' }}>
              <div className="timeshift-toggle-info">
                <span className="timeshift-toggle-label">Enable Cloud Scrobbling</span>
                <span className="timeshift-toggle-sub">Track what you watch and keep your Simkl profile in sync automatically</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={simklScrobbleEnabled}
                  onChange={(e) => handleSettingUpdate({ simklScrobbleEnabled: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginTop: '16px' }}>
              <a
                href="https://simkl.com"
                target="_blank"
                rel="noreferrer"
                className="sync-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '8px 20px',
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  background: 'rgba(255,255,255,0.05)',
                }}
              >
                About Simkl ↗
              </a>
              <button className="sync-btn danger" onClick={handleSimklUnlink}>
                Disconnect Simkl Account
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="settings-disclaimer">
        Simkl is a third-party tracking service and is not affiliated with this application. Scrobbling updates your watching status automatically when active.
      </p>
    </div>
  );
}
