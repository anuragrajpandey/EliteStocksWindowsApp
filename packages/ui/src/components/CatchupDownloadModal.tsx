import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './DvrScheduleOptionsModal.css';

interface CatchupDownloadModalProps {
  isOpen: boolean;
  programTitle: string;
  channelName: string;
  timeString: string;
  defaultStartPadding: number; // in minutes
  defaultEndPadding: number;   // in minutes
  onConfirm: (options: {
    startPadding: number; // in minutes
    endPadding: number;   // in minutes
  }) => void;
  onCancel: () => void;
}

export function CatchupDownloadModal({
  isOpen,
  programTitle,
  channelName,
  timeString,
  defaultStartPadding,
  defaultEndPadding,
  onConfirm,
  onCancel,
}: CatchupDownloadModalProps) {
  const [startPadding, setStartPadding] = useState(defaultStartPadding);
  const [endPadding, setEndPadding] = useState(defaultEndPadding);

  useEffect(() => {
    if (isOpen) {
      setStartPadding(defaultStartPadding);
      setEndPadding(defaultEndPadding);
    }
  }, [isOpen, defaultStartPadding, defaultEndPadding]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  const handleConfirm = useCallback(() => {
    onConfirm({
      startPadding,
      endPadding,
    });
  }, [onConfirm, startPadding, endPadding]);

  if (!isOpen) return null;

  return createPortal(
    <div className="dvr-options-modal-overlay" onClick={onCancel}>
      <div className="dvr-options-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dvr-options-modal-header">
          <h3>📥 Download Catchup Program</h3>
          <button className="dvr-options-modal-close" onClick={onCancel}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="dvr-options-modal-body">
          {/* Program Info */}
          <div className="dvr-options-program-info" style={{ borderLeftColor: '#00d4ff' }}>
            <div className="dvr-options-program-title">{programTitle}</div>
            <div className="dvr-options-program-channel">{channelName}</div>
            <div className="dvr-options-program-time">{timeString}</div>
          </div>

          {/* Padding */}
          <div className="dvr-options-form-group">
            <label className="dvr-options-label">Start Padding (Minutes)</label>
            <input
              type="number"
              min="0"
              value={startPadding}
              onChange={(e) => setStartPadding(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="dvr-options-number-input"
            />
            <span className="dvr-options-hint">Download this many minutes before scheduled start time</span>
          </div>

          <div className="dvr-options-form-group">
            <label className="dvr-options-label">End Padding (Minutes)</label>
            <input
              type="number"
              min="0"
              value={endPadding}
              onChange={(e) => setEndPadding(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="dvr-options-number-input"
            />
            <span className="dvr-options-hint">Download this many minutes after scheduled end time</span>
          </div>
        </div>

        <div className="dvr-options-modal-footer">
          <button className="dvr-options-btn dvr-options-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="dvr-options-btn dvr-options-btn-primary" onClick={handleConfirm}>
            Download
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
