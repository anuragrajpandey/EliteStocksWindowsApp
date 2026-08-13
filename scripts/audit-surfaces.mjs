// Audit: for each surface element, list every rule (across all CSS files) that
// could match a bare element with that class and set glass-affecting properties,
// sorted by specificity. Helps decide where tokens must be added and which
// !important overrides can be deleted.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const postcss = require(path.resolve('node_modules/.pnpm/postcss@8.5.6/node_modules/postcss'));

const ui = 'packages/ui/src';
const files = [
  ...fs.readdirSync(ui + '/components').filter(f => f.endsWith('.css')).map(f => `components/${f}`),
  ...['components/vod/VerticalSidebar.css', 'components/vod/HeroSection.css', 'components/sports/SportsHub.css', 'components/stremio/StremioPage.css', 'components/nuvio/NuvioPage.css'],
  'styles/themes.css', 'styles/ModernThemeBase.css', 'styles/ModernV2.css', 'styles/ModernV3.css',
  'light-theme-overrides.css', 'App.css',
].filter(Boolean);

const targets = ['category-strip', 'guide-grid-section', 'guide-info-pane', 'vertical-sidebar', 'vod-page__content', 'dvr-dashboard', 'sports-preview-minibar', 'nuvio-page', 'tvcp-page', 'sports-hub'];
const propsOfInterest = ['background', 'background-attachment', 'border', 'border-radius', 'box-shadow', 'backdrop-filter', '-webkit-backdrop-filter', 'background-color', 'border-right', 'border-top', 'border-bottom', 'border-left'];

function specificity(sel) {
  // strip pseudo-arg contents for :not()/:is()/:has() etc.
  let s = sel.replace(/:(not|is|where|has|matches)\(([^)]*)\)/g, (m, fn, inner) => ':' + fn + inner.replace(/[.#\[]/g, ''));
  let a = 0, b = 0, c = 0;
  // count ids
  a += (s.match(/#[a-zA-Z_][\w-]*/g) || []).length;
  // classes, attrs, pseudo-classes (incl. those inside :not etc. counted coarsely)
  b += (s.match(/\.[a-zA-Z_][\w-]*/g) || []).length;
  b += (s.match(/\[[^\]]+\]/g) || []).length;
  b += (s.match(/:(?!:)[a-zA-Z-]+/g) || []).length;
  // pseudo-elements
  b += (s.match(/::[a-zA-Z-]+/g) || []).length;
  // elements
  c += (s.replace(/[.#:[]][\w-]*|\([^)]*\)/g, '').match(/(^|[^a-zA-Z0-9_-])[a-zA-Z][a-zA-Z0-9-]*/g) || []).length;
  return a * 1000 + b * 100 + c;
}

for (const t of targets) {
  console.log(`\n######## .${t} ########`);
  const rows = [];
  for (const f of files) {
    const full = path.join(ui, f);
    if (!fs.existsSync(full)) continue;
    let root;
    try { root = postcss.parse(fs.readFileSync(full, 'utf8')); } catch { continue; }
    root.walk((node) => {
      if (node.type !== 'rule') return;
      for (const rawSel of node.selector.split(',')) {
        const sel = rawSel.trim();
        if (!sel.includes('.' + t)) continue;
        // must reference the class as a compound, not a child/descendant usage (.x .t or .x>.t)
        const parts = sel.split(/\s+|\s*>\s*/);
        const last = parts[parts.length - 1];
        const isTarget = last.split(/[.:[]/)[0] === '.' + t || last.startsWith('.' + t) && (last === '.' + t || last.startsWith('.' + t + ':') || last.startsWith('.' + t + '.') || last.startsWith('.' + t + '['));
        if (!isTarget) continue;
        const props = {};
        node.nodes.forEach((n) => { if (n.type === 'decl' && propsOfInterest.includes(n.prop)) props[n.prop] = (n.important ? '!' : '') + n.value.slice(0, 48); });
        if (Object.keys(props).length === 0) continue;
        rows.push({ f, sel, spec: specificity(sel), props });
      }
    });
  }
  rows.sort((a, b) => b.spec - a.spec);
  for (const r of rows) {
    const pf = Object.entries(r.props).map(([k, v]) => `${k}:${v}`).join(' | ');
    console.log(`  [${r.spec}] ${r.f.replace(/^components\//, '')}:${r.sel}  →  ${pf}`);
  }
}
