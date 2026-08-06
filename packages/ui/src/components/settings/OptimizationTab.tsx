import { useState } from 'react';
import { relaunch } from '@tauri-apps/plugin-process';
import { useAppSettings } from '../../hooks/useAppSettings';

export function OptimizationTab() {
  const {
    hardwareAcceleration,
    setHardwareAcceleration,
    disableThemeBackdropBlur,
    setDisableThemeBackdropBlur,
    epgLazyLoadingEnabled,
    setEpgLazyLoadingEnabled,
    disableEpgTransitions,
    setDisableEpgTransitions,
    epgReduceGpuLayers,
    setEpgReduceGpuLayers,
    epgDisableChannelFade,
    setEpgDisableChannelFade,
  } = useAppSettings();

  const [showRestartModal, setShowRestartModal] = useState(false);
  const [pendingHwAccel, setPendingHwAccel] = useState<boolean | null>(null);

  const handleHwAccelToggle = (newValue: boolean) => {
    setPendingHwAccel(newValue);
    setShowRestartModal(true);
  };

  const confirmRestart = async () => {
    if (pendingHwAccel !== null) {
      await setHardwareAcceleration(pendingHwAccel);
    }
    setShowRestartModal(false);
    try {
      await relaunch();
    } catch (e) {
      console.error('[OptimizationTab] Failed to relaunch app:', e);
    }
  };

  const confirmSaveWithoutRestart = async () => {
    if (pendingHwAccel !== null) {
      await setHardwareAcceleration(pendingHwAccel);
    }
    setShowRestartModal(false);
  };

  return (
    <div className="settings-tab-content">
      {/* Hardware Acceleration Section */}
      <div className="settings-section" style={{ paddingTop: '8px' }}>
        <div className="section-header">
          <h3>Hardware Acceleration</h3>
        </div>

        <p className="section-description">
          Configure GPU hardware acceleration for interface rendering and window compositing.
        </p>

        <div className="tmdb-form" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label className="genre-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', maxWidth: '450px' }}>
              <input
                type="checkbox"
                checked={hardwareAcceleration}
                onChange={(e) => handleHwAccelToggle(e.target.checked)}
              />
              <span className="genre-name" style={{ fontWeight: 600, fontSize: '0.95rem' }}>Enable GPU Hardware Acceleration</span>
            </label>
            <p className="form-hint" style={{ marginTop: '0.4rem', marginLeft: '26px', opacity: 0.8, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Offloads UI compositing, glass animations, and layout rendering to your graphics processor (integrated or dedicated GPU). Keep enabled for lowest CPU usage. If you experience screen flickering (such as with G-Sync windowed mode) or display driver crashes, you can disable this option. <em style={{ color: 'var(--accent-color, #00d4ff)' }}>(Requires App Restart)</em>
            </p>
          </div>
        </div>
      </div>

      {/* Theme Optimization Section */}
      <div className="settings-section" style={{ marginTop: '2rem' }}>
        <div className="section-header">
          <h3>Theme Optimization</h3>
        </div>

        <p className="section-description">
          Customize theme rendering performance. If you experience high GPU usage, interface lag, or frame drops when using the glass, gradient, or solid themes, you can disable individual intensive effects here.
        </p>

        <div className="tmdb-form" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label className="genre-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', maxWidth: '450px' }}>
              <input
                type="checkbox"
                checked={disableThemeBackdropBlur}
                onChange={(e) => setDisableThemeBackdropBlur(e.target.checked)}
              />
              <span className="genre-name" style={{ fontWeight: 600, fontSize: '0.95rem' }}>Disable Glass Backdrop Blur</span>
            </label>
            <p className="form-hint" style={{ marginTop: '0.4rem', marginLeft: '26px', opacity: 0.8, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Removes the backdrop blur effect from cards, menus, and overlays. Significantly increases UI responsiveness on integrated or older graphics processors.
            </p>
          </div>
        </div>
      </div>

      {/* EPG Optimization Section */}
      <div className="settings-section" style={{ marginTop: '2rem' }}>
        <div className="section-header">
          <h3>EPG Optimization</h3>
        </div>

        <p className="section-description">
          Optimize EPG guide performance and loading speeds, especially when using large playlists.
        </p>

        <div className="tmdb-form" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label className="genre-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', maxWidth: '450px' }}>
              <input
                type="checkbox"
                checked={epgLazyLoadingEnabled}
                onChange={(e) => setEpgLazyLoadingEnabled(e.target.checked)}
              />
              <span className="genre-name" style={{ fontWeight: 600, fontSize: '0.95rem' }}>Enable EPG Lazy Loading</span>
            </label>
            <p className="form-hint" style={{ marginTop: '0.4rem', marginLeft: '26px', opacity: 0.8, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Only loads EPG programs for the visible time window (plus a small scroll buffer) rather than loading the entire EPG guide database upfront. Recommended for large playlists to reduce memory usage and scroll lag.
            </p>
          </div>

          <div>
            <label className="genre-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', maxWidth: '450px' }}>
              <input
                type="checkbox"
                checked={disableEpgTransitions}
                onChange={(e) => setDisableEpgTransitions(e.target.checked)}
              />
              <span className="genre-name" style={{ fontWeight: 600, fontSize: '0.95rem' }}>Disable EPG Card Shadows & Transitions</span>
            </label>
            <p className="form-hint" style={{ marginTop: '0.4rem', marginLeft: '26px', opacity: 0.8, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Disables animations, hover scales, and drop shadows on the timeline program blocks, channel info hover transitions, and the channel name marquee scroll. Reduces GPU paint spikes when scrolling the guide.
            </p>
          </div>

          <div>
            <label className="genre-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', maxWidth: '450px' }}>
              <input
                type="checkbox"
                checked={epgReduceGpuLayers}
                onChange={(e) => setEpgReduceGpuLayers(e.target.checked)}
              />
              <span className="genre-name" style={{ fontWeight: 600, fontSize: '0.95rem' }}>Reduce EPG Scroll Rendering Work</span>
            </label>
            <p className="form-hint" style={{ marginTop: '0.4rem', marginLeft: '26px', opacity: 0.8, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Adds paint and layout containment to guide rows and program grids so scrolling repaints less of the EPG at once. Recommended if the guide feels heavy while scrolling.
            </p>
          </div>

          <div>
            <label className="genre-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', maxWidth: '450px' }}>
              <input
                type="checkbox"
                checked={epgDisableChannelFade}
                onChange={(e) => setEpgDisableChannelFade(e.target.checked)}
              />
              <span className="genre-name" style={{ fontWeight: 600, fontSize: '0.95rem' }}>Disable EPG Channel Name Gradient Fade</span>
            </label>
            <p className="form-hint" style={{ marginTop: '0.4rem', marginLeft: '26px', opacity: 0.8, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Removes the soft gradient fade on the right edge of long channel names (each one creates a GPU compositing layer). Also disables smooth-scroll on the guide list. Visual trade-off: long names show ellipsis (…) instead of a gradient fade.
            </p>
          </div>
        </div>
      </div>

      {showRestartModal && (
        <div className="modal-overlay" onClick={() => setShowRestartModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Restart Required</h3>
            </div>
            <div className="modal-body">
              <p className="modal-message">
                For hardware acceleration settings to take effect in the application engine, the app needs to restart.
                <br /><br />
                Would you like to restart now?
              </p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-secondary" onClick={confirmSaveWithoutRestart}>
                No, Save Only
              </button>
              <button className="modal-btn modal-btn-primary" onClick={confirmRestart}>
                Yes, Restart Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
