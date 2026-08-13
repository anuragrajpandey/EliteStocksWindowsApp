// Audit: every var(--x) usage in the CSS corpus must be defined somewhere,
// and v3-only tokens must be consumed with a fallback (2-arg var()) in base rules.
import fs from 'node:fs';
import path from 'node:path';

// Resolve the ui package whether this runs from the repo root or from packages/ui.
const cwd = process.cwd();
const uiDir = fs.existsSync(path.join(cwd, 'packages/ui/src')) ? path.join(cwd, 'packages/ui') : cwd;
const root = path.join(uiDir, 'src');
const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.css')) files.push(p);
  }
}
walk(root);

const defined = new Map(); // token -> file
const used = []; // {token, file, hasFallback, line}

for (const f of files) {
  const css = fs.readFileSync(f, 'utf8');
  // definitions: --name: anywhere (approx, matches custom prop declarations)
  const defRe = /(--[\w-]+)\s*:/g;
  let m;
  while ((m = defRe.exec(css))) {
    if (!defined.has(m[1])) defined.set(m[1], f);
  }
  // usages: var(--name or var(--name, fallback
  const useRe = /var\(\s*(--[\w-]+)(\s*,\s*[^)]*)?\)/g;
  while ((m = useRe.exec(css))) {
    const line = css.slice(0, m.index).split('\n').length;
    used.push({ token: m[1], file: f, hasFallback: !!m[2], line });
  }
}

const undefinedTokens = [...new Set(used.filter(u => !defined.has(u.token)).map(u => u.token))];
console.log('=== UNDEFINED TOKENS (used but never defined) ===');
for (const t of undefinedTokens) {
  const refs = used.filter(u => u.token === t);
  console.log(`${t}  (${refs.length} refs, e.g. ${refs.slice(0,3).map(r => `${r.file.split('/').pop()}:${r.line}`).join(', ')})`);
}
if (undefinedTokens.length === 0) console.log('(none)');

// Tokens defined ONLY in ModernV3.css (v3-gated) consumed in base/component files
// without a fallback -> would be undefined in v1/v2.
const v3File = path.join(uiDir, 'src/styles/ModernV3.css');
const v3Only = [...defined.entries()].filter(([, f]) => f === v3File).map(([t]) => t);
console.log('\n=== v3-ONLY TOKENS consumed in base/component files WITHOUT fallback ===');
let risky = 0;
for (const u of used) {
  if (!v3Only.includes(u.token)) continue;
  const isV3File = u.file === v3File || u.file.includes('ModernV2.css') || u.file.includes('ModernThemeBase.css');
  if (isV3File) continue; // inside theme files it's fine (same scope or version-gated)
  if (!u.hasFallback) {
    risky++;
    console.log(`${u.token}  ${u.file.split('/').pop()}:${u.line}`);
  }
}
if (risky === 0) console.log('(none — all v3-only tokens consumed with fallbacks in base rules)');

// Tokens defined in ModernV2.css consumed in base files without fallback (v1 risk)
const v2File = path.join(uiDir, 'src/styles/ModernV2.css');
const v2Only = [...defined.entries()].filter(([, f]) => f === v2File).map(([t]) => t);
console.log('\n=== v2-ONLY TOKENS consumed in base/component files WITHOUT fallback ===');
let risky2 = 0;
for (const u of used) {
  if (!v2Only.includes(u.token)) continue;
  const isTheme = u.file === v2File || u.file === v3File || u.file.includes('ModernThemeBase.css');
  if (isTheme) continue;
  if (!u.hasFallback) {
    risky2++;
    console.log(`${u.token}  ${u.file.split('/').pop()}:${u.line}`);
  }
}
if (risky2 === 0) console.log('(none)');

// Fail the build when a v2/v3-only token is consumed without a fallback in a
// base/component rule — that is the cascade-collision bug class the migration
// exists to prevent. (The undefined-token section above stays informational:
// several tokens are injected at runtime via setProperty and are intentionally
// not defined in CSS.)
process.exit(risky > 0 || risky2 > 0 ? 1 : 0);
