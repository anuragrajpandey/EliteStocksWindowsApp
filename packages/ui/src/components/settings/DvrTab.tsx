import { useState, useEffect } from 'react';
import { getDvrSettings, saveDvrSetting } from '../../db';
import { open } from '@tauri-apps/plugin-dialog';
import '../Settings.css';

export function DvrTab() {
    const [storagePath, setStoragePath] = useState('');
    const [downloadsPath, setDownloadsPath] = useState('');
    const [startPadding, setStartPadding] = useState(60);
    const [endPadding, setEndPadding] = useState(300);
    const [customEndPaddingInput, setCustomEndPaddingInput] = useState('');
    const [autoConvertFormat, setAutoConvertFormat] = useState('none');
    const [autoCleanup, setAutoCleanup] = useState(false);
    const [maxDiskUsage, setMaxDiskUsage] = useState(80);
    const [keepDays, setKeepDays] = useState<number | null>(30);
    const [allowPermissiveHls, setAllowPermissiveHls] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        setLoading(true);
        try {
            const settings = await getDvrSettings();
            setStoragePath(settings.storage_path || '');
            setStartPadding(settings.default_start_padding_sec || 60);
            const endSec = settings.default_end_padding_sec || 300;
            setEndPadding(endSec);
            const mins = endSec / 60;
            setCustomEndPaddingInput(Number(mins.toFixed(2)).toString());
            setAutoConvertFormat(settings.auto_convert_format || 'none');
            setAutoCleanup(settings.auto_cleanup_enabled !== false);
            setMaxDiskUsage(settings.max_disk_usage_percent || 80);
            setKeepDays(settings.keep_recordings_days !== undefined ? settings.keep_recordings_days : 30);
            setAllowPermissiveHls(settings.allow_permissive_hls_extensions === true || settings.allow_permissive_hls_extensions === 'true');

            if (window.storage) {
                const settingsRes = await window.storage.getSettings();
                if (settingsRes?.data?.downloadsPath) {
                    setDownloadsPath(settingsRes.data.downloadsPath);
                }
            }
        } catch (error) {
            console.error('Failed to load DVR settings:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSelectPath() {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: 'Select DVR Storage Directory',
            });

            if (selected && typeof selected === 'string') {
                setStoragePath(selected);
                await saveDvrSetting('storage_path', selected);
            }
        } catch (error) {
            console.error('Failed to select directory:', error);
            alert('Failed to select directory');
        }
    }

    async function handleSelectDownloadsPath() {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: 'Select Media Downloads Directory',
            });

            if (selected && typeof selected === 'string') {
                setDownloadsPath(selected);
                if (window.storage) {
                    await window.storage.updateSettings({ downloadsPath: selected });
                }
            }
        } catch (error) {
            console.error('Failed to select downloads directory:', error);
            alert('Failed to select downloads directory');
        }
    }

    async function handleStartPaddingChange(value: number) {
        setStartPadding(value);
        await saveDvrSetting('default_start_padding_sec', value);
    }

    async function handleEndPaddingChange(value: number) {
        setEndPadding(value);
        const mins = value / 60;
        setCustomEndPaddingInput(Number(mins.toFixed(2)).toString());
        await saveDvrSetting('default_end_padding_sec', value);
    }

    async function handleSaveCustomEndPadding() {
        const mins = parseFloat(customEndPaddingInput);
        if (!isNaN(mins) && mins >= 0) {
            const seconds = Math.round(mins * 60);
            await handleEndPaddingChange(seconds);
        }
    }

    async function handleAutoConvertChange(value: string) {
        setAutoConvertFormat(value);
        await saveDvrSetting('auto_convert_format', value);
    }

    async function handleAutoCleanupChange(value: boolean) {
        setAutoCleanup(value);
        await saveDvrSetting('auto_cleanup_enabled', value);
    }

    async function handleMaxDiskUsageChange(value: number) {
        setMaxDiskUsage(value);
        await saveDvrSetting('max_disk_usage_percent', value);
    }

    async function handleKeepDaysChange(value: number | null) {
        setKeepDays(value);
        await saveDvrSetting('keep_recordings_days', value);
    }

    async function handleAllowPermissiveHlsChange(value: boolean) {
        setAllowPermissiveHls(value);
        await saveDvrSetting('allow_permissive_hls_extensions', value);
    }

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        if (mins < 1) return `${seconds}s`;
        if (mins === 1) return '1 min';
        return `${mins} mins`;
    };

    if (loading) {
        return (
            <div className="settings-tab-content">
                <div className="settings-section">
                    <p className="section-description">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-tab-content">
            {/* Storage Location */}
            <div className="settings-section" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                <div className="section-header">
                    <h3>Storage Location</h3>
                </div>
                <p className="section-description" style={{ marginBottom: '12px' }}>
                    Where recorded videos will be saved.
                    {!storagePath && (
                        <span className="dvr-warning-msg" style={{ display: 'block', marginTop: '4px' }}>
                            ⚠️ Storage path is required for recordings to work
                        </span>
                    )}
                </p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                        type="text"
                        className="dvr-path-input"
                        value={storagePath || 'Default location'}
                        readOnly
                    />
                    <button
                        className="sync-btn dvr-browse-btn"
                        onClick={handleSelectPath}
                        type="button"
                    >
                        Browse
                    </button>
                </div>
            </div>

            {/* Downloads Location */}
            <div className="settings-section" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                <div className="section-header">
                    <h3>Downloads Location</h3>
                </div>
                <p className="section-description" style={{ marginBottom: '12px' }}>
                    Where downloaded videos/VODs will be saved. If unset, you will be prompted for a location each time.
                </p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                        type="text"
                        className="dvr-path-input"
                        value={downloadsPath || 'Ask every time'}
                        readOnly
                    />
                    <button
                        className="sync-btn dvr-browse-btn"
                        onClick={handleSelectDownloadsPath}
                        type="button"
                    >
                        Browse
                    </button>
                </div>
            </div>

            {/* Recording Padding */}
            <div className="settings-section" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                <div className="section-header">
                    <h3>Recording Padding</h3>
                </div>
                <p className="section-description">
                    Default buffer time added to the beginning and end of recordings.
                </p>

                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label className="dvr-setting-label">Start Padding</label>
                        <span className="dvr-duration-badge">
                            {formatDuration(startPadding)}
                        </span>
                    </div>
                    <input
                        type="range"
                        className="dvr-range-slider"
                        min="0"
                        max="300"
                        step="15"
                        value={startPadding}
                        onChange={(e) => handleStartPaddingChange(parseInt(e.target.value))}
                    />
                    <div className="dvr-range-limits">
                        <span>None</span>
                        <span>5 min</span>
                    </div>
                </div>

                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label className="dvr-setting-label">End Padding</label>
                        <span className="dvr-duration-badge">
                            {formatDuration(endPadding)}
                        </span>
                    </div>
                    <input
                        type="range"
                        className="dvr-range-slider"
                        min="0"
                        max={Math.max(900, endPadding)}
                        step="30"
                        value={endPadding}
                        onChange={(e) => handleEndPaddingChange(parseInt(e.target.value))}
                    />
                    <div className="dvr-range-limits">
                        <span>None</span>
                        <span>{formatDuration(Math.max(900, endPadding))}</span>
                    </div>

                    {/* Custom End Padding Input */}
                    <div className="dvr-custom-padding-box">
                        <div style={{ flex: 1 }}>
                            <label className="dvr-sublabel" style={{ marginBottom: '4px' }}>
                                Custom End Padding (minutes)
                            </label>
                            <input
                                type="number"
                                className="dvr-number-input"
                                min="0"
                                placeholder="Enter custom minutes"
                                value={customEndPaddingInput}
                                onChange={(e) => setCustomEndPaddingInput(e.target.value)}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveCustomEndPadding}
                            disabled={customEndPaddingInput === '' || isNaN(parseFloat(customEndPaddingInput)) || parseFloat(customEndPaddingInput) < 0}
                            className="sync-btn dvr-save-btn"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>

            {/* Storage Management & Auto-Cleanup */}
            <div className="settings-section" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                <div className="section-header">
                    <h3>Storage Management</h3>
                </div>
                <p className="section-description" style={{ marginBottom: '12px' }}>
                    Control how recordings are pruned automatically to prevent running out of disk space.
                </p>

                {/* Enable Auto-Cleanup Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <label className="dvr-setting-label" style={{ display: 'block', fontWeight: 500 }}>
                            Auto-Cleanup
                        </label>
                        <span className="dvr-sublabel">
                            Automatically delete oldest recordings to enforce disk space quotas.
                        </span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <input
                            type="checkbox"
                            id="autoCleanup"
                            checked={autoCleanup}
                            onChange={(e) => handleAutoCleanupChange(e.target.checked)}
                            style={{ display: 'none' }}
                        />
                        <label
                            htmlFor="autoCleanup"
                            className="dvr-toggle-switch"
                            style={{
                                background: autoCleanup ? 'linear-gradient(135deg, #00d4ff, #0072ff)' : undefined,
                            }}
                        >
                            <span
                                style={{
                                    left: autoCleanup ? '24px' : '2px',
                                }}
                            />
                        </label>
                    </div>
                </div>

                {autoCleanup && (
                    <>
                        {/* Max Disk Usage Slider */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label className="dvr-setting-label">Max Disk Usage Threshold</label>
                                <span className="dvr-duration-badge">
                                    {maxDiskUsage}%
                                </span>
                            </div>
                            <input
                                type="range"
                                className="dvr-range-slider"
                                min="50"
                                max="95"
                                step="5"
                                value={maxDiskUsage}
                                onChange={(e) => handleMaxDiskUsageChange(parseInt(e.target.value))}
                            />
                            <p className="dvr-sublabel" style={{ marginTop: '6px' }}>
                                Cleanup starts when the recording drive's total usage exceeds this limit.
                            </p>
                        </div>

                        {/* Keep Recordings Days Dropdown */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label className="dvr-setting-label">Keep Recordings For</label>
                            </div>
                            <select
                                className="dvr-select-dropdown"
                                value={keepDays === null || keepDays === undefined || (keepDays as any) === 'none' ? 'none' : keepDays.toString()}
                                onChange={(e) => handleKeepDaysChange(e.target.value === 'none' ? null : parseInt(e.target.value))}
                            >
                                <option value="none">Indefinitely (Until space is needed)</option>
                                <option value="7">7 Days</option>
                                <option value="14">14 Days</option>
                                <option value="30">30 Days</option>
                                <option value="90">90 Days</option>
                            </select>
                        </div>
                    </>
                )}
            </div>

            {/* Auto-Convert Settings */}
            <div className="settings-section" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                <div className="section-header">
                    <h3>Auto-Convert Recordings</h3>
                </div>
                <p className="section-description" style={{ marginBottom: '12px' }}>
                    Automatically convert completed recordings to MP4 or MKV format using FFmpeg (lossless stream copy).
                </p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select
                        className="dvr-select-dropdown"
                        value={autoConvertFormat}
                        onChange={(e) => handleAutoConvertChange(e.target.value)}
                    >
                        <option value="none">None (Keep original .ts)</option>
                        <option value="mp4">MP4 (.mp4)</option>
                        <option value="mkv">MKV (.mkv)</option>
                    </select>
                </div>
            </div>

            {/* Stream Compatibility & Security */}
            <div className="settings-section" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                <div className="section-header">
                    <h3>Stream Compatibility & Security</h3>
                </div>
                <p className="section-description" style={{ marginBottom: '12px' }}>
                    Configure FFmpeg security strictness when recording stream segments.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ paddingRight: '16px' }}>
                            <div className="dvr-setting-label">
                                Allow Non-Standard HLS Extensions (.jpg / .css)
                            </div>
                            <div className="dvr-sublabel" style={{ marginTop: '2px', lineHeight: '1.4' }}>
                                Bypasses strict FFmpeg segment extension checks (CVE-2023-6602) for IPTV providers that disguise video segments as .jpg or .css files. Disabled by default to preserve standard security.
                            </div>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                            <input
                                type="checkbox"
                                id="allowPermissiveHls"
                                checked={allowPermissiveHls}
                                onChange={(e) => handleAllowPermissiveHlsChange(e.target.checked)}
                                style={{ display: 'none' }}
                            />
                            <label
                                htmlFor="allowPermissiveHls"
                                className="dvr-toggle-switch"
                                style={{
                                    background: allowPermissiveHls ? 'linear-gradient(135deg, #00d4ff, #0072ff)' : undefined,
                                }}
                            >
                                <span
                                    style={{
                                        left: allowPermissiveHls ? '24px' : '2px',
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
