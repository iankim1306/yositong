// 모든 .html에 BreadcrumbList JSON-LD 일괄 주입 (멱등). URL 경로 기반 자동 생성.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.vercel', '.git', '_scripts', 'regions']); // regions는 빌드 스크립트가 자체 생성
const BASE = 'https://yositong.com';

// 폴더 슬러그 → 표시명
const NAME_MAP = {
  jobs: '취업정보',
  quiz: '기출문제',
  academy: '학원가이드',
  blog: '정보글',
  about: '소개',
  contact: '문의',
  privacy: '개인정보처리방침',
  faq: '자주묻는질문'
};

function pathToBreadcrumb(absFile) {
  const rel = path.relative(ROOT, absFile).replace(/\\/g, '/');
  // 'about/index.html' → ['about']
  // 'jobs/facility/detail.html' → ['jobs', 'facility']
  // '요양보호사-월급-실수령액-근무처별-정리/index.html' → ['요양보호사 월급 실수령액 근무처별 정리']
  const parts = rel.split('/');
  // 파일명 제거
  parts.pop();
  if (parts.length === 0) return null; // 메인 (이미 schema 있음)

  const items = [{ "@type": "ListItem", "position": 1, "name": "홈", "item": BASE + "/" }];
  let curUrl = BASE;
  parts.forEach((p, i) => {
    curUrl += '/' + p;
    const decoded = decodeURIComponent(p);
    const name = NAME_MAP[decoded] || decoded.replace(/-/g, ' ');
    items.push({
      "@type": "ListItem",
      "position": i + 2,
      "name": name,
      "item": curUrl + '/'
    });
  });
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items };
}

function walk(dir, list = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, list);
    else if (name === 'index.html') list.push(full);
  }
  return list;
}

let inserted = 0, alreadyHas = 0, skipped = 0;
for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('"BreadcrumbList"')) { alreadyHas++; continue; }
  const bc = pathToBreadcrumb(file);
  if (!bc) { skipped++; continue; }
  if (!content.includes('</head>')) { skipped++; continue; }
  const tag = `<script type="application/ld+json">${JSON.stringify(bc)}</script>\n`;
  content = content.replace('</head>', tag + '</head>');
  fs.writeFileSync(file, content, 'utf8');
  inserted++;
}
console.log(`주입: ${inserted}, 이미 있음: ${alreadyHas}, 스킵: ${skipped}`);
