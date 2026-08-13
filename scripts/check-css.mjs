import fs from 'node:fs';

const files = process.argv.slice(2);
let ok = true;
for (const f of files) {
  const css = fs.readFileSync(f, 'utf8');
  let depth = 0, paren = 0, inStr = null, inComment = false;
  for (let i = 0; i < css.length; i++) {
    const c = css[i], n = css[i + 1];
    if (inComment) { if (c === '*' && n === '/') { inComment = false; i++; } continue; }
    if (c === '/' && n === '*') { inComment = true; i++; continue; }
    if (inStr) { if (c === '\\') { i++; } else if (c === inStr) { inStr = null; } continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '{') depth++;
    if (c === '}') depth--;
    if (c === '(') paren++;
    if (c === ')') paren--;
  }
  const status = depth === 0 && paren === 0 ? 'OK' : `MISMATCH braces=${depth} parens=${paren}`;
  if (status !== 'OK') ok = false;
  console.log(`${f}: ${status}`);
}
process.exit(ok ? 0 : 1);
