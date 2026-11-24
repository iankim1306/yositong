// 요양용품 제휴 리뷰 데이터(reviews-data.cjs) → 완성 HTML 생성 → reviews/{slug}/index.html
// 기존 정보글 템플릿(초록 테마·GA4·애드센스·스키마) 재사용 + 제품카드 + 쿠팡 파트너스 고지
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const reviews = require('./reviews-data.cjs');
const WELFARE = require('./reviews-welfare.cjs');

const GA4 = 'G-5VX7EX4PCW';
const ADSENSE = 'ca-pub-7852008102553944';
const BASE = 'https://yositong.com';
const DISCLOSURE = '이 글에는 쿠팡 파트너스 활동의 일환으로 일정액의 수수료를 제공받는 링크가 포함되어 있습니다.';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const TAGCOLOR = { '가성비': '#16a34a', '베스트': '#d97706', '프리미엄': '#475569' };

function won(n) { return Number(n).toLocaleString('ko-KR') + '원'; }

// ── 복지용구 급여 안내 ──
// 급여 품목(목욕의자·지팡이·안전손잡이 등)을 쿠팡에서 정가로 사는 사람이 많다.
// 등급이 있으면 사업소에서 본인부담 15%다. 제품 링크보다 이걸 먼저 알려주는 게 맞다.
const WELFARE_HUB = '/복지용구-급여-품목-한도/';

// 받침이 있으면 '은', 없으면 '는'. 괄호 설명은 떼고 판정한다.
function eun(word) {
  const base = String(word).replace(/\([^)]*\)\s*$/, '').trim();
  const last = base.charCodeAt(base.length - 1);
  if (last < 0xAC00 || last > 0xD7A3) return '은(는)';
  return (last - 0xAC00) % 28 === 0 ? '는' : '은';
}

function welfareNote(slug) {
  const w = WELFARE[slug];
  if (!w) return '';
  if (w.covered) {
    const spec = [w.way, w.years ? ('사용 가능 햇수 ' + w.years) : null, w.qty ? (w.qty + '까지') : null].filter(Boolean).join(' · ');
    return `<div class="rv-wel rv-wel-on">
<div class="rv-wel-h">✅ 이 용품은 <strong>복지용구 급여 품목</strong>입니다 — 정가로 사기 전에 읽어보세요</div>
<p><strong>${esc(w.item)}</strong>${eun(w.item)} 장기요양 복지용구 품목입니다(${esc(spec)}). 어르신에게 <strong>장기요양 1~5등급 또는 인지지원등급</strong>이 있고 요양원에 입소하지 않았다면, <strong>복지용구사업소에서 본인부담 15%</strong>에 ${w.way.indexOf('대여') >= 0 ? (w.way.indexOf('구입') >= 0 ? '구입하거나 대여할' : '대여할') : '구입할'} 수 있습니다(감경 대상 6~9%, 기초생활수급자 0%). 연간 한도는 <strong>160만원</strong>입니다.</p>
${w.note ? ('<p>' + w.note + '</p>') : ''}
<p class="rv-wel-warn">⚠️ <strong>온라인 쇼핑몰에서 사면 급여가 적용되지 않습니다.</strong> 공단에 등록된 복지용구사업소에서 계약해야 합니다. 아래 제품 비교는 <strong>등급이 없거나 한도를 이미 다 쓴 경우</strong>에 참고하세요.</p>
<a class="rv-wel-link" href="${WELFARE_HUB}">복지용구 품목 25종·한도·신청 절차 보기 →</a>
</div>`;
  }
  return `<div class="rv-wel">
<div class="rv-wel-h">복지용구 급여 대상인가요?</div>
<p>${w.alt}</p>
<p>장기요양등급이 있으면 복지용구 <strong>25종</strong>을 연 <strong>160만원</strong> 한도로 본인부담 <strong>15%</strong>(감경 6~9%, 기초수급 0%)에 구입·대여할 수 있습니다. 급여 품목이 아닌 용품은 일반 구매로 가야 합니다.</p>
<a class="rv-wel-link" href="${WELFARE_HUB}">복지용구 품목 25종·한도·신청 절차 보기 →</a>
</div>`;
}

