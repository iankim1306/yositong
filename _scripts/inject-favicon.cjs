// 모든 .html 파일 head에 favicon 세트 + theme-color 일괄 주입 (멱등)
const fs = require('fs');
const path = require('path');

const FAVICON_BLOCK = `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#16a34a">
`;
const MARKER = 'apple-touch-icon';

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
  content = content.replace('</head>', FAVICON_BLOCK + '</head>');
  fs.writeFileSync(file, content, 'utf8');
  inserted++;
}
console.log(`주입: ${inserted}, 이미 있음: ${alreadyHas}, </head> 없음: ${noHead}`);
