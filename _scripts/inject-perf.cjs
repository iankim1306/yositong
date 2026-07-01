// 모든 .html에 성능 힌트(preconnect/dns-prefetch) + 카드 이미지에 loading="lazy" 일괄 주입
const fs = require('fs');
const path = require('path');

const PERF_HINTS = `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="dns-prefetch" href="https://www.googletagmanager.com">
<link rel="dns-prefetch" href="https://vitals.vercel-insights.com">
`;
const HINT_MARKER = 'rel="preconnect" href="https://cdn.jsdelivr.net"';

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

let hintsInjected = 0, hintsSkip = 0;
let lazyAdded = 0;

for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1) preconnect/dns-prefetch 힌트 주입
  if (!content.includes(HINT_MARKER) && content.includes('</head>')) {
    content = content.replace('</head>', PERF_HINTS + '</head>');
    hintsInjected++;
    changed = true;
  } else if (content.includes(HINT_MARKER)) {
    hintsSkip++;
  }

  // 2) <img> 태그에 loading="lazy" / decoding="async" 추가 (이미 있는 것 제외, fetchpriority="high"인 LCP 이미지 제외)
  content = content.replace(/<img\b([^>]*)>/g, (m, attrs) => {
    if (/loading\s*=/.test(attrs)) return m;
    if (/fetchpriority\s*=\s*["']high/.test(attrs)) return m;
    lazyAdded++;
    const decoding = /decoding\s*=/.test(attrs) ? '' : ' decoding="async"';
    return `<img${attrs} loading="lazy"${decoding}>`;
  });

  if (changed || lazyAdded > 0) {
    fs.writeFileSync(file, content, 'utf8');
  }
}
console.log(`힌트 주입: ${hintsInjected}, 이미 있음: ${hintsSkip}, lazy 추가된 <img>: ${lazyAdded}`);
