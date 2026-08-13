// Compare rule selectors between the deleted ModernTheme.css monolith (HEAD)
// and the new split files, to surface rules that may have been dropped.
import { execSync } from 'node:child_process';

const monolith = execSync('git show HEAD:packages/ui/src/components/ModernTheme.css', { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

function extractRules(css) {
  const rules = [];
  // strip comments
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // match selectors up to {
  const re = /([^{}]+)\{/g;
  let m;
  while ((m = re.exec(css))) {
    const sel = m[1].replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (sel && !sel.includes('@')) rules.push(sel);
  }
  return rules;
}

const mono = extractRules(monolith);
const newFiles = ['packages/ui/src/styles/ModernThemeBase.css', 'packages/ui/src/styles/ModernV2.css', 'packages/ui/src/styles/ModernV3.css'];
const fs = await import('node:fs');
let newText = '';
for (const f of newFiles) newText += '\n' + fs.readFileSync(f, 'utf8');
const news = extractRules(newText);

// Normalize a selector for loose matching: drop whitespace, and drop the version
// prefixes that legitimately changed (html.modern-ui-v3[data-theme] etc.)
function norm(s) {
  return s.replace(/\s+/g, ' ').trim();
}

// For each monolith rule, find a "similar" rule in the new files: same selector,
// or selector differing only by a known prefix/suffix wrapper.
const monoSet = new Set(mono.map(norm));
const newSet = new Set(news.map(norm));

const missing = [];
for (const s of mono) {
  const n = norm(s);
  if (newSet.has(n)) continue;
  // try suffix-matching the class chain: compare the LAST class/tag token group
  const lastToken = n.split(/[ >+~]/).pop();
  if (!lastToken) { missing.push(n); continue; }
  const hasSimilar = [...newSet].some(t => {
    const tl = t.split(/[ >+~]/).pop();
    return tl === lastToken && (t.includes('.modern-ui') || t.startsWith('html') || t.startsWith('.modern-ui'));
  });
  if (!hasSimilar) missing.push(n);
}

console.log(`monolith rules: ${mono.length}`);
console.log(`new-file rules: ${news.length}`);
console.log(`\n=== monolith selectors with NO similar rule in the new files (${missing.length}) ===`);
for (const s of missing.slice(0, 80)) console.log('  ' + s);
