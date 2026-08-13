#!/usr/bin/env node
// Audit: categorize every !important declaration in the modern theme files.
// Usage: node scripts/audit-important.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const uiDir = fs.existsSync(path.join(root, 'packages/ui/src')) ? path.join(root, 'packages/ui') : root;
const files = {
  V3: path.join(uiDir, 'src/styles/ModernV3.css'),
  V2: path.join(uiDir, 'src/styles/ModernV2.css'),
};

// Known liquid-glass / layout surface classes (should have ZERO remaining !important)
const SURFACE = [
  'guide-info-pane', 'guide-preview-pane', 'guide-preview-placeholder', 'view-transition-container',
  'npb-bar', 'npb-modal', 'settings-panel', 'spm-modal', 'modal-card', 'track-modal', 'track-modal-overlay',
  'subtitle-modal', 'subtitle-modal-overlay', 'stremio-detail-right', 'stremio-detail-panel',
  'nuvio-detail-panel', 'modal-overlay', 'spm-overlay', 'stremio-modal-overlay', 'category-strip',
  'guide-header', 'channel-panel', 'channel-list', 'guide-grid', 'guide-preview', 'guide-info',
  'epg-shift-panel', 'side-panel', 'sidebar', 'title-bar', 'app-container', 'glass-panel',
];

// Page-layout / position rules (legitimately need !important to beat base layout rules)
const LAYOUT_HINTS = ['top:', 'bottom:', 'left:', 'right:', 'width:', 'height:', 'margin:', 'padding:', 'position:', 'z-index:', 'display:'] 

function parseRules(css) {
  // Strip comments
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const selector = m[1].replace(/\s+/g, ' ').trim();
    const body = m[2];
    if (!body.includes('!important')) continue;
    const decls = body.split(';').map(d => d.trim()).filter(d => d.includes('!important'));
    rules.push({ selector, decls });
  }
  return rules;
}

let grandTotal = 0;
for (const [name, rel] of Object.entries(files)) {
  const css = fs.readFileSync(rel, 'utf8');
  const rules = parseRules(css);
  const totalDecls = rules.reduce((a, r) => a + r.decls.length, 0);
  grandTotal += totalDecls;

  const surfaceRules = rules.filter(r => SURFACE.some(s => new RegExp(`\\.${s}([ .:#\\[\\]-]|$)`).test(r.selector)));
  const layoutRules = rules.filter(r => surfaceRules.includes(r) === false && r.decls.some(d => LAYOUT_HINTS.some(h => d.startsWith(h))));
  const interiorRules = rules.filter(r => !surfaceRules.includes(r) && !layoutRules.includes(r));

  const sum = rs => rs.reduce((a, r) => a + r.decls.length, 0);

  console.log(`\n===== ${name} =====`);
  console.log(`Total rules with !important: ${rules.length}  |  total declarations: ${totalDecls}`);

  console.log(`\n-- SURFACE-CLASS rules (should be 0): ${surfaceRules.length} rules / ${sum(surfaceRules)} decls`);
  surfaceRules.slice(0, 10).forEach(r => console.log(`   ${r.selector.slice(0, 100)}`));

  console.log(`\n-- PAGE/LAYOUT rules: ${layoutRules.length} rules / ${sum(layoutRules)} decls`);
  layoutRules.slice(0, 12).forEach(r => console.log(`   ${r.selector.slice(0, 100)}`));

  console.log(`\n-- INTERIOR-ELEMENT rules: ${interiorRules.length} rules / ${sum(interiorRules)} decls`);
  const byKind = {};
  for (const r of interiorRules) {
    const cls = (r.selector.match(/\.([a-zA-Z][\w-]*)/) || [])[1] || '?';
    const key = cls.slice(0, 30);
    byKind[key] = (byKind[key] || 0) + r.decls.length;
  }
  const top = Object.entries(byKind).sort((a, b) => b[1] - a[1]).slice(0, 25);
  for (const [k, n] of top) console.log(`   ${String(n).padStart(4)}  .${k}`);
  console.log(`   ... ${Object.keys(byKind).length} distinct element classes`);
}
console.log(`\nGrand total !important declarations: ${grandTotal}`);
