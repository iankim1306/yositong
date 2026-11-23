/**
 * fix-trailing-slash.cjs — 끝 슬래시를 떼어 서버 동작과 맞춘다.
 *
 * 🔴 왜
 *   vercel.json 이 `"trailingSlash": false` 라 서버는 /x/ → **308** → /x 로 튕긴다.
 *   그런데 사이트맵·canonical·내부링크가 전부 /x/ 형태였다.
 *   구글 서치콘솔 실측(2026-11-23): **"리디렉션이 포함된 페이지" 257개** — 색인된 305개에 육박했다.
 *   사이트맵이 리디렉션 URL을 제출하고, canonical 이 자기 자신이 아닌 리디렉션 URL을 가리키고 있었다.
 *
 * 방향은 "슬래시를 떼는 쪽"이다. trailingSlash:true 로 뒤집으면 이미 색인된 305개가
 * 전부 리디렉션으로 바뀐다 — 훨씬 위험하다.
 *
 * 건드리는 것: canonical · og:url · JSON-LD 안의 사이트 URL · 내부 href
 * 건드리지 않는 것: 루트 `/` · 외부 URL · 파일 경로(.xml/.png/.txt 등)
 *
 * 실행: node _scripts/fix-trailing-slash.cjs [--dry]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry');
const BASE = 'https://yositong.com';

// 끝 슬래시를 떼면 안 되는 것
function keep(p) {
  return p === '/' || p === '' || p === BASE + '/' || p === BASE;
}

function stripOne(u) {
  if (keep(u)) return u;
  return u.replace(/\/+(?=$|[?#])/, '');
}

const RULES = [
  // href="/어쩌고/"  (루트 제외, 쿼리·앵커 앞의 슬래시도 포함)
  { re: /href="(\/[^"]*?)\/(?=["?#])/g, fn: (m, p1) => `href="${p1}` },
  // 절대 URL 형태 (canonical·og:url·JSON-LD)
  { re: new RegExp('(' + BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\/[^"\\s<\\\\]*?)\\/(?=["\\s<?#\\\\])', 'g'), fn: (m, p1) => p1 },
];

function fixText(s) {
  let out = s;
  for (const r of RULES) out = out.replace(r.re, r.fn);
  return out;
}

function walk(dir, exts, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.vercel'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some(x => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

// 1) 데이터·템플릿 (다음 빌드에도 반영되도록)
const SRC = [
  '_scripts/articles-data.cjs',
  '_scripts/reviews-data.cjs',
  '_scripts/reviews-welfare.cjs',
  '_scripts/build-articles.cjs',
  '_scripts/build-reviews.cjs',
  '_scripts/build-quiz-pages.cjs',
  '_scripts/build-region-directories.js',
].map(p => path.join(ROOT, p)).filter(fs.existsSync);

// 2) 생성물 HTML 전부
const HTML = walk(ROOT, ['.html']);

let changed = 0, scanned = 0;
for (const f of [...SRC, ...HTML]) {
  scanned++;
  const before = fs.readFileSync(f, 'utf8');
  const after = fixText(before);
  if (before === after) continue;
  if (!DRY) fs.writeFileSync(f, after, 'utf8');
  changed++;
}

console.log(`${DRY ? '[dry] ' : ''}✓ 끝 슬래시 정리 — ${changed}/${scanned}개 파일 변경`);
