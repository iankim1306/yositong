/**
 * build-sitemaps.js — Sitemap Index 구조로 분할 생성
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getSidoSlug, getRegionSlug, SIDO_ORDER } from './region-romanize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASE = 'https://yositong.com';
const TODAY = new Date().toISOString().slice(0, 10);

console.log('━━━ Sitemap 분할 생성 ━━━');

// 1. 정적 페이지
const staticPages = [
  { loc: '/', p: '1.0' }, { loc: '/blog/', p: '0.9' }, { loc: '/quiz/', p: '0.9' },
  // 주제별 기출문제 페이지 — 문항을 HTML로 꺼내 검색에 노출시킨다
  { loc: '/quiz/move/', p: '0.8' },
  { loc: '/quiz/disease/', p: '0.8' },
  { loc: '/quiz/basic/', p: '0.8' },
  { loc: '/quiz/ethics/', p: '0.8' },
  { loc: '/quiz/meal/', p: '0.8' },
  { loc: '/quiz/hygiene/', p: '0.8' },
  { loc: '/quiz/excretion/', p: '0.8' },
  { loc: '/quiz/dementia/', p: '0.8' },
  { loc: '/quiz/emergency/', p: '0.8' },
  { loc: '/quiz/infection/', p: '0.8' },
  { loc: '/quiz/comm/', p: '0.8' },
  { loc: '/quiz/dying/', p: '0.8' },
  { loc: '/quiz/system/', p: '0.8' },
  { loc: '/quiz/selfcare/', p: '0.8' },
  { loc: '/jobs/', p: '0.9' }, { loc: '/academy/', p: '0.9' },
  { loc: '/faq/', p: '0.8' },
  // 이력서 양식 도구 — 정적 HTML 한 장(입력값은 브라우저에만 남는다)
  { loc: '/이력서-양식/', p: '0.9' },
  { loc: '/about/', p: '0.5' }, { loc: '/contact/', p: '0.5' }, { loc: '/privacy/', p: '0.3' },
];
// 글 목록은 build-articles.cjs 가 남긴 published-slugs.json 에서 읽는다.
// 예전엔 여기에 슬러그를 손으로 적었는데, 글을 추가하고 이 배열을 깜빡하면
// 사이트맵에서 빠져 색인이 안 된다. 예약 발행도 자동으로 반영된다.
// (파일이 없으면 build-articles 를 먼저 돌리라는 뜻이다)
let blogSlugs = [];
try {
  const managed = JSON.parse(readFileSync(resolve(__dirname, 'published-slugs.json'), 'utf8')).slugs;
  // 워드프레스에서 넘어온 과거 글은 articles-data.cjs 에 없다.
  // 여기서 빠뜨리면 이미 색인된 URL 이 사이트맵에서 사라진다(실제로 한 번 43편을 날릴 뻔했다).
  const legacy = JSON.parse(readFileSync(resolve(__dirname, 'legacy-slugs.json'), 'utf8')).slugs;
  // 요양용품 리뷰는 build-reviews.cjs 가 남긴 목록에서 읽는다(손으로 적지 않는다)
  let rv = [];
  try {
    rv = JSON.parse(readFileSync(resolve(__dirname, 'review-slugs.json'), 'utf8')).slugs;
  } catch (e) {
    console.warn('⚠️ review-slugs.json 없음 — build-reviews.cjs 를 먼저 돌리세요');
  }
  blogSlugs = [...new Set([...managed, ...legacy, ...rv])];
} catch (e) {
  console.warn('⚠️ 슬러그 목록을 읽지 못했습니다:', e.message);
  console.warn('   node _scripts/build-articles.cjs 를 먼저 실행하세요.');
}
const pageUrls = [
  ...staticPages.map(p => ({ loc: p.loc, priority: p.p })),
  ...blogSlugs.map(s => ({ loc: `/${s}/`, priority: '0.7' })),
];
writeFileSync(resolve(ROOT, 'sitemap-pages.xml'), buildUrlset(pageUrls), 'utf8');
console.log(`✓ sitemap-pages.xml: ${pageUrls.length} URLs`);

// 2. 시도 + 시군구 페이지 (영문 slug)
const regionsData = JSON.parse(readFileSync(resolve(ROOT, 'data/facilities-by-sigungu.json'), 'utf8'));
const regionUrls = [];
// 시도 페이지
// 전국 허브 — 248개 시군구로 들어가는 입구
regionUrls.push({ loc: `/regions/`, priority: '0.9', changefreq: 'weekly' });
for (const sido of SIDO_ORDER) {
  regionUrls.push({ loc: `/regions/${getSidoSlug(sido)}/`, priority: '0.8', changefreq: 'weekly' });
}
// 시군구 페이지
for (const r of Object.values(regionsData)) {
  if (!r.sido || !r.sigungu) continue;
  const slug = getRegionSlug(r.sido, r.sigungu);
  regionUrls.push({ loc: `/regions/${slug}/`, priority: '0.7', changefreq: 'weekly' });
}
writeFileSync(resolve(ROOT, 'sitemap-regions.xml'), buildUrlset(regionUrls), 'utf8');
console.log(`✓ sitemap-regions.xml: ${regionUrls.length} URLs`);

// 3. Index
// (개별 시설 페이지 /facility/:code 는 ISR Write 폭증 원인이라 제거함 — 2026-07-01)
const idx = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<sitemap><loc>${BASE}/sitemap-pages.xml</loc><lastmod>${TODAY}</lastmod></sitemap>
<sitemap><loc>${BASE}/sitemap-regions.xml</loc><lastmod>${TODAY}</lastmod></sitemap>
</sitemapindex>\n`;
writeFileSync(resolve(ROOT, 'sitemap.xml'), idx, 'utf8');

const total = pageUrls.length + regionUrls.length;
console.log(`✓ sitemap.xml (인덱스)\n━━━ 총 URL: ${total.toLocaleString()} ━━━`);

function buildUrlset(urls) {
  const lines = urls.map(u => {
    // 🔴 끝 슬래시를 뗀다. vercel.json 이 trailingSlash:false 라 서버가 /x/ → 308 → /x 로 튕긴다.
  // 슬래시를 붙여 제출하면 구글이 "리디렉션이 포함된 페이지"로 보고 색인하지 않는다(257개가 그랬다).
  const loc = u.loc === '/' ? '/' : u.loc.replace(/\/+$/, '');
  let s = `<url><loc>${BASE}${loc}</loc><lastmod>${TODAY}</lastmod>`;
    if (u.priority) s += `<priority>${u.priority}</priority>`;
    if (u.changefreq) s += `<changefreq>${u.changefreq}</changefreq>`;
    return s + '</url>';
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join('\n')}\n</urlset>\n`;
}
