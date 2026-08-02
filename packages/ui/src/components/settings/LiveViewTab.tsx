import './PlaybackTab.css'; // Reuse existing tab styles

interface LiveViewTabProps {
  channelInfoOverlayEnabled: boolean;
  onChannelInfoOverlayChange: (enabled: boolean) => void;
  channelInfoOverlayFontSize: number;
  onChannelInfoOverlayFontSizeChange: (size: number) => void;
  channelInfoOverlayLogoSize: number;
  onChannelInfoOverlayLogoSizeChange: (size: number) => void;
  channelInfoOverlayBoxWidth: number;
  onChannelInfoOverlayBoxWidthChange: (width: number) => void;
  channelInfoOverlayOpacity: number;
  onChannelInfoOverlayOpacityChange: (opacity: number) => void;
  channelInfoOverlayHideDescription: boolean;
  onChannelInfoOverlayHideDescriptionChange: (hide: boolean) => void;
  channelInfoOverlayHideMetaBadge: boolean;
  onChannelInfoOverlayHideMetaBadgeChange: (hide: boolean) => void;
  channelInfoOverlayHideLogo: boolean;
  onChannelInfoOverlayHideLogoChange: (hide: boolean) => void;
  channelInfoOverlayHideTimer: boolean;
  onChannelInfoOverlayHideTimerChange: (hide: boolean) => void;
  channelInfoOverlayPosition: 'left' | 'right';
  onChannelInfoOverlayPositionChange: (pos: 'left' | 'right') => void;
  channelInfoOverlayLogoShape: 'square' | 'horizontal';
  onChannelInfoOverlayLogoShapeChange: (shape: 'square' | 'horizontal') => void;
  failoverGroupShowSource: boolean;
  onFailoverGroupShowSourceChange: (enabled: boolean) => void;
}

