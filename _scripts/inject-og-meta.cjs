// og:image 메타태그가 없는 모든 .html 파일에 일괄 주입 (멱등)
const fs = require('fs');
const path = require('path');

const OG_TAGS = `<meta property="og:image" content="https://yositong.com/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://yositong.com/assets/og-image.png">
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

let inserted = 0, alreadyHas = 0, noHead = 0;
for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('og:image') || content.includes('property="og:image"')) {
    alreadyHas++;
    continue;
  }
  if (!content.includes('</head>')) {
    noHead++;
    continue;
  }
  // </head> 직전에 삽입
  content = content.replace('</head>', OG_TAGS + '</head>');
  fs.writeFileSync(file, content, 'utf8');
  inserted++;
}
console.log(`주입: ${inserted}, 이미 있음: ${alreadyHas}, </head> 없음: ${noHead}`);
