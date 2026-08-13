// Group the remaining v3 !important rules by their primary target class
import fs from 'node:fs';

const css = fs.readFileSync('packages/ui/src/styles/ModernV3.css', 'utf8');
const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');

// Walk rules, tracking selector + whether the body contains !important
const groups = new Map(); // primaryClass -> { rules, decls }
const re = /([^{}]+)\{([^{}]*)\}/g;
let m;
while ((m = re.exec(clean))) {
  const sel = m[1].replace(/\s+/g, ' ').trim();
  const body = m[2];
  const impCount = (body.match(/!important/g) || []).length;
  if (!impCount) continue;
  // primary class: first class token in the LAST compound selector
  const lastCompound = sel.split(/\s+[>+~]\s+|\s+/).pop() || sel;
  const cls = (lastCompound.match(/\.([\w-]+)/) || [])[1] || '(no-class)';
  if (!groups.has(cls)) groups.set(cls, { rules: 0, decls: 0 });
  const g = groups.get(cls);
  g.rules++;
  g.decls += impCount;
}

const sorted = [...groups.entries()].sort((a, b) => b[1].decls - a[1].decls);
let totalRules = 0, totalDecls = 0;
for (const [cls, g] of sorted) {
  totalRules += g.rules;
  totalDecls += g.decls;
  console.log(`${String(g.rules).padStart(4)} rules / ${String(g.decls).padStart(4)} decls  .${cls}`);
}
console.log(`\nTOTAL v3 !important: ${totalRules} rules / ${totalDecls} decls`);
