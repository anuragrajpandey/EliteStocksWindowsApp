import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';

/** Locale registry. Locales ship with app code (Vite bundles the JSON imports). */
export const SUPPORTED_LOCALES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
];

export function isSupportedLocale(code: string): boolean {
  return SUPPORTED_LOCALES.some((l) => l.code === code);
}

function getInitialLanguage(): string {
  try {
    const localData = typeof localStorage !== 'undefined' ? localStorage.getItem('app-settings') : null;
    if (localData) {
      const parsed = JSON.parse(localData);
      if (typeof parsed.language === 'string' && isSupportedLocale(parsed.language)) {
        return parsed.language;
      }
    }
  } catch (e) {
    // fall through to default
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    // `as any`: i18next's Resource type expects flat `{ [key: string]: string }` per namespace,
    // but en.json is nested by namespace (`common`/`settings`/`nav`). The typed shape lives in
    // i18next.d.ts (CustomTypeOptions) which is what t() key-checking uses at compile time.
    // Do not "clean up"; typing it here would fight the runtime structure i18next actually wants.
    en: en as any,
    fr: fr as any,
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: Object.keys(en),
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
  missingKeyHandler: (lngs, ns, key, fallbackValue) => {
    if (import.meta.env.DEV) {
      console.warn(`[i18n:missing] Key "${ns}:${key}" missing for locale "${lngs.join(',')}". Fallback: "${fallbackValue}"`);
    }
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;

export const changeLanguage = (lang: string): ReturnType<typeof i18n.changeLanguage> => i18n.changeLanguage(lang);

/**
 * Translate known backend/native error strings (Rust commands, local-adapter clients)
 * that surface raw via `res.error` / `result.error` / `err.message` at display sites.
 * Unknown strings (dynamic network details, HTTP text, plugin internals) pass through.
 */
export function translateNativeError(msg: string | null | undefined): string {
  if (!msg) return '';
  switch (msg) {
    case 'Authentication failed':
      return i18n.t('common:authenticationFailed');
    case 'Proxy is not enabled or proxy server field is empty':
      return i18n.t('settings:proxy.notEnabled');
    case 'Download not found or already finished':
      return i18n.t('common:downloadNotFoundOrFinished');
    case 'Recording not found':
      return i18n.t('common:recordingNotFound');
    case 'Interrupted by app restart':
      return i18n.t('common:interruptedRestart');
    case 'No media session':
      return i18n.t('player:noMediaSession');
    default:
      return msg;
  }
}