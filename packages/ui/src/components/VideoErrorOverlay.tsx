import { useTranslation } from 'react-i18next';
import './VideoErrorOverlay.css';

interface VideoErrorOverlayProps {
    error: string;
    onDismiss?: () => void;
    isSmall?: boolean;
}

export function VideoErrorOverlay({ error, onDismiss, isSmall = false }: VideoErrorOverlayProps) {
    const { t } = useTranslation('player');
    // Parse error for common HTTP codes
    let title = t('playbackError');
    let message = error;
    let icon = '⚠️';
    let advice = '';

    if (error.includes('401')) {
        title = t('unauthorizedAccess');
        advice = t('sessionExpiredAdvice');
        icon = '🔒';
    } else if (error.includes('403')) {
        title = t('accessForbidden');
        advice = t('accessForbiddenAdvice');
        icon = '🚫';
    } else if (error.includes('404')) {
        title = t('streamNotFound');
        advice = t('streamNotFoundAdvice');
        icon = '🔍';
    } else if (error.includes('network') || error.includes('connection')) {
        title = t('connectionError');
        advice = t('connectionErrorAdvice');
        icon = '📡';
    }

    // specific override: if we have a detected HTTP error code, prioritize showing that over the generic message
    const isSpecificHttpError = error.includes('HTTP Error');
    if (isSpecificHttpError) {
        message = error;
    }

    return (
        <div className={`video-error-overlay ${isSmall ? 'small' : ''}`}>
            <div className="video-error-content">
                <div className="video-error-icon">{icon}</div>
                <h3 className="video-error-title">{title}</h3>
                <p className="video-error-message">{message}</p>
                {advice && <p className="video-error-advice">{advice}</p>}

                {/* Only show raw details if it's different from the main message (and we are not small) */}
                {!isSmall && message !== error && (
                    <div className="video-error-raw">{t('errorDetails', { error })}</div>
                )}

                {onDismiss && (
                    <button className="video-error-dismiss" onClick={onDismiss}>
                        {t('dismiss')}
                    </button>
                )}
            </div>
        </div>
    );
}
