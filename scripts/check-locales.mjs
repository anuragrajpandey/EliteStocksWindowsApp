// Locale allowlist enforcement.
//
// Every locale file in packages/ui/src/i18n/locales must have a matching entry
// in the SUPPORTED_LOCALES registry (src/i18n/index.ts), and vice versa. This
// runs as part of `pnpm --filter @ynotv/ui typecheck` so a locale cannot be
// added without also being exposed in the Settings language picker.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const localesDir = join(root, '..', 'packages', 'ui', 'src', 'i18n', 'locales');
const indexFile = join(root, '..', 'packages', 'ui', 'src', 'i18n', 'index.ts');

const registrySource = readFileSync(indexFile, 'utf8');
const registered = [...registrySource.matchAll(/code:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);

const files = readdirSync(localesDir).filter((f) => f.endsWith('.json'));
const fileCodes = [...new Set(files.map((f) => f.replace(/\.json$/, '')))];

const errors = [];

for (const code of fileCodes) {
  if (!registered.includes(code)) {
    errors.push(`Locale file "locales/${code}.json" exists but "${code}" is missing from SUPPORTED_LOCALES in src/i18n/index.ts.`);
  }
}

for (const code of registered) {
  if (!fileCodes.includes(code)) {
    errors.push(`SUPPORTED_LOCALES lists "${code}" but no locales/${code}.json file exists.`);
  }
}

if (errors.length > 0) {
  console.error('[i18n:check] Locale allowlist mismatch:');
  for (const e of errors) console.error('  - ' + e);
  console.error('\nFix: keep src/i18n/locales/*.json and SUPPORTED_LOCALES in sync.');
  process.exit(1);
}

console.log('[i18n:check] OK —', fileCodes.length, 'locales registered:', fileCodes.join(', '));