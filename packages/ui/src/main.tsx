import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SourceVersionProvider } from './contexts/SourceVersionContext';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';
import './services/tauri-bridge'; // Initialize Tauri bridge and polyfills

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <SourceVersionProvider>
          <App />
        </SourceVersionProvider>
      </I18nextProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