function productCard(p, idx, slug) {
  const color = TAGCOLOR[p.tag] || '#16a34a';
  const feats = (p.features || []).map(f => `<span class="rv-feat">${esc(f)}</span>`).join('');
  const pros = (p.pros || []).map(x => `<li>${esc(x)}</li>`).join('');
  const imgSrc = `/reviews/${slug}/${p.image}`;
  return `
<div class="rv-card" id="pick-${idx}">
  <div class="rv-badge" style="background:${color}">${esc(p.tag)}</div>
  <div class="rv-card-in">
    <div class="rv-imgwrap"><img src="${esc(imgSrc)}" alt="${esc(p.imageAlt || p.name)}" loading="lazy" width="150" height="150"></div>
    <div class="rv-body">
      <div class="rv-award">${esc(p.award || '')}</div>
      <h3 class="rv-name">${esc(p.name)}</h3>
      <div class="rv-price">${won(p.price)} <span class="rv-price-note">· 쿠팡 기준(변동 가능)${p.rocket ? ' · 로켓배송' : ''}</span></div>
      <div class="rv-feats">${feats}</div>
      ${p.forWho ? `<p class="rv-forwho"><strong>이런 분께</strong> · ${esc(p.forWho)}</p>` : ''}
      ${pros ? `<ul class="rv-pros">${pros}</ul>` : ''}
      ${p.cons ? `<p class="rv-cons"><strong>참고</strong> · ${esc(p.cons)}</p>` : ''}
      <a class="rv-cta" href="${esc(p.url)}" target="_blank" rel="nofollow sponsored noopener">쿠팡 최저가 확인하기 →</a>
    </div>
  </div>
</div>`;
}

