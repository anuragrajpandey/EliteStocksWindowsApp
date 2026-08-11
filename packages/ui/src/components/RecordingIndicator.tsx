import { useTranslation } from 'react-i18next';
import './RecordingIndicator.css';

interface RecordingIndicatorProps {
  size?: 'small' | 'medium';
  variant?: 'recording' | 'scheduled';
  className?: string;
}

export function RecordingIndicator({ size = 'small', variant = 'recording', className = '' }: RecordingIndicatorProps) {
  const { t } = useTranslation('dvr');
  const isRecording = variant === 'recording';
  return (
    <div
      className={`recording-indicator ${size} ${variant} ${className}`}
      title={isRecording ? t('recordingInProgress') : t('scheduledToRecord')}
    >
      <div className={`recording-dot ${isRecording ? 'pulse' : ''}`}></div>
      <span className="recording-text">REC</span>
    </div>
  );
}
