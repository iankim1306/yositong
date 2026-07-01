// 모든 HTML 파일에 GA4 삽입
const fs = require('fs');
const path = require('path');

const GA4_ID = 'G-5VX7EX4PCW';
const GA4_SNIPPET = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_ID}');
</script>
`;

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
  if (content.includes(GA4_ID)) { skipped++; continue; }
  if (!content.includes('<head>')) { noHead++; continue; }
  content = content.replace('<head>', '<head>\n' + GA4_SNIPPET);
  fs.writeFileSync(file, content, 'utf8');
  inserted++;
}
console.log(`삽입: ${inserted}, 이미 있음: ${skipped}, <head> 없음: ${noHead}`);
