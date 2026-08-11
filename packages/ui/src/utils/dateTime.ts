import i18n from '../i18n';

/**
 * Locale-aware date/time formatting.
 *
 * The app's UI language (i18n.language) is the source of truth for how dates
 * and times are presented. These wrappers inject it into every Intl call so
 * that, e.g., a French UI renders "lun. 5 janv." and "5 janvier 2026" even on
 * an English OS, while still honoring the user's separate 12/24h clock setting
 * (passed through the call-site options, unchanged).
 *
 * NOTE: calling these inside a React render does NOT by itself re-render the
 * component on a language switch. Components that render dates must subscribe
 * to i18n (useTranslation) so they re-render and pick up the new locale.
 */
export function activeLocale(): string {
  return i18n.language || i18n.resolvedLanguage || 'en';
}

/** toLocaleTimeString bound to the active UI language. */
export function formatTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleTimeString(activeLocale(), options);
}

/** toLocaleDateString bound to the active UI language. */
export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString(activeLocale(), options);
}
