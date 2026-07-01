// 모든 HTML에 Vercel Web Analytics + Speed Insights 스크립트 삽입
const fs = require('fs');
const path = require('path');

const SNIPPET = `<script defer src="/_vercel/insights/script.js"></script>
<script defer src="/_vercel/speed-insights/script.js"></script>
`;
const MARKER = '/_vercel/insights/script.js';

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.vercel', '.git', '_scripts']);

function walk(dir, list = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, list);
    else if (name.endsWith('.html')) list.push(full);
  }
  return list;
}

let inserted = 0, skipped = 0, noHead = 0;
for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(MARKER)) { skipped++; continue; }
  if (!content.includes('<head>')) { noHead++; continue; }
  // <head> 바로 다음에 삽입
  content = content.replace('<head>', '<head>\n' + SNIPPET);
  fs.writeFileSync(file, content, 'utf8');
  inserted++;
}
console.log(`삽입: ${inserted}, 이미 있음: ${skipped}, <head> 없음: ${noHead}`);