function renderBlocks(blocks) {
  return (blocks || []).map(b => {
    if (b.h2) return `<h2>${esc(b.h2)}</h2>`;
    if (b.h3) return `<h3>${esc(b.h3)}</h3>`;
    if (b.p) return `<p>${b.p}</p>`;
    if (b.ul) return `<ul>${b.ul.map(li => `<li>${li}</li>`).join('')}</ul>`;
    if (b.ol) return `<ol>${b.ol.map(li => `<li>${li}</li>`).join('')}</ol>`;
    if (b.callout) return `<div class="callout"><strong>${esc(b.calloutTitle || '핵심 요약')}</strong><div style="margin-top:8px">${b.callout}</div></div>`;
    if (b.table) {
      const [head, ...rows] = b.table;
      return `<table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    if (b.faq) return b.faq.map(f => `<details class="q"><summary>${esc(f.q)}</summary><div class="a">${f.a}</div></details>`).join('\n');
    return '';
  }).join('\n');
}

function extractFAQ(blocks) {
  const all = [];
  for (const b of (blocks || [])) if (b.faq) for (const f of b.faq) all.push({ q: f.q, a: f.a.replace(/<[^>]+>/g, '') });
  return all;
}

const CTA = `
<section class="cta-internal" style="margin:48px auto 32px;max-width:800px;padding:28px;background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border-radius:14px;border:1px solid #bbf7d0;text-align:center;">
  <h3 style="font-size:18px;font-weight:800;margin:0 0 8px;color:#0f172a;">요양보호사·요양 정보 더 보기</h3>
  <p style="margin:0 0 18px;color:#475569;font-size:15px;">자격증·급여·취업부터 실무 현장 정보까지</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
    <a href="/blog" style="background:#16a34a;color:#fff;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px;">정보글 보기 →</a>
    <a href="/regions" style="background:#fff;color:#16a34a;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px;border:1px solid #16a34a;">요양시설 찾기 →</a>
    <a href="/reviews" style="background:#fff;color:#16a34a;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px;border:1px solid #16a34a;">요양용품 전체 →</a>
  </div>
</section>`;

const STYLE = `
body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', -apple-system, sans-serif; background: #f5f5f5; margin: 0; padding: 0; color: #222; line-height: 1.7; }
.nav { background: #fff; border-bottom: 1px solid #e5e5e5; padding: 15px 20px; }
.nav-inner { max-width: 820px; margin: 0 auto; display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }
.nav a { text-decoration: none; color: #555; font-weight: 500; font-size: 15px; }
.nav a.logo { font-weight: 700; color: #222; font-size: 18px; }
.nav a:hover { color: #000; }
.container { max-width: 820px; margin: 30px auto; padding: 40px; background: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.05); border-radius: 10px; }
.container h1 { font-size: 28px; margin-bottom: 10px; line-height: 1.4; }
.container .meta { color: #888; font-size: 14px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
.container h2 { font-size: 22px; margin-top: 36px; padding-top: 20px; border-top: 2px solid #16a34a; }
.container h3 { font-size: 18px; margin-top: 24px; }
.container p { margin: 14px 0; }
.container a { color: #15803d; }
.container ul, .container ol { padding-left: 24px; }
.container li { margin: 6px 0; }
.container table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 15px; }
.container table td, .container table th { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
.container table th { background: #f0fdf4; color: #15803d; font-weight: 700; }
.callout { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 18px 22px; margin: 20px 0; border-radius: 4px; }
.callout strong { color: #15803d; }
details.q { background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; margin: 10px 0; }
details.q summary { padding: 16px 20px; font-weight: 600; font-size: 16px; cursor: pointer; list-style: none; position: relative; padding-right: 44px; }
details.q summary::after { content: '+'; position: absolute; right: 20px; top: 50%; transform: translateY(-50%); font-size: 20px; color: #16a34a; font-weight: 700; }
details.q[open] summary::after { content: '−'; }
details.q .a { padding: 0 20px 18px; color: #555; font-size: 15px; line-height: 1.7; }
.footer { background: #2a2a2a; color: #aaa; padding: 40px 20px; margin-top: 40px; text-align: center; font-size: 14px; }
.footer a { color: #ddd; text-decoration: none; margin: 0 10px; }
.rv-disc { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-size: 13px; padding: 10px 14px; border-radius: 8px; margin: 0 0 24px; }
.rv-card { border: 1px solid #e5e7eb; border-radius: 14px; margin: 22px 0; position: relative; overflow: hidden; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.rv-badge { position: absolute; top: 0; left: 0; color: #fff; font-weight: 800; font-size: 13px; padding: 6px 16px; border-bottom-right-radius: 12px; z-index: 2; }
.rv-card-in { display: flex; gap: 20px; padding: 24px; align-items: flex-start; }
.rv-imgwrap { flex: none; width: 150px; height: 150px; border-radius: 10px; overflow: hidden; background: #f8fafc; border: 1px solid #eef1f4; }
.rv-imgwrap img { width: 100%; height: 100%; object-fit: contain; }
.rv-body { flex: 1; min-width: 0; }
.rv-award { color: #15803d; font-weight: 800; font-size: 13px; margin: 2px 0 4px; }
.rv-name { font-size: 17px; margin: 0 0 8px; line-height: 1.4; }
.rv-price { font-size: 18px; font-weight: 800; color: #111; margin-bottom: 10px; }
.rv-price-note { font-size: 12px; font-weight: 500; color: #94a3b8; }
.rv-feats { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.rv-feat { background: #f0fdf4; color: #15803d; font-size: 12.5px; font-weight: 600; padding: 4px 10px; border-radius: 999px; }
.rv-forwho { font-size: 14px; color: #475569; margin: 8px 0; }
.rv-pros { margin: 8px 0; padding-left: 20px; }
.rv-pros li { font-size: 14px; color: #334155; margin: 4px 0; }
.rv-cons { font-size: 13px; color: #64748b; margin: 8px 0 14px; }
.rv-cta { display: inline-block; background: #16a34a; color: #fff !important; font-weight: 800; font-size: 15px; padding: 12px 22px; border-radius: 10px; text-decoration: none; }
.rv-cta:hover { background: #15803d; }
.rv-wel { border: 1px solid #e5e7eb; background: #f8fafc; border-radius: 12px; padding: 16px 18px; margin: 22px 0; font-size: 14.5px; line-height: 1.7; }
.rv-wel-on { border-color: #16a34a; background: #f0fdf4; }
.rv-wel-h { font-weight: 700; font-size: 15.5px; margin-bottom: 8px; color: #111; }
.rv-wel p { margin: 8px 0; }
.rv-wel-warn { color: #b45309; }
.rv-wel-link { display: inline-block; margin-top: 6px; font-weight: 700; color: #16a34a; text-decoration: none; }
.rv-wel-link:hover { text-decoration: underline; }
.rv-hub { display: grid; grid-template-columns: repeat(auto-fill,minmax(240px,1fr)); gap: 16px; margin: 24px 0; }
.rv-hub a { display: flex; gap: 14px; align-items: center; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; text-decoration: none; color: #111; background: #fff; }
.rv-hub a:hover { border-color: #16a34a; box-shadow: 0 2px 10px rgba(22,163,74,.08); }
.rv-hub-thumb { flex: none; width: 72px; height: 72px; border-radius: 10px; overflow: hidden; background: #f8fafc; border: 1px solid #eef1f4; }
.rv-hub-thumb img { width: 100%; height: 100%; object-fit: contain; }
.rv-hub-txt { min-width: 0; }
.rv-hub .t { font-weight: 700; font-size: 15px; line-height: 1.35; }
.rv-hub .d { font-size: 12.5px; color: #64748b; margin-top: 4px; }
@media (max-width: 600px) { .container { padding: 20px; margin: 10px; } .container h1 { font-size: 22px; } .rv-card-in { flex-direction: column; } .rv-imgwrap { width: 100%; height: 200px; } }
`;

function head(title, desc, url, extraSchema) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<script defer src="/_vercel/insights/script.js"></script>
<script defer src="/_vercel/speed-insights/script.js"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA4}');</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="naver-site-verification" content="9ebf50acfe0237b4f8f418e1224d4f59264fdd31" />
<meta name="naver-site-verification" content="b0bb10d2d3505f81ed288420c1c9f1dc435ddb0c" />
<meta name="google-site-verification" content="AdSJSnhdDNb6-WjWRbwJnLZmjcQASaWJbDRN36i4DXk" />
<title>${esc(title)} | yositong</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/assets/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#16a34a">
<meta name="google-adsense-account" content="${ADSENSE}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE}" crossorigin="anonymous"></script>
${extraSchema || ''}
<style>${STYLE}</style>
</head>
<body>
<nav class="nav"><div class="nav-inner">
<a href="/" class="logo">요양보호사 정보</a>
<a href="/regions">지역별 시설</a>
<a href="/academy">학원가이드</a>
<a href="/quiz">문제풀이</a>
<a href="/blog">정보글</a>
<a href="/reviews">요양용품</a>
</div></nav>`;
}

const FOOTER = `
<footer class="footer">
<div>© 2026 요양보호사 정보 · yositong.com</div>
<div style="margin-top:10px;">${DISCLOSURE}</div>
<div style="margin-top: 10px;">
<a href="/blog">정보글</a> · <a href="/reviews">요양용품</a> · <a href="/regions">지역별 시설</a> · <a href="/about">소개</a> · <a href="/privacy">개인정보처리방침</a>
</div>
</footer>
</body>
</html>`;

function buildReview(a) {
  const url = `${BASE}/reviews/${a.slug}`;
  const faqList = extractFAQ(a.blocks);
  const faqSchema = faqList.length ? `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqList.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } }))
  })}</script>` : '';
  const articleSchema = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "Article",
    headline: a.title, description: a.desc, datePublished: a.date, dateModified: a.date, inLanguage: "ko-KR",
    image: `${BASE}/assets/og-image.png`,
    author: { "@type": "Organization", name: "요양보호사 정보", url: `${BASE}/` },
    publisher: { "@type": "Organization", name: "요양보호사 정보", url: `${BASE}/`, logo: { "@type": "ImageObject", url: `${BASE}/android-chrome-512x512.png` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": url }
  })}</script>`;
  const breadcrumb = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "요양용품", item: `${BASE}/reviews` },
      { "@type": "ListItem", position: 3, name: a.title, item: url }
    ]
  })}</script>`;

  const wel = welfareNote(a.slug);
  const welCovered = !!(WELFARE[a.slug] && WELFARE[a.slug].covered);
  const cards = a.products.map((p, i) => productCard(p, i + 1, a.slug)).join('\n');

  return `${head(a.title, a.desc, url, articleSchema + breadcrumb + faqSchema)}
<article class="container">
<h1>${esc(a.h1 || a.title)}</h1>
<div class="meta">${a.date} · 운영자 · 약 ${a.readMin || 6}분 분량</div>
<div class="rv-disc">${DISCLOSURE}</div>
${renderBlocks(a.intro)}
${welCovered ? wel : ''}
<h2>추천 요양용품 TOP 3</h2>
${cards}
${welCovered ? '' : wel}
${renderBlocks(a.blocks)}
</article>
${CTA}
${FOOTER}`;
}

function buildHub() {
  const url = `${BASE}/reviews`;
  const cards = reviews.map(a => {
    const thumb = a.products && a.products[0] ? `/reviews/${a.slug}/${a.products[0].image}` : '';
    return `<a href="/reviews/${a.slug}"><div class="rv-hub-thumb"><img src="${esc(thumb)}" alt="${esc(a.hubTitle || a.h1)}" loading="lazy"></div><div class="rv-hub-txt"><div class="t">${esc(a.hubTitle || a.h1)}</div><div class="d">${esc(a.hubDesc || '')}</div></div></a>`;
  }).join('\n');
  const itemList = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "ItemList",
    itemListElement: reviews.map((a, i) => ({ "@type": "ListItem", position: i + 1, url: `${BASE}/reviews/${a.slug}/`, name: a.h1 }))
  })}</script>`;
  return `${head('요양용품 추천 — 어르신·환자 돌봄 용품 모음', '성인용 기저귀, 욕창예방 방석·매트리스, 자세변환용구, 목욕의자, 보행기, 지팡이, 구강세척기, 배회감지기 등 요양·간병 용품 26종을 가성비·베스트·프리미엄으로 비교했습니다. 복지용구 급여 품목인지도 함께 표시합니다.', url, itemList)}
<article class="container">
<h1>요양용품 추천 모음</h1>
<div class="meta">어르신·환자 돌봄에 필요한 용품을 상황별로 비교했습니다</div>
<p>집에서 어르신이나 환자를 돌볼 때 실제로 필요한 용품들을 <strong>가성비·베스트·프리미엄</strong> 세 가지로 나눠 비교했습니다. 아래에서 필요한 품목을 골라보세요.</p>
<div class="rv-wel rv-wel-on">
<div class="rv-wel-h">✅ 먼저 확인하세요 — 목욕의자·지팡이·안전손잡이는 <strong>15%</strong>에 살 수 있습니다</div>
<p>장기요양 <strong>1~5등급 또는 인지지원등급</strong>이 있고 요양원에 입소하지 않았다면, 복지용구 <strong>25종</strong>을 연 <strong>160만원</strong> 한도로 본인부담 <strong>15%</strong>(감경 6~9%, 기초생활수급자 0%)에 구입·대여할 수 있습니다. 아래 품목 중 <strong>목욕의자·이동변기·보행기·지팡이·안전손잡이·미끄럼방지매트·미끄럼방지양말·욕창예방방석·욕창예방매트리스·자세변환용구·경사로·구강세척기·기저귀센서·배회감지기</strong>가 급여 품목입니다(일부는 등록 제품만 해당).</p>
<a class="rv-wel-link" href="/복지용구-급여-품목-한도">복지용구 품목 25종·한도·신청 절차 보기 →</a>
</div>
<div class="rv-hub">${cards}</div>
<p style="color:#64748b;font-size:14px;margin-top:24px;">※ 소개하는 제품은 일상 돌봄을 돕는 생활용품으로, 의료기기가 아닙니다. 어르신의 건강 상태는 전문가와 상담하세요.</p>
</article>
${FOOTER}`;
}

// 실행
let n = 0;
for (const a of reviews) {
  const dir = path.join(ROOT, 'reviews', a.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), buildReview(a), 'utf8');
  n++;
}
fs.mkdirSync(path.join(ROOT, 'reviews'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'reviews', 'index.html'), buildHub(), 'utf8');
// 사이트맵이 읽을 슬러그 목록을 남긴다.
// 예전엔 legacy-slugs.json 에 손으로 적어 뒀는데, 리뷰를 추가하고 그 파일을
// 깜빡하면 사이트맵에서 빠져 색인이 안 된다(정보글에서 이미 당한 함정).
fs.writeFileSync(
  path.join(__dirname, 'review-slugs.json'),
  JSON.stringify({ generated: new Date().toISOString().slice(0, 10), slugs: reviews.map(a => 'reviews/' + a.slug) }, null, 1),
  'utf8'
);
console.log(`✓ 요양용품 리뷰 ${n}개 + 허브(/reviews/) 생성`);
console.log(`✓ _scripts/review-slugs.json (${reviews.length}개 슬러그)`);
