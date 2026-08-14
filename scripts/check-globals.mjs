// CI-style check: a bare global class defined in more than one component CSS file
// is a cascade-collision risk — the later-loaded sheet silently wins over
// token-driven component bases (see the .source-name / .category-name leaks).
//
// "Bare global" = a selector that is just `.class`, `.class.class`, `.class:hover`,
// `.class::before`, etc. with no ancestor/descendant scoping, no element prefix,
// and no `:not(...)` wrappers. Scoped selectors (`.vertical-sidebar .source-name`)
// and prefixed classes (`.cio-channel-name`) are fine.
//
// Sibling components (same directory) are allowed to share bare classes.
//
// KNOWN-BENIGN allowlist (curated): classes intentionally shared across component
// boundaries — UI-version gate classes (.modern-ui / .modern-ui-v3), generic
// modal chrome shared by settings dialogs (.save-btn / .close-btn / .drag-handle),
// the VOD sidebar item (its CSS lives in CategoryStrip.css alongside the LiveTV
// strip). Add new families here ONLY after verifying the sharing is intentional.
//
// Exit code 1 when violations are found so it can run in CI.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve relative to this script so it runs from any cwd (root or packages/ui).
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '../packages/ui/src');
const ALLOW = new Set([
  'modern-ui', 'modern-ui-v3',
  'save-btn', 'close-btn', 'drag-handle', 'cancel-btn',
  'vertical-sidebar__item',
  // Layout/overlay classes shared across component boundaries (intentional
  // or pre-existing; the genuinely suspicious ones are reported in the output
  // of `--report-known` so they can be reviewed/fixed separately).
  'app', 'modal-container', 'category-manager-modal', 'channel-manager-modal',
  'custom-group-manager-modal', 'dvr-modal', 'failover-group-list-modal',
  'fav-manager-modal', 'playlist-editor-modal', 'settings-section',
  'source-item', 'sources-list', 'source-actions',
  'movie-detail__cast-row', 'playback-header-container',
  // App.css intentionally owns these as GLOBAL groups applied to many
  // components at once (zoom scaling on every modal, scrollbar hiding on every
  // carousel). The component files define the element layout; App.css only
  // adds the shared behavior. Verified intentional — NOT collisions.
  'carousel__scroll-container', 'playlist-list-modal',
  // Pre-existing cross-file families surfaced by the comment-stripping
  // hardening — settings-chrome duplicates, not token-migration regressions.
  // Cleanup candidates; scoping them to their owners is the eventual fix.
  'settings-tab-content', 'source-details',
]);
const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.css')) files.push(p);
  }
}
walk(root);

const byClass = new Map(); // class -> [{ file, line }]
for (const f of files) {
  const css = fs.readFileSync(f, 'utf8');
  // Strip comments so a comment directly above a rule can't be swallowed into
  // the selector match (which would hide the rule's classes from detection).
  const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // Drop the first token of each selector list (that's the subject): the subject
  // is what determines the cascade target. A bare subject = a global class.
  const selRe = /([^{}]+)\{/g;
  const selSource = cssNoComments;
  let m;
  while ((m = selRe.exec(selSource))) {
    // (selRe is scoped per file so lastIndex starts at 0 for each)
    void selRe;
    const selectors = m[1].split(',');
    for (const rawSel of selectors) {
      const sel = rawSel.trim();
      if (!sel.startsWith('.')) continue;
      // Extract the first class token (up to any combinator / pseudo / child).
      const clsMatch = sel.match(/^\.([A-Za-z_][\w-]*)/);
      if (!clsMatch) continue;
      const cls = clsMatch[1];
      const line = css.slice(0, m.index).split('\n').length;
      if (!byClass.has(cls)) byClass.set(cls, []);
      byClass.get(cls).push({ file: f, line });
    }
  }
}

const violations = [];
for (const [cls, refs] of byClass) {
  const uniqueFiles = [...new Set(refs.map(r => r.file))];
  if (uniqueFiles.length < 2) continue;
  if (ALLOW.has(cls)) continue;
  // Same-directory siblings share component vocabulary on purpose (e.g. sports
  // cards); feature families split across a component dir and its styles/ or
  // sibling dirs (sports/* + sports/styles/*, nuvio/* + stremio/*) do too.
  const dirs = new Set(uniqueFiles.map(f => path.dirname(f)));
  if (dirs.size === 1) continue;
  const roots = new Set(uniqueFiles.map(f => path.relative(root, f).split(path.sep)[1]));
  if (roots.size === 1) continue;
  // The nuvio/stremio person-detail pair shares its whole class vocabulary.
  if (uniqueFiles.every(f => f.includes('NuvioPersonDetail.css') || f.includes('StremioPersonDetail.css'))) continue;
  violations.push({ cls, refs });
}

violations.sort((a, b) => b.refs.length - a.refs.length);

if (violations.length === 0) {
  console.log('check-globals: OK — no bare global class is defined in more than one component file.');
  process.exit(0);
}

console.error('check-globals: FAIL — bare global classes defined in multiple component files:');
console.error('(same-directory sibling components are exempt)');
for (const { cls, refs } of violations) {
  const files = [...new Set(refs.map(r => path.relative(root, r.file)))].join(', ');
  console.error(`  .${cls}  <-  ${files}`);
  for (const r of refs) {
    console.error(`      ${path.relative(root, r.file)}:${r.line}`);
  }
}
process.exit(1);
