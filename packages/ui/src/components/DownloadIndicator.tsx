import { useTranslation } from 'react-i18next';
import { useDownloadStore } from '../stores/downloadStore';
import './DownloadIndicator.css';

interface DownloadIndicatorProps {
  size?: 'small' | 'medium';
  className?: string;
}

export function DownloadIndicator({ size = 'small', className = '' }: DownloadIndicatorProps) {
  const { t } = useTranslation('player');
  const downloads = useDownloadStore((s) => s.downloads) || [];
  const activeCount = downloads.filter((d) => d.status === 'downloading').length;

  if (activeCount === 0) return null;

  return (
    <div
      className={`download-indicator ${size} ${className}`}
      title={t('downloadsInProgress', { count: activeCount })}
    >
      <div className="download-dot pulse"></div>
      <span className="download-text">
        {activeCount > 1 ? t('dlWithCount', { n: activeCount }) : t('dl')}
      </span>
    </div>
  );
}

export default DownloadIndicator;
