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
  { loc: '/jobs/', p: '0.9' }, { loc: '/academy/', p: '0.9' },
  { loc: '/faq/', p: '0.8' },
  { loc: '/about/', p: '0.5' }, { loc: '/contact/', p: '0.5' }, { loc: '/privacy/', p: '0.3' },
];
const blogSlugs = [
  '2025-요양보호사-자격증-취득-신청-시험정보-급여-전망','2025년-요양보호사-시험-기출문제-완벽-분석',
  '2025년-요양보호사-시험일정-완벽-정리','요양보호사-cbt-시험-사전-테스트-방법-및-꿀팁',
  '요양보호사-관련-자격증-어떤-걸-따면-좋을까','요양보호사-교육비-국비지원-받는-방법과-혜택-총정',
  '요양보호사-교육시간-늘어난-이유-기존-취득자들은','요양보호사-구인구직-어디서-찾을까-구직사이트-정',
  '요양보호사-국비지원-난-얼마나-낼까','요양보호사-급여-실수령액은-이정도',
  '요양보호사-문제집-꼭-필요할까-합격수기-포함','요양보호사-시험-난이도-어렵나요',
  '요양보호사-시험-준비물-체크하고-가세요','요양보호사-시험문제-풀이-어디서',
  '요양보호사-실습-준비부터-후기까지-총정리','요양보호사-업무강도-실제로-어떨까-현장-목소리로',
  '요양보호사-업무범위-제대로-알기','요양보호사-월급-실수령액-근무처별-정리',
  '요양보호사-전망-분석-20년-뒤엔-99만명이-부족하다고','요양보호사-필기시험-2025년-최신-출제경향-및-합격',
  '요양보호사-학원-선택-필수-고려사항',
  '요양보호사-시급-2026-최신-인상-기준',
  '요양보호사-시설별-업무강도-비교',
  '요양보호사-야간근무-실제-일과',
  '요양보호사-허리-건강-지키는-법',
  '요양보호사-실습-기관-선택-기준',
  '요양보호사-실습-후기-준비물',
  '요양보호사-시험-자주-틀리는-문제-유형',
  '요양보호사-실기시험-준비-방법',
  '방문요양-시급-vs-요양원-월급-비교',
  '요양보호사-4대보험-실수령액-계산',
  '요양보호사-자격증-1급-2급-차이',
  '50대-60대-요양보호사-취업-가이드',
  '내일배움카드-요양보호사-신청-방법',
  '요양보호사-남성-취업-현실',
  '요양보호사-치매-어르신-대응법',
  '요양보호사-목욕보조-방법',
  '요양보호사-시험-일정-2026',
  '요양보호사-필기-실기-합격률',
  '요양보호사-자격증-유효기간-보수교육',
  '요양보호사-면접-질문-답변',
  '요양보호사-이력서-쓰는법',
  '요양보호사-퇴직금-받는법',
  '가족요양보호사-신청-자격',
  '요양보호사-간병인-차이',
  '요양보호사-사회복지사-차이',
  '장기요양등급-판정기준',
  '요양보호사-장기근속장려금',
  '요양보호사-수당-종류',
  '요양보호사-겸직-투잡',
  '요양보호사-폭언-성희롱-대처',
  '방문요양센터-창업-개설',
  '입주-요양보호사-24시간',
  '주야간보호센터-요양보호사',
  // ── 요양용품 제휴 리뷰 ──
  'reviews',
  'reviews/성인용-기저귀-추천',
  'reviews/간병-방수매트-추천',
  'reviews/욕창예방-방석-추천',
  'reviews/목욕의자-추천',
  'reviews/노인-보행기-추천',
  'reviews/노인-지팡이-추천',
  'reviews/욕실-안전손잡이-추천',
  'reviews/욕실-미끄럼방지매트-추천',
  'reviews/환자용-식기-추천',
  'reviews/환자용-빨대컵-추천',
  // ── 요양용품 리뷰 라운드2 ──
  'reviews/침대-안전난간-추천',
  'reviews/식사-앞치마-추천',
  'reviews/이동식-좌변기-추천',
  'reviews/이동보조벨트-추천',
  'reviews/환자-호출벨-추천',
  'reviews/간병-위생장갑-추천',
  'reviews/환자-영양식-추천',
  'reviews/틀니-세정제-추천',
  'reviews/노인-실내화-추천',
  'reviews/문턱-경사로-추천',
];
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
    let s = `<url><loc>${BASE}${u.loc}</loc><lastmod>${TODAY}</lastmod>`;
    if (u.priority) s += `<priority>${u.priority}</priority>`;
    if (u.changefreq) s += `<changefreq>${u.changefreq}</changefreq>`;
    return s + '</url>';
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join('\n')}\n</urlset>\n`;
}
