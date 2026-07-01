// 모든 .html에 애드센스 스크립트 + google-adsense-account 메타 일괄 주입 (멱등)
const fs = require('fs');
const path = require('path');

const PUB = 'pub-7852008102553944';
const SNIPPET = `<meta name="google-adsense-account" content="ca-${PUB}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${PUB}" crossorigin="anonymous"></script>
`;
const MARKER = 'google-adsense-account';

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

let inserted = 0, alreadyHas = 0, noHead = 0;
for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(MARKER)) { alreadyHas++; continue; }
  if (!content.includes('</head>')) { noHead++; continue; }
  content = content.replace('</head>', SNIPPET + '</head>');
  fs.writeFileSync(file, content, 'utf8');
  inserted++;
}
console.log(`주입: ${inserted}, 이미 있음: ${alreadyHas}, </head> 없음: ${noHead}`);
