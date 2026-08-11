# Contributing to ynoTV

## UI strings (i18n)

New user-facing UI strings must be added to `packages/ui/src/i18n/locales/en.json` **first**, following the existing namespace structure (`common`, `settings`, `nav`). `en.json` is the hand-authored source of truth — there is no auto-extraction tooling.

- Localized labels are referenced from components via `useTranslation('<ns>')` and literal key strings (e.g. `t('tabs.sources')`). Dynamic keys are materialized through literal key lookup tables like `SETTINGS_TAB_LABEL_KEYS` in `SettingsSidebar.tsx` so every key stays greppable.
- The TypeScript typed-key layer (`packages/ui/src/i18n/i18next.d.ts`) is the safety net: a typo in a key name fails `typecheck`. The locale allowlist is enforced by `pnpm --filter @ynotv/ui i18n:check`.