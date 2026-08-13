import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary.
 *
 * The app window is transparent, so if an uncaught render error ever blanks
 * the React tree the window would silently become invisible while still
 * showing in the taskbar. This boundary catches those errors and renders a
 * visible fallback instead, with a reload action so the app stays recoverable
 * without killing the process.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const message = this.state.error?.message || 'Unknown error';
    const detail = this.state.error?.stack || '';

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          background: '#0b0e14',
          color: '#e8ecf3',
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          textAlign: 'center',
          padding: '32px',
        }}
      >
        <div style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '1px', color: '#00d4ff' }}>
          ynoTV
        </div>
        <div style={{ fontSize: '15px', fontWeight: 600 }}>Something went wrong</div>
        <div
          style={{
            fontSize: '13px',
            color: '#9aa3b2',
            maxWidth: '520px',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            maxHeight: '160px',
            overflow: 'auto',
          }}
        >
          {message}
          {detail ? `\n\n${detail}` : ''}
        </div>
        <button
          onClick={this.handleReload}
          style={{
            marginTop: '8px',
            padding: '8px 20px',
            borderRadius: '6px',
            border: 'none',
            background: '#00d4ff',
            color: '#06131a',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          If this keeps happening, enable Debug logging in Settings and share the log.
        </div>
      </div>
    );
  }
}
