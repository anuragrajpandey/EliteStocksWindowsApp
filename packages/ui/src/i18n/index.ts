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
  react: {
    useSuspense: false,
  },
});

export default i18n;

export const changeLanguage = (lang: string): ReturnType<typeof i18n.changeLanguage> => i18n.changeLanguage(lang);