import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import i18n, { translateNativeError } from '../../i18n';
import { exportAllData, importAllData } from '../../utils/exportImport';

export function ImportExportTab() {
    useTranslation();
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [showImportConfirm, setShowImportConfirm] = useState(false);
    const [showRestartConfirm, setShowRestartConfirm] = useState(false);

    const handleExport = async () => {
        setIsProcessing(true);
        setStatus(null);
        try {
            const result = await exportAllData();
            if (result.success) {
                setStatus({
                    type: 'success',
                    message: i18n.t('settings:importExport.exportSuccess', { filePath: result.filePath })
                });
            } else if (result.error) {
                setStatus({ type: 'error', message: translateNativeError(result.error) || result.error });
            }
        } catch (error) {
            setStatus({ type: 'error', message: translateNativeError(String(error)) || String(error) });
        } finally {
            setIsProcessing(false);
        }
    };

    const confirmImport = async () => {
        setShowImportConfirm(false);
        setIsProcessing(true);
        setStatus(null);
        try {
            const result = await importAllData();
            if (result.success) {
                // Show restart confirmation modal instead of native confirm
                setShowRestartConfirm(true);
            } else if (result.error) {
                setStatus({ type: 'error', message: translateNativeError(result.error) || result.error });
            }
        } catch (error) {
            setStatus({ type: 'error', message: translateNativeError(String(error)) || String(error) });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRestart = () => {
        console.log('[Import] User confirmed restart');
        setShowRestartConfirm(false);
        // Small delay to ensure modal closes before reload
        setTimeout(() => {
            window.location.reload();
        }, 100);
    };

    const handleImportClick = () => {
        setShowImportConfirm(true);
    };

    return (
        <div className="settings-tab-content">
            {/* System Backup & Restoration - Main header */}
            <div className="settings-section" style={{ paddingBottom: '8px' }}>
                <div className="section-header">
                    <h3>{i18n.t('settings:exportImport.title')}</h3>
                </div>
                <p className="section-description">
                    {i18n.t('settings:exportImport.description')}
                </p>

                {status && (
                    <div className={`sync-status-item ${status.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: '16px' }}>
                        <span className="status-name">{status.message}</span>
                    </div>
                )}
            </div>

            {/* Export Configuration */}
            <div className="settings-section" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                <div className="section-header">
                    <h3>{i18n.t('settings:exportImport.exportTitle')}</h3>
                </div>
                <p className="section-description" style={{ marginBottom: '12px' }}>
                    {i18n.t('settings:exportImport.exportDescription')}<br />
                    <span style={{ color: '#ff9900' }}>{i18n.t('settings:exportImport.exportWarning')}</span>
                </p>
                <button
                    className="sync-btn"
                    onClick={handleExport}
                    disabled={isProcessing}
                    style={{ maxWidth: '200px', borderColor: 'var(--surface-border)' }}
                >
                    {isProcessing ? i18n.t('settings:exportImport.processing') : i18n.t('settings:exportImport.exportBtn')}
                </button>
            </div>

            {/* Import Configuration */}
            <div className="settings-section" style={{ paddingTop: '8px' }}>
                <div className="section-header">
                    <h3>{i18n.t('settings:exportImport.importTitle')}</h3>
                </div>
                <p className="section-description" style={{ marginBottom: '12px' }}>
                    {i18n.t('settings:exportImport.importDescription')}<br />
                    <span style={{ color: '#ff4444' }}>{i18n.t('settings:exportImport.importWarning')}</span>
                </p>
                <button
                    className="sync-btn"
                    onClick={handleImportClick}
                    disabled={isProcessing}
                    style={{ maxWidth: '200px', borderColor: 'var(--surface-border)' }}
                >
                    {isProcessing ? i18n.t('settings:exportImport.processing') : i18n.t('settings:exportImport.importBtn')}
                </button>
            </div>

            {showImportConfirm && createPortal(
                <div className="source-form-overlay">
                    <div className="source-form" style={{ maxWidth: '400px', height: 'auto' }}>
                        <h3>{i18n.t('settings:exportImport.confirmTitle')}</h3>
                        <p style={{ color: 'var(--text-primary)', marginBottom: '24px', lineHeight: '1.5' }}>
                            {i18n.t('settings:exportImport.confirmMessage')}
                        </p>
                        <div className="form-actions" style={{ marginTop: '0' }}>
                            <button
                                className="cancel-btn"
                                onClick={() => setShowImportConfirm(false)}
                            >
                                {i18n.t('settings:exportImport.cancel')}
                            </button>
                            <button
                                className="save-btn"
                                onClick={confirmImport}
                                style={{ borderColor: '#ff4444', color: '#ff4444', background: 'rgba(255, 68, 68, 0.1)' }}
                            >
                                {i18n.t('settings:exportImport.continue')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showRestartConfirm && createPortal(
                <div className="source-form-overlay">
                    <div className="source-form" style={{ maxWidth: '400px', height: 'auto' }}>
                        <h3>{i18n.t('settings:exportImport.restartTitle')}</h3>
                        <p style={{ color: 'var(--text-primary)', marginBottom: '24px', lineHeight: '1.5' }}>
                            {i18n.t('settings:exportImport.restartMessage')}
                            <br /><br />
                            {i18n.t('settings:exportImport.restartQuestion')}
                        </p>
                        <div className="form-actions" style={{ marginTop: '0' }}>
                            <button
                                className="cancel-btn"
                                onClick={() => setShowRestartConfirm(false)}
                            >
                                {i18n.t('settings:exportImport.restartLater')}
                            </button>
                            <button
                                className="save-btn"
                                onClick={handleRestart}
                                style={{ borderColor: '#4CAF50', color: '#4CAF50', background: 'rgba(76, 175, 80, 0.1)' }}
                            >
                                {i18n.t('settings:exportImport.restartNow')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
