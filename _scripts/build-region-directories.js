/**
 * build-region-directories.js
 * 시군구별 + 시도별 정적 디렉토리 페이지 생성 (영문 slug)
 * /regions/{sido-slug}-{sigungu-slug}/index.html
 * /regions/{sido-slug}/index.html (시도 통합)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getSidoSlug, getSigunguSlug, getRegionSlug, SIDO_SLUGS, SIGUNGU_SLUGS, SIDO_ORDER } from './region-romanize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_PATH = resolve(ROOT, 'data/facilities-by-sigungu.json');
const WELFARE_PATH = resolve(ROOT, 'data/welfare.json');
const REGION_DIR = resolve(ROOT, 'regions');

console.log('━━━ 시군구 디렉토리 정적 페이지 생성 (영문 slug) ━━━');
const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));

// 채용공고 데이터 (시도별 그룹화)
let welfareJobs = [];
try {
  welfareJobs = JSON.parse(readFileSync(WELFARE_PATH, 'utf8'));
} catch { welfareJobs = []; }
const jobsBySido = {};
for (const j of welfareJobs) {
  if (!j.sido) continue;
  if (!jobsBySido[j.sido]) jobsBySido[j.sido] = [];
  jobsBySido[j.sido].push(j);
}
const regionKeys = Object.keys(data);

// 시도별 시군구 그룹
const sidoGroups = {};
for (const key of regionKeys) {
  const r = data[key];
  if (!r.sido || !r.sigungu) continue;
  if (!sidoGroups[r.sido]) sidoGroups[r.sido] = [];
  const slug = getRegionSlug(r.sido, r.sigungu);
  sidoGroups[r.sido].push({ ...r, slug });
}

let created = 0;

// ─── 시군구 페이지 ───
for (const key of regionKeys) {
  const region = data[key];
  const { sido, sigungu, total, care, home, day, other, facilities } = region;
  if (!sido || !sigungu) continue;

  const slug = getRegionSlug(sido, sigungu);
  const dirPath = resolve(REGION_DIR, slug);
  mkdirSync(dirPath, { recursive: true });

  const neighbors = (sidoGroups[sido] || [])
    .filter(n => n.sigungu !== sigungu)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const careList = facilities.filter(f => f.primarySlug === 'care');
  const homeList = facilities.filter(f => f.primarySlug === 'home');
  const dayList = facilities.filter(f => f.primarySlug === 'day');
  const otherList = facilities.filter(f => f.primarySlug === 'other');

  const html = buildSigunguPage({ sido, sigungu, slug, total, care, home, day, other, careList, homeList, dayList, otherList, neighbors });
  writeFileSync(resolve(dirPath, 'index.html'), html, 'utf8');
  created++;
  if (created % 50 === 0) console.log(`  ${created} 생성...`);
}
console.log(`✓ ${created}개 시군구 페이지 생성`);

// ─── 시도 통합 페이지 ───
let sidoCreated = 0;
for (const sido of SIDO_ORDER) {
  const sidoSlug = getSidoSlug(sido);
  const dirPath = resolve(REGION_DIR, sidoSlug);
  mkdirSync(dirPath, { recursive: true });

  const sigungus = (sidoGroups[sido] || []).sort((a, b) => b.total - a.total);
  const totalAll = sigungus.reduce((s, r) => s + r.total, 0);

  const html = buildSidoPage({ sido, sidoSlug, sigungus, totalAll });
  writeFileSync(resolve(dirPath, 'index.html'), html, 'utf8');
  sidoCreated++;
}
console.log(`✓ ${sidoCreated}개 시도 페이지 생성`);
console.log('━━━ 완료 ━━━');

// ═══════════════════════════════════
// HTML 빌더
// ═══════════════════════════════════

function nav() {
  return `<nav class="nav"><div class="nav-inner">
<a href="/" class="logo">요양보호사 정보</a>
<a href="/jobs/">취업정보</a>
<a href="/academy/">학원가이드</a>
<a href="/quiz/">문제풀이</a>
<a href="/blog/">정보글</a>
</div></nav>`;
}

function footer() {
  return `<footer class="footer">
<div class="brand">요양보호사 정보</div>
<div>© 2026 yositong.com</div>
<div style="margin-top:12px;">
<a href="/jobs/">취업정보</a>·<a href="/academy/">학원가이드</a>·<a href="/quiz/">문제풀이</a>·<a href="/blog/">정보글</a>·<a href="/about/">소개</a>·<a href="/contact/">문의</a>·<a href="/privacy/">개인정보처리방침</a>
</div></footer>`;
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function regionCSS() {
  return `<style>
.region-hero{background:linear-gradient(180deg,var(--bg) 0%,var(--accent-soft) 100%);padding:48px 24px 32px;border-bottom:1px solid var(--line)}
.region-hero-inner{max-width:1100px;margin:0 auto}
.region-hero h1{font-size:32px;font-weight:700;margin:0 0 8px;letter-spacing:-1px;line-height:1.3}
.region-hero p{font-size:17px;color:var(--ink-2);margin:0 0 24px}
.region-stats{display:flex;gap:12px;flex-wrap:wrap}
.region-stat{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px 20px;min-width:120px;text-align:center}
.region-stat .num{font-size:24px;font-weight:700;color:var(--accent)}
.region-stat .label{font-size:13px;color:var(--ink-2);margin-top:2px}
.tab-bar{display:flex;gap:0;border-bottom:2px solid var(--line);margin-bottom:24px}
.tab-btn{padding:12px 24px;font-size:16px;font-weight:600;color:var(--ink-3);cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .15s}
.tab-btn:hover{color:var(--ink)}.tab-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
.tab-content{display:none}.tab-content.active{display:block}
.fclt-list{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.fclt-card{padding:20px;border:1px solid var(--line);border-radius:12px;background:var(--surface);transition:all .2s}
.fclt-card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.05)}
.fclt-card h3{font-size:17px;font-weight:700;margin:0 0 8px;letter-spacing:-.3px;line-height:1.4}
.fclt-card .fclt-meta{font-size:14px;color:var(--ink-2);display:flex;align-items:flex-start;gap:6px;margin-bottom:4px}
.fclt-card .fclt-meta img{width:14px;height:14px;opacity:.5;margin-top:3px;flex-shrink:0}
.fclt-types{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.fclt-type-tag{font-size:12px;padding:3px 8px;border-radius:4px;font-weight:600}
.fclt-type-tag.care{background:#e6f4ea;color:#1e8e3e}
.fclt-type-tag.home{background:#e8f0fe;color:#1a73e8}
.fclt-type-tag.day{background:#fef7e0;color:#f29900}
.fclt-type-tag.other{background:#f1f3f4;color:#5f6368}
.neighbors{margin-top:40px;padding-top:32px;border-top:1px solid var(--line)}
.neighbors h2{font-size:20px;font-weight:700;margin:0 0 16px}
.neighbor-links{display:flex;gap:10px;flex-wrap:wrap}
.neighbor-link{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border:1px solid var(--line);border-radius:8px;background:var(--surface);font-size:15px;font-weight:500;color:var(--ink);transition:all .15s;text-decoration:none}
.neighbor-link:hover{border-color:var(--accent);color:var(--accent)}
.neighbor-link .nb-count{font-size:13px;color:var(--ink-3)}
.jobs-section{background:var(--accent-soft);border:1px solid var(--line);border-radius:12px;padding:24px;margin-bottom:32px}
.jobs-section h2{font-size:18px;font-weight:700;margin:0 0 16px}
.jobs-section .job-list{display:flex;flex-direction:column;gap:12px}
.jobs-section .job-item{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:var(--surface);border-radius:8px;border:1px solid var(--line);text-decoration:none;color:inherit}
.jobs-section .job-item:hover{border-color:var(--accent)}
.jobs-section .job-title{font-weight:600;font-size:15px}
.jobs-section .job-company{font-size:13px;color:var(--ink-2)}
.jobs-section .job-wage{font-size:14px;font-weight:600;color:var(--accent);white-space:nowrap}
.jobs-section .jobs-loading{text-align:center;padding:20px;color:var(--ink-3);font-size:15px}
.seo-block{margin-top:40px;padding:32px;background:var(--surface);border:1px solid var(--line);border-radius:12px}
.seo-block h2{font-size:20px;margin:0 0 12px}.seo-block p{color:var(--ink-2);font-size:15px;line-height:1.8;margin:0 0 12px}
.show-more-btn{display:block;width:100%;padding:14px;border:1px solid var(--line);border-radius:8px;background:var(--surface);font-size:15px;font-weight:600;color:var(--ink-2);cursor:pointer;text-align:center;margin-top:16px;transition:all .15s}
.show-more-btn:hover{border-color:var(--accent);color:var(--accent)}
.sido-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.sido-card{padding:20px;border:1px solid var(--line);border-radius:12px;background:var(--surface);transition:all .2s;text-decoration:none;color:inherit;display:block}
.sido-card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.05)}
.sido-card h3{font-size:18px;font-weight:700;margin:0 0 6px}.sido-card .sg-count{font-size:14px;color:var(--ink-2)}
.dist-table{width:100%;border-collapse:collapse;margin:16px 0;font-size:15px}
.dist-table th,.dist-table td{padding:12px 14px;text-align:left;border-bottom:1px solid var(--line)}
.dist-table th{background:var(--accent-soft);color:var(--accent);font-weight:700;font-size:14px}
.dist-table td:first-child{font-weight:600}
.dist-table td:nth-child(2),.dist-table td:nth-child(3){color:var(--ink-2)}
.faq-block{margin:8px 0 16px}
.faq-item{border:1px solid var(--line);border-radius:10px;margin-bottom:8px;background:var(--surface)}
.faq-item summary{padding:14px 18px;font-weight:600;font-size:15px;cursor:pointer;list-style:none;position:relative;padding-right:40px}
.faq-item summary::after{content:'+';position:absolute;right:18px;top:50%;transform:translateY(-50%);font-size:20px;color:var(--accent);font-weight:700}
.faq-item[open] summary::after{content:'−'}
.faq-item p{padding:0 18px 16px;margin:0;color:var(--ink-2);font-size:14px;line-height:1.7}
.faq-item p a{color:var(--accent);text-decoration:underline}
@media(max-width:900px){.fclt-list{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.fclt-list{grid-template-columns:1fr}.region-hero h1{font-size:24px}.region-stats{flex-direction:row}.region-stat{flex:1;min-width:0;padding:12px}.region-stat .num{font-size:20px}.tab-btn{padding:10px 14px;font-size:14px}}
</style>`;
}

function renderCards(list, max) {
  return list.slice(0, max).map(f => {
    const sc = f.primarySlug || 'other';
    const th = (f.typeNames||[]).slice(0,3).map(t=>`<span class="fclt-type-tag ${sc}">${esc(t)}</span>`).join('');
    const ds = f.designatedDate ? `${f.designatedDate.slice(0,4)}.${f.designatedDate.slice(4,6)}.${f.designatedDate.slice(6,8)}` : '';
    return `<div class="fclt-card"><h3>${esc(f.name)}</h3><div class="fclt-meta"><img src="/jobs/assets/icons/pin.svg" alt="" loading="lazy" decoding="async">${esc(f.address||'')}</div>${ds?`<div class="fclt-meta"><img src="/jobs/assets/icons/calendar.svg" alt="" loading="lazy" decoding="async">지정일 ${ds}</div>`:''}<div class="fclt-types">${th}</div></div>`;
  }).join('\n');
}

// ─── JobPosting JSON-LD ───
function ymdToISO(s) {
  if (!s || String(s).length !== 8) return null;
  const y = String(s).slice(0,4), m = String(s).slice(4,6), d = String(s).slice(6,8);
  return `${y}-${m}-${d}`;
}
function mapEmploymentType(emp) {
  if (!emp) return 'OTHER';
  if (emp.includes('정규')) return 'FULL_TIME';
  if (emp.includes('시간') || emp.includes('파트')) return 'PART_TIME';
  if (emp.includes('계약')) return 'CONTRACTOR';
  if (emp.includes('일용')) return 'TEMPORARY';
  return 'OTHER';
}
function jobPostingLD(job) {
  const datePosted = ymdToISO(job.postedAt);
  const validThrough = ymdToISO(job.deadline);
  const post = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title || '요양보호사 모집',
    "description": (job.dtyCntn || job.title || '요양보호사 업무').slice(0, 500),
    "hiringOrganization": {
      "@type": "Organization",
      "name": job.companyName || '요양시설'
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressRegion": job.sido || '',
        "addressLocality": job.sigungu || '',
        "streetAddress": job.address || '',
        "addressCountry": "KR"
      }
    },
    "employmentType": mapEmploymentType(job.employType),
    "industry": "요양/사회복지",
    "directApply": false
  };
  if (datePosted) post.datePosted = datePosted;
  if (validThrough) post.validThrough = validThrough;
  if (job.salary || job.wageCond) {
    post.baseSalary = {
      "@type": "MonetaryAmount",
      "currency": "KRW",
      "value": { "@type": "QuantitativeValue", "value": String(job.salary || job.wageCond), "unitText": "MONTH" }
    };
  }
  return post;
}
function jobPostingsJSONLD(sido, max = 5) {
  const list = (jobsBySido[sido] || []).slice(0, max);
  if (list.length === 0) return '';
  return list.map(j => `<script type="application/ld+json">${JSON.stringify(jobPostingLD(j))}</script>`).join('\n');
}

// ─── SEO 보강 헬퍼 ───
function profileFromDistribution(care, home, day, total) {
  if (total === 0) return 'balanced';
  const cR = care/total, hR = home/total, dR = day/total;
  if (cR >= 0.5) return 'care_dominant';
  if (hR >= 0.5) return 'home_dominant';
  if (dR >= 0.3) return 'day_significant';
  if (cR > hR && cR > dR) return 'care_lean';
  if (hR > cR && hR > dR) return 'home_lean';
  return 'balanced';
}

function openingParagraph(sido, sigungu, total, care, home, day, profile) {
  const region = `${sido} ${sigungu}`;
  switch (profile) {
    case 'care_dominant':
      return `${region}는 입소형 <strong>요양원이 중심</strong>인 지역입니다. 전체 ${total.toLocaleString()}곳 중 요양원이 ${care}곳으로 약 ${Math.round(care/total*100)}%를 차지하여, 24시간 돌봄이 필요한 어르신을 위한 시설 인프라가 잘 갖춰져 있습니다. 요양보호사 채용도 입소시설 중심의 3교대 근무 형태가 다수입니다.`;
    case 'home_dominant':
      return `${region}는 <strong>재가(방문요양) 서비스가 활발</strong>한 지역입니다. 전체 ${total.toLocaleString()}곳 중 방문요양센터가 ${home}곳으로 약 ${Math.round(home/total*100)}%를 차지하며, 어르신 자택에서 돌봄을 받는 형태가 보편적입니다. 시간제·파트타임 근무를 원하는 요양보호사에게 유리합니다.`;
    case 'day_significant':
      return `${region}는 <strong>주야간보호센터 비중이 높은</strong> 지역입니다. 전체 ${total.toLocaleString()}곳 중 주야간보호가 ${day}곳(약 ${Math.round(day/total*100)}%)으로, 낮 시간대 어르신 돌봄 수요가 큽니다. 주간 고정 근무를 선호하는 요양보호사에게 적합합니다.`;
    case 'care_lean':
      return `${region}에는 총 ${total.toLocaleString()}곳의 장기요양기관이 운영되고 있으며, 그중 요양원이 ${care}곳으로 가장 많습니다. 입소시설 중심의 안정적인 정규직 채용이 활발한 지역입니다.`;
    case 'home_lean':
      return `${region}에는 총 ${total.toLocaleString()}곳의 장기요양기관이 있으며, 방문요양센터가 ${home}곳으로 가장 많습니다. 출퇴근 부담이 적은 재가 근무를 원한다면 좋은 선택지입니다.`;
    default:
      return `${region}에는 총 ${total.toLocaleString()}곳의 장기요양기관이 다양한 형태로 운영되고 있습니다. 요양원 ${care}곳, 방문요양 ${home}곳, 주야간보호 ${day}곳으로 시설 유형이 고르게 분포해 있어, 본인의 라이프스타일과 근무 선호에 따라 다양한 일자리를 선택할 수 있습니다.`;
  }
}

function distributionTable(care, home, day, other, total) {
  const row = (n, c) => `<tr><td>${n}</td><td>${c.toLocaleString()}곳</td><td>${total>0?Math.round(c/total*100):0}%</td></tr>`;
  return `<table class="dist-table">
<thead><tr><th>시설 종류</th><th>시설 수</th><th>비중</th></tr></thead>
<tbody>${row('요양원',care)}${row('방문요양',home)}${row('주야간보호',day)}${other>0?row('기타',other):''}</tbody>
</table>`;
}

function faqBlock(sido, sigungu) {
  const region = `${sido} ${sigungu}`;
  return `<div class="faq-block">
<details class="faq-item"><summary>${region} 요양보호사 평균 시급은 얼마인가요?</summary><p>${region} 지역 요양보호사의 평균 시급은 약 12,000~14,000원 수준이며, 시설 종류와 근무 형태(주간/야간/3교대)에 따라 차이가 있습니다. 정규직 월급은 약 230만 원 ~ 270만 원입니다. 정확한 시급은 시설별 채용공고에서 확인해주세요.</p></details>
<details class="faq-item"><summary>${region}에서 요양보호사 자격증 어떻게 취득하나요?</summary><p>요양보호사 자격증은 보건복지부 지정 교육기관에서 320시간 교육을 이수한 뒤 국가시험에 합격하면 취득할 수 있습니다. 국비지원(내일배움카드)을 활용하면 교육비 부담을 크게 줄일 수 있습니다. <a href="/academy/">학원가이드</a>에서 자세한 정보를 확인하세요.</p></details>
<details class="faq-item"><summary>${region} 요양시설 채용공고 어디서 보나요?</summary><p>아래 채용공고 영역에 ${sido} 지역 실시간 공고를 표시하고 있습니다. <a href="/jobs/?region=${encodeURIComponent(sido)}">전체 ${sido} 채용공고 보기</a>에서 시군구·근무형태·시급별로 필터링할 수 있습니다.</p></details>
</div>`;
}

function jsonLD(sido, sigungu, total, url, slug, sidoSlug) {
  const place = {
    "@context": "https://schema.org",
    "@type": "Place",
    "name": `${sido} ${sigungu} 요양시설 디렉토리`,
    "description": `${sido} ${sigungu} 지역 장기요양기관 ${total}곳 정보 및 채용공고`,
    "url": url,
    "address": { "@type": "PostalAddress", "addressRegion": sido, "addressLocality": sigungu, "addressCountry": "KR" }
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "홈", "item": "https://yositong.com/" },
      { "@type": "ListItem", "position": 2, "name": sido, "item": `https://yositong.com/regions/${sidoSlug}/` },
      { "@type": "ListItem", "position": 3, "name": sigungu, "item": url }
    ]
  };
  return `<script type="application/ld+json">${JSON.stringify(place)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`;
}

function buildSigunguPage({ sido, sigungu, slug, total, care, home, day, other, careList, homeList, dayList, otherList, neighbors }) {
  const title = `${sido} ${sigungu} 요양보호사 일자리 · 요양시설 디렉토리`;
  const desc = `${sido} ${sigungu} 지역 장기요양기관 ${total}곳. 요양원 ${care}곳, 방문요양 ${home}곳, 주야간보호 ${day}곳.`;
  const url = `https://yositong.com/regions/${slug}/`;
  const sidoSlug = getSidoSlug(sido);

  const allFac = JSON.stringify({ care: careList, home: homeList, day: dayList, other: otherList });
  const profile = profileFromDistribution(care, home, day, total);

  return `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} - yositong</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}"><meta property="og:url" content="${url}">
<meta property="og:image" content="https://yositong.com/assets/og-image.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://yositong.com/assets/og-image.png">
${jsonLD(sido, sigungu, total, url, slug, sidoSlug)}
${jobPostingsJSONLD(sido, 5)}
<link rel="stylesheet" href="/jobs/jobs.css">${regionCSS()}
</head><body>
${nav()}
<section class="region-hero"><div class="region-hero-inner">
<h1>${sido} ${sigungu} 요양시설 디렉토리</h1>
<p>${sido} ${sigungu} 지역 장기요양기관 총 ${total.toLocaleString()}곳의 시설 정보를 확인하세요.</p>
<div class="region-stats">
<div class="region-stat"><div class="num">${total.toLocaleString()}</div><div class="label">전체 시설</div></div>
<div class="region-stat"><div class="num">${care.toLocaleString()}</div><div class="label">요양원</div></div>
<div class="region-stat"><div class="num">${home.toLocaleString()}</div><div class="label">방문요양</div></div>
<div class="region-stat"><div class="num">${day.toLocaleString()}</div><div class="label">주야간보호</div></div>
</div></div></section>
<main class="main-content">
<section class="jobs-section" id="jobs-section">
<h2><img src="/jobs/assets/icons/briefcase.svg" alt="" style="width:20px;height:20px;vertical-align:middle;margin-right:6px">${sido} ${sigungu} 최신 채용공고</h2>
<div id="job-list" class="job-list"><div class="jobs-loading" id="jobs-loading">채용공고를 불러오는 중...</div></div>
</section>
<div class="tab-bar" id="tab-bar">
<button class="tab-btn active" data-tab="care">요양원 (${care})</button>
<button class="tab-btn" data-tab="home">방문요양 (${home})</button>
<button class="tab-btn" data-tab="day">주야간보호 (${day})</button>
${other>0?`<button class="tab-btn" data-tab="other">기타 (${other})</button>`:''}
</div>
<div class="tab-content active" id="tab-care"><div class="fclt-list">${renderCards(careList,18)}</div>${careList.length>18?`<button class="show-more-btn" data-tab="care">더보기 (${careList.length-18}곳 더)</button>`:''}</div>
<div class="tab-content" id="tab-home"><div class="fclt-list">${renderCards(homeList,18)}</div>${homeList.length>18?`<button class="show-more-btn" data-tab="home">더보기 (${homeList.length-18}곳 더)</button>`:''}</div>
<div class="tab-content" id="tab-day"><div class="fclt-list">${renderCards(dayList,18)}</div>${dayList.length>18?`<button class="show-more-btn" data-tab="day">더보기 (${dayList.length-18}곳 더)</button>`:''}</div>
${other>0?`<div class="tab-content" id="tab-other"><div class="fclt-list">${renderCards(otherList,18)}</div>${otherList.length>18?`<button class="show-more-btn" data-tab="other">더보기 (${otherList.length-18}곳 더)</button>`:''}</div>`:''}
${neighbors.length>0?`<div class="neighbors"><h2>${sido} 인근 지역 시설</h2><div class="neighbor-links">${neighbors.map(n=>`<a href="/regions/${n.slug}/" class="neighbor-link">${n.sigungu} <span class="nb-count">${n.total}곳</span></a>`).join('')}</div></div>`:''}
<div class="seo-block">
<h2>${sido} ${sigungu} 요양시설 분포 한눈에</h2>
<p>${openingParagraph(sido, sigungu, total, care, home, day, profile)}</p>
${distributionTable(care, home, day, other, total)}
<h2 style="margin-top:32px">${sido} ${sigungu} 요양보호사 자주 묻는 질문</h2>
${faqBlock(sido, sigungu)}
</div></main>
${footer()}
<script>
(function(){
var tabBar=document.getElementById('tab-bar');
tabBar.addEventListener('click',function(e){var b=e.target.closest('.tab-btn');if(!b)return;tabBar.querySelectorAll('.tab-btn').forEach(function(x){x.classList.remove('active')});b.classList.add('active');document.querySelectorAll('.tab-content').forEach(function(c){c.classList.remove('active')});document.getElementById('tab-'+b.dataset.tab).classList.add('active')});
var allF=${allFac};
document.querySelectorAll('.show-more-btn').forEach(function(btn){btn.addEventListener('click',function(){var t=this.dataset.tab,l=allF[t]||[],c=document.querySelector('#tab-'+t+' .fclt-list');c.innerHTML=l.map(function(f){var sc=f.primarySlug||'other',th=(f.typeNames||[]).slice(0,3).map(function(t){return'<span class="fclt-type-tag '+sc+'">'+he(t)+'</span>'}).join(''),ds=f.designatedDate?f.designatedDate.slice(0,4)+'.'+f.designatedDate.slice(4,6)+'.'+f.designatedDate.slice(6,8):'';return'<div class="fclt-card"><h3>'+he(f.name)+'</h3><div class="fclt-meta"><img src="/jobs/assets/icons/pin.svg" alt="" loading="lazy" decoding="async">'+he(f.address||'')+'</div>'+(ds?'<div class="fclt-meta"><img src="/jobs/assets/icons/calendar.svg" alt="" loading="lazy" decoding="async">지정일 '+ds+'</div>':'')+'<div class="fclt-types">'+th+'</div></div>'}).join('');this.remove()})});
function he(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML}
(async function(){var el=document.getElementById('job-list'),ld=document.getElementById('jobs-loading');try{var r=await fetch('/api/welfare?page=1&pageSize=1000');if(!r.ok)throw 0;var d=await r.json();var items=(d.items||[]).filter(function(j){return j.sido==='${sido}'}).slice(0,5);if(!items.length){ld.textContent='현재 등록된 채용공고가 없습니다.';return}ld.remove();el.innerHTML=items.map(function(j){return'<a href="/jobs/?region='+encodeURIComponent(j.sido)+'&sigungu='+encodeURIComponent(j.sigungu||'')+'" class="job-item"><div><div class="job-title">'+he(j.title)+'</div><div class="job-company">'+he(j.companyName)+'</div></div><div class="job-wage">'+he(j.salary||j.wageCond||'회사내규')+'</div></a>'}).join('')}catch(e){ld.textContent='채용공고를 불러올 수 없습니다.'}})();
})();
</script></body></html>`;
}

function buildSidoPage({ sido, sidoSlug, sigungus, totalAll }) {
  const title = `${sido} 요양시설 디렉토리 - 시군구별 요양기관 안내`;
  const desc = `${sido} 지역 장기요양기관 총 ${totalAll.toLocaleString()}곳. 시군구별 요양원, 방문요양, 주야간보호 시설 현황을 확인하세요.`;
  const url = `https://yositong.com/regions/${sidoSlug}/`;

  const cards = sigungus.map(r => `<a href="/regions/${r.slug}/" class="sido-card"><h3>${r.sigungu}</h3><div class="sg-count">요양원 ${r.care} · 방문요양 ${r.home} · 주야간보호 ${r.day} — 총 ${r.total}곳</div></a>`).join('\n');

  const otherSidos = SIDO_ORDER.filter(s => s !== sido).map(s => `<a href="/regions/${getSidoSlug(s)}/" class="neighbor-link">${s}</a>`).join('');

  return `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} - yositong</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}"><meta property="og:url" content="${url}">
<meta property="og:image" content="https://yositong.com/assets/og-image.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://yositong.com/assets/og-image.png">
<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"홈","item":"https://yositong.com/"},{"@type":"ListItem","position":2,"name":sido,"item":url}]})}</script>
${jobPostingsJSONLD(sido, 10)}
<link rel="stylesheet" href="/jobs/jobs.css">${regionCSS()}
</head><body>
${nav()}
<section class="region-hero"><div class="region-hero-inner">
<h1>${sido} 요양시설 디렉토리</h1>
<p>${sido} 지역 장기요양기관 총 ${totalAll.toLocaleString()}곳 · ${sigungus.length}개 시군구</p>
<div class="region-stats">
<div class="region-stat"><div class="num">${totalAll.toLocaleString()}</div><div class="label">전체 시설</div></div>
<div class="region-stat"><div class="num">${sigungus.reduce((s,r)=>s+r.care,0).toLocaleString()}</div><div class="label">요양원</div></div>
<div class="region-stat"><div class="num">${sigungus.reduce((s,r)=>s+r.home,0).toLocaleString()}</div><div class="label">방문요양</div></div>
<div class="region-stat"><div class="num">${sigungus.reduce((s,r)=>s+r.day,0).toLocaleString()}</div><div class="label">주야간보호</div></div>
</div></div></section>
<main class="main-content">
<h2 style="font-size:22px;font-weight:700;margin:0 0 20px">${sido} 시군구별 시설 현황</h2>
<div class="sido-grid">${cards}</div>
<div class="neighbors" style="margin-top:48px"><h2>다른 시도 보기</h2><div class="neighbor-links">${otherSidos}</div></div>
<div class="seo-block">
<h2>${sido} 요양보호사 취업 및 시설 안내</h2>
<p>${sido} 지역에는 ${sigungus.length}개 시군구에 총 ${totalAll.toLocaleString()}곳의 장기요양기관이 운영되고 있습니다. 지역별 시설 유형과 채용 현황을 비교하여 나에게 맞는 일자리를 찾아보세요.</p>
</div></main>
${footer()}
</body></html>`;
}
