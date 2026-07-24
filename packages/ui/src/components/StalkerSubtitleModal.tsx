import React from 'react';
import { useDownloadStore } from '../stores/downloadStore';
import './StalkerSubtitleModal.css';

export const StalkerSubtitleModal: React.FC = () => {
  const pending = useDownloadStore((s) => s.pendingStalkerDownload);
  const confirmStalkerDownload = useDownloadStore((s) => s.confirmStalkerDownload);
  const cancelStalkerDownload = useDownloadStore((s) => s.cancelStalkerDownload);

  if (!pending) return null;

  return (
    <div className="stalker-sub-modal-backdrop" onClick={cancelStalkerDownload}>
      <div className="stalker-sub-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="stalker-sub-modal-header">
          <div className="stalker-sub-modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <line x1="9" y1="10" x2="15" y2="10"></line>
              <line x1="12" y1="7" x2="12" y2="13"></line>
            </svg>
          </div>
          <h3>Extract Subtitles?</h3>
        </div>

        <div className="stalker-sub-modal-body">
          <p className="stalker-sub-modal-title">{pending.title}</p>
          <p className="stalker-sub-modal-desc">
            Stalker Portal subtitles are extracted separately during post-processing. Extracting subtitles may take additional time or delay completion.
          </p>
          <p className="stalker-sub-modal-question">
            Would you like to extract subtitles for this VOD?
          </p>
        </div>

        <div className="stalker-sub-modal-actions">
          <button
            className="stalker-sub-modal-btn primary"
            onClick={() => confirmStalkerDownload(true)}
          >
            Extract Subtitles
          </button>
          <button
            className="stalker-sub-modal-btn secondary"
            onClick={() => confirmStalkerDownload(false)}
          >
            Download Video Only
          </button>
          <button
            className="stalker-sub-modal-btn cancel"
            onClick={cancelStalkerDownload}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
