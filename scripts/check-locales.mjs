// Locale allowlist enforcement + key parity check.
//
// 1. Every locale file must have a matching entry in SUPPORTED_LOCALES (and vice versa).
// 2. All locale files must have the same set of flattened keys as en.json (the source of truth).
//
// Runs as part of `pnpm --filter @ynotv/ui typecheck`.
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

// --- Check 1: allowlist parity ---
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

// --- Check 2: key parity (all locales must have the same keys as en.json) ---
function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

const enPath = join(localesDir, 'en.json');
const enKeys = new Set(flattenKeys(JSON.parse(readFileSync(enPath, 'utf8'))));

for (const code of fileCodes) {
  if (code === 'en') continue;
  const localePath = join(localesDir, `${code}.json`);
  const localeKeys = new Set(flattenKeys(JSON.parse(readFileSync(localePath, 'utf8'))));

  for (const key of enKeys) {
    if (!localeKeys.has(key)) {
      errors.push(`[key-parity] "${code}.json" is missing key: "${key}" (exists in en.json).`);
    }
  }
  for (const key of localeKeys) {
    if (!enKeys.has(key)) {
      errors.push(`[key-parity] "${code}.json" has extra key: "${key}" (not in en.json).`);
    }
  }
}

// --- Report ---
if (errors.length > 0) {
  console.error('[i18n:check] Locale errors:');
  for (const e of errors) console.error('  - ' + e);
  console.error('\nFix: keep all locale files structurally identical to en.json.');
  process.exit(1);
}

console.log('[i18n:check] OK —', fileCodes.length, 'locales registered:', fileCodes.join(', '));