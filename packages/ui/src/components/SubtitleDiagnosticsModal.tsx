import { useEffect, useRef, useState } from 'react';
import { useSubtitleDebugStore } from '../stores/subtitleDebugStore';
import { Bridge } from '../services/tauri-bridge';

interface SubtitleDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubtitleDiagnosticsModal({ isOpen, onClose }: SubtitleDiagnosticsModalProps) {
  const entries = useSubtitleDebugStore((s) => s.entries);
  const clearSubLogs = useSubtitleDebugStore((s) => s.clearSubLogs);
  const [copied, setCopied] = useState(false);
  const [mpvLog, setMpvLog] = useState('');
  const [mpvLogPath, setMpvLogPath] = useState('');
  const [verboseOn, setVerboseOn] = useState(false);
  const [mpvLoading, setMpvLoading] = useState(false);
  const jsBodyRef = useRef<HTMLTextAreaElement>(null);
  const mpvBodyRef = useRef<HTMLTextAreaElement>(null);

  const refreshMpvLog = async (enabled?: boolean) => {
    setMpvLoading(true);
    try {
      if (enabled !== undefined) {
        await Bridge.setMpvVerboseLogging(enabled);
        setVerboseOn(enabled);
      }
      const result = await Bridge.getMpvLog(600);
      setMpvLog(result.log);
      setMpvLogPath(result.path);
      if (mpvBodyRef.current) {
        mpvBodyRef.current.scrollTop = mpvBodyRef.current.scrollHeight;
      }
    } catch (e) {
      setMpvLog(`Failed to read mpv log: ${e}`);
    } finally {
      setMpvLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshMpvLog();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && jsBodyRef.current) {
      jsBodyRef.current.scrollTop = jsBodyRef.current.scrollHeight;
    }
  }, [isOpen, entries]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const jsText = entries.length
    ? entries.map((e) => `[${e.time}] (${e.area}) ${e.msg}`).join('\n')
    : '(No subtitle diagnostics captured yet.)';

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error('Failed to copy diagnostics:', e);
    }
  };

  const fullText = `=== App / JS log ===\n${jsText}\n\n=== MPV log (${mpvLogPath}) ===\n${mpvLog}`;

  return (
    <div className="subtitle-diagnostics-overlay" onClick={onClose}>
      <div className="subtitle-diagnostics" onClick={(e) => e.stopPropagation()}>
        <div className="subtitle-diagnostics-header">
          <h3>Subtitle Diagnostics</h3>
          <button className="subtitle-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="subtitle-diagnostics-actions">
          <button className="subtitle-diagnostics-btn" onClick={() => copy(fullText)}>
            {copied ? 'Copied!' : 'Copy All'}
          </button>
          <button className="subtitle-diagnostics-btn" onClick={() => copy(jsText)}>Copy App Log</button>
          <button className="subtitle-diagnostics-btn" onClick={() => copy(mpvLog)}>Copy MPV Log</button>
          <button
            className={`subtitle-diagnostics-btn ${verboseOn ? 'subtitle-diagnostics-btn-active' : ''}`}
            onClick={() => refreshMpvLog(!verboseOn)}
          >
            {verboseOn ? 'Verbose: ON' : 'Enable Verbose'}
          </button>
          <button className="subtitle-diagnostics-btn" onClick={() => refreshMpvLog()}>
            {mpvLoading ? 'Loading…' : 'Refresh MPV Log'}
          </button>
          <button className="subtitle-diagnostics-btn" onClick={clearSubLogs}>Clear App Log</button>
        </div>
        <div className="subtitle-diagnostics-tabs">
          <span className="subtitle-diagnostics-tab">App / JS log ({entries.length})</span>
          <span className="subtitle-diagnostics-tab">MPV log</span>
        </div>
        <textarea
          ref={jsBodyRef}
          className="subtitle-diagnostics-text subtitle-diagnostics-text-js"
          readOnly
          value={jsText}
          spellCheck={false}
        />
        <textarea
          ref={mpvBodyRef}
          className="subtitle-diagnostics-text subtitle-diagnostics-text-mpv"
          readOnly
          value={mpvLog || '(MPV log is empty — enable verbose logging, reproduce the issue, then Refresh.)'}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
