import type { StoredChannel } from '../db';
import { useNextProgram } from '../hooks/useChannels';
import { useEpgClockFormat } from '../stores/uiStore';
import { formatTime } from '../utils/dateTime';
import { useTranslation } from 'react-i18next';
import './WhatsNextWidget.css';

interface WhatsNextWidgetProps {
  channel: StoredChannel | null;
  showControls: boolean;
  activeView: string;
  isVod: boolean;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}

function formatEpgTime(date: Date, epgClockFormat: '12h' | '24h'): string {
  return formatTime(date, { hour: '2-digit', minute: '2-digit', hour12: epgClockFormat !== '24h' });
}

export function WhatsNextWidget({
  channel,
  showControls,
  activeView,
  isVod,
  onMoveLeft,
  onMoveRight,
}: WhatsNextWidgetProps) {
  useTranslation();
  const epgClockFormat = useEpgClockFormat();
  const nextProgram = useNextProgram(channel?.stream_id ?? null);

  const isMainScreen = activeView === 'none';
  const isVisible = isMainScreen && showControls && !!channel && !isVod;

  if (!isVisible) {
    return null;
  }

  const channelName = channel.alias || channel.name;

  return (
    <div className="whats-next-widget">
      <div className="whats-next-header" style={{ display: 'flex', alignItems: 'center' }}>
        <span>What&apos;s Next</span>
        {(onMoveLeft || onMoveRight) && (
          <div className="widget-move-controls">
            <button className="widget-move-btn" onClick={onMoveLeft} disabled={!onMoveLeft} title="Move Left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button className="widget-move-btn" onClick={onMoveRight} disabled={!onMoveRight} title="Move Right">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        )}
      </div>
      <div className="whats-next-body">
        {nextProgram ? (
          <div className="whats-next-content">
            <div className="whats-next-channel" title={channelName}>
              {channelName}
            </div>
            <div className="whats-next-title" title={nextProgram.title}>
              {nextProgram.title}
            </div>
            <div className="whats-next-time">
              {formatEpgTime(new Date(nextProgram.start), epgClockFormat)} – {formatEpgTime(new Date(nextProgram.end), epgClockFormat)}
            </div>
            {nextProgram.description && (
              <div className="whats-next-desc" title={nextProgram.description}>
                {nextProgram.description}
              </div>
            )}
          </div>
        ) : (
          <div className="whats-next-empty">No upcoming program in guide</div>
        )}
      </div>
    </div>
  );
}