export function LiveViewTab({
  channelInfoOverlayEnabled,
  onChannelInfoOverlayChange,
  channelInfoOverlayFontSize,
  onChannelInfoOverlayFontSizeChange,
  channelInfoOverlayLogoSize,
  onChannelInfoOverlayLogoSizeChange,
  channelInfoOverlayBoxWidth,
  onChannelInfoOverlayBoxWidthChange,
  channelInfoOverlayOpacity,
  onChannelInfoOverlayOpacityChange,
  channelInfoOverlayHideDescription,
  onChannelInfoOverlayHideDescriptionChange,
  channelInfoOverlayHideMetaBadge,
  onChannelInfoOverlayHideMetaBadgeChange,
  channelInfoOverlayHideLogo,
  onChannelInfoOverlayHideLogoChange,
  channelInfoOverlayHideTimer,
  onChannelInfoOverlayHideTimerChange,
  channelInfoOverlayPosition,
  onChannelInfoOverlayPositionChange,
  channelInfoOverlayLogoShape,
  onChannelInfoOverlayLogoShapeChange,
  failoverGroupShowSource,
  onFailoverGroupShowSourceChange,
}: LiveViewTabProps) {
  return (
    <div className="settings-tab-content playback-tab-content">
      <div className="settings-section">
        <div className="section-header">
          <h3>Channel Information Overlay</h3>
        </div>
        <p className="section-description">
          When enabled, channel information (logo, name, metadata, and EPG) is moved from the Now Playing bar to a dedicated overlay that appears briefly when switching channels.
        </p>

        <div className="timeshift-settings">
          {/* Enable Channel Information Overlay */}
          <div className="timeshift-toggle-row">
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">Enable channel information</span>
              <span className="timeshift-toggle-sub">
                When enabled, the Now Playing bar hides the channel logo, name, resolution/fps/audio metadata, and EPG info. Instead, this information appears in a transparent box at the top-left when switching channels, and auto-hides after a few seconds — similar to classic cable TV channel surfing.
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={channelInfoOverlayEnabled}
                onChange={(e) => onChannelInfoOverlayChange(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Hide Program Description */}
          <div className="timeshift-toggle-row">
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">Hide Program Summary</span>
              <span className="timeshift-toggle-sub">
                When enabled, the program description text will be hidden from the overlay. The title, time, and progress bar will still be shown.
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={channelInfoOverlayHideDescription}
                onChange={(e) => onChannelInfoOverlayHideDescriptionChange(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Hide Metadata Badge */}
          <div className="timeshift-toggle-row">
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">Hide Metadata Badge</span>
              <span className="timeshift-toggle-sub">
                When enabled, resolution, frame rate, and audio channel badges (e.g. 1080P 60FPS STEREOCH) will be hidden from the overlay.
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={channelInfoOverlayHideMetaBadge}
                onChange={(e) => onChannelInfoOverlayHideMetaBadgeChange(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Hide Channel Logo */}
          <div className="timeshift-toggle-row">
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">Hide Channel Logo</span>
              <span className="timeshift-toggle-sub">
                When enabled, the channel icon or logo image will be hidden from the overlay.
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={channelInfoOverlayHideLogo}
                onChange={(e) => onChannelInfoOverlayHideLogoChange(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Hide Program Timer */}
          <div className="timeshift-toggle-row">
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">Hide Program Timer & Progress</span>
              <span className="timeshift-toggle-sub">
                When enabled, program start/end time, time remaining, and the progress bar will be hidden from the overlay.
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={channelInfoOverlayHideTimer}
                onChange={(e) => onChannelInfoOverlayHideTimerChange(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Overlay Position */}
          <div className="timeshift-toggle-row">
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">Overlay Position</span>
              <span className="timeshift-toggle-sub">
                Choose whether the channel information overlay appears on the top-left or top-right of the screen.
              </span>
            </div>
            <select
              value={channelInfoOverlayPosition}
              onChange={(e) => onChannelInfoOverlayPositionChange(e.target.value as 'left' | 'right')}
              style={{
                padding: '0.4rem 0.8rem',
                backgroundColor: 'var(--bg-tertiary, #1f1f2e)',
                border: '1px solid var(--border-color, var(--surface-border))',
                borderRadius: '6px',
                color: 'var(--text-primary, var(--text-primary))',
                fontSize: '0.85rem',
                cursor: 'pointer',
                minWidth: '120px',
                outline: 'none'
              }}
            >
              <option value="left" style={{ backgroundColor: 'var(--bg-tertiary)' }}>Left</option>
              <option value="right" style={{ backgroundColor: 'var(--bg-tertiary)' }}>Right</option>
            </select>
          </div>

          {/* Show Source for Failover Group */}
          <div className="timeshift-toggle-row" style={{ marginTop: '12px' }}>
            <div className="timeshift-toggle-info">
              <span className="timeshift-toggle-label">Show Source for Failover Group</span>
              <span className="timeshift-toggle-sub">
                When enabled, the failover group overlay (which displays channels that are part of the channel's failover group) will also display the source name for each channel.
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={failoverGroupShowSource}
                onChange={(e) => onFailoverGroupShowSourceChange(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      {channelInfoOverlayEnabled && (
        <>
          {/* Overlay Appearance Settings */}
          <div className="settings-section">
            <div className="section-header">
              <h3>Overlay Appearance</h3>
            </div>
            <p className="section-description">
              Customize the size and transparency of the channel info overlay.
            </p>

            <div className="timeshift-settings">
              {/* Font Size */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Text Size</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="range"
                    min="10"
                    max="28"
                    value={channelInfoOverlayFontSize}
                    onChange={(e) => onChannelInfoOverlayFontSizeChange(parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ minWidth: '3rem', textAlign: 'right', color: 'var(--text-primary)' }}>
                    {channelInfoOverlayFontSize}px
                  </span>
                </div>
                <p className="form-hint" style={{ marginTop: '0.5rem' }}>
                  Adjusts the channel name and program text size.
                </p>
              </div>

              {/* Logo Size */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Logo Size</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="range"
                    min="24"
                    max="72"
                    value={channelInfoOverlayLogoSize}
                    onChange={(e) => onChannelInfoOverlayLogoSizeChange(parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ minWidth: '3rem', textAlign: 'right', color: 'var(--text-primary)' }}>
                    {channelInfoOverlayLogoSize}px
                  </span>
                </div>
                <p className="form-hint" style={{ marginTop: '0.5rem' }}>
                  Adjusts the channel logo dimensions.
                </p>
              </div>

              {/* Logo Shape */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Logo Shape</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => onChannelInfoOverlayLogoShapeChange('square')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: channelInfoOverlayLogoShape === 'square' ? 'var(--accent-primary, #00d4ff)' : 'var(--surface-color)',
                      color: channelInfoOverlayLogoShape === 'square' ? '#000' : 'var(--text-primary)',
                      fontWeight: channelInfoOverlayLogoShape === 'square' ? 600 : 400,
                      border: '1px solid var(--surface-border)',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Square (1:1)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChannelInfoOverlayLogoShapeChange('horizontal')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: channelInfoOverlayLogoShape === 'horizontal' ? 'var(--accent-primary, #00d4ff)' : 'var(--surface-color)',
                      color: channelInfoOverlayLogoShape === 'horizontal' ? '#000' : 'var(--text-primary)',
                      fontWeight: channelInfoOverlayLogoShape === 'horizontal' ? 600 : 400,
                      border: '1px solid var(--surface-border)',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Horizontal (16:9)
                  </button>
                </div>
                <p className="form-hint" style={{ marginTop: '0.5rem' }}>
                  Select whether channel logos appear as square tiles or widescreen horizontal boxes.
                </p>
              </div>

              {/* Box Width */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Box Width</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="range"
                    min="200"
                    max="600"
                    step="10"
                    value={channelInfoOverlayBoxWidth}
                    onChange={(e) => onChannelInfoOverlayBoxWidthChange(parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ minWidth: '3rem', textAlign: 'right', color: 'var(--text-primary)' }}>
                    {channelInfoOverlayBoxWidth}px
                  </span>
                </div>
                <p className="form-hint" style={{ marginTop: '0.5rem' }}>
                  Adjusts the maximum width of the overlay box.
                </p>
              </div>

              {/* Background Opacity */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Background Opacity</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="range"
                    min="20"
                    max="90"
                    value={channelInfoOverlayOpacity}
                    onChange={(e) => onChannelInfoOverlayOpacityChange(parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ minWidth: '3rem', textAlign: 'right', color: 'var(--text-primary)' }}>
                    {channelInfoOverlayOpacity}%
                  </span>
                </div>
                <p className="form-hint" style={{ marginTop: '0.5rem' }}>
                  Lower values make the overlay more transparent. Higher values make it more opaque.
                </p>
              </div>

              {/* Reset Button */}
              <div style={{ marginTop: '16px' }}>
                <button
                  className="sync-btn"
                  onClick={() => {
                    onChannelInfoOverlayFontSizeChange(16);
                    onChannelInfoOverlayLogoSizeChange(42);
                    onChannelInfoOverlayLogoShapeChange('square');
                    onChannelInfoOverlayBoxWidthChange(380);
                    onChannelInfoOverlayOpacityChange(55);
                  }}
                  style={{ maxWidth: '200px' }}
                >
                  Reset to Default
                </button>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="settings-section">
            <div className="section-header">
              <h3>Preview</h3>
            </div>
            <p className="section-description">
              This is how the overlay will look when switching channels.
            </p>
            <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
              <div
                style={{
                  maxWidth: `${channelInfoOverlayBoxWidth}px`,
                  background: `rgba(0, 0, 0, ${channelInfoOverlayOpacity / 100})`,
                  backdropFilter: 'blur(12px)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  border: '1px solid var(--surface-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: channelInfoOverlayLogoShape === 'horizontal' ? `${channelInfoOverlayLogoSize * 1.75}px` : `${channelInfoOverlayLogoSize}px`,
                      height: `${channelInfoOverlayLogoSize}px`,
                      borderRadius: '6px',
                      background: 'var(--surface-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    Logo
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                    <span style={{ fontSize: `${channelInfoOverlayFontSize}px`, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Channel Name
                    </span>
                    <span style={{ fontSize: `${Math.max(10, channelInfoOverlayFontSize - 4)}px`, color: 'var(--text-secondary)' }}>
                      Current Program Title
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
