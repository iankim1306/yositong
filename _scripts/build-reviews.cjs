// 요양용품 제휴 리뷰 데이터(reviews-data.cjs) → 완성 HTML 생성 → reviews/{slug}/index.html
// 기존 정보글 템플릿(초록 테마·GA4·애드센스·스키마) 재사용 + 제품카드 + 쿠팡 파트너스 고지
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const reviews = require('./reviews-data.cjs');

const GA4 = 'G-5VX7EX4PCW';
const ADSENSE = 'ca-pub-7852008102553944';
const BASE = 'https://yositong.com';
const DISCLOSURE = '이 글에는 쿠팡 파트너스 활동의 일환으로 일정액의 수수료를 제공받는 링크가 포함되어 있습니다.';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const TAGCOLOR = { '가성비': '#16a34a', '베스트': '#d97706', '프리미엄': '#475569' };

function won(n) { return Number(n).toLocaleString('ko-KR') + '원'; }

function productCard(p, idx) {
  const color = TAGCOLOR[p.tag] || '#16a34a';
  const feats = (p.features || []).map(f => `<span class="rv-feat">${esc(f)}</span>`).join('');
  const pros = (p.pros || []).map(x => `<li>${esc(x)}</li>`).join('');
  return `
<div class="rv-card" id="pick-${idx}">
  <div class="rv-badge" style="background:${color}">${esc(p.tag)}</div>
  <div class="rv-card-in">
    <div class="rv-imgwrap"><img src="${esc(p.image)}" alt="${esc(p.imageAlt || p.name)}" loading="lazy" width="150" height="150"></div>
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
    <a href="/blog/" style="background:#16a34a;color:#fff;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px;">정보글 보기 →</a>
    <a href="/jobs/" style="background:#fff;color:#16a34a;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px;border:1px solid #16a34a;">채용 검색 →</a>
    <a href="/reviews/" style="background:#fff;color:#16a34a;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px;border:1px solid #16a34a;">요양용품 전체 →</a>
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
.rv-hub { display: grid; grid-template-columns: repeat(auto-fill,minmax(240px,1fr)); gap: 16px; margin: 24px 0; }
.rv-hub a { display: block; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; text-decoration: none; color: #111; background: #fff; }
.rv-hub a:hover { border-color: #16a34a; box-shadow: 0 2px 10px rgba(22,163,74,.08); }
.rv-hub .t { font-weight: 700; font-size: 16px; line-height: 1.4; }
.rv-hub .d { font-size: 13px; color: #64748b; margin-top: 6px; }
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
<meta name="naver-site-verification" content="b0bb10d2d3505f81ed288420c1c9f1dc435ddb0c" />
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
<a href="/jobs/">취업정보</a>
<a href="/academy/">학원가이드</a>
<a href="/quiz/">문제풀이</a>
<a href="/blog/">정보글</a>
<a href="/reviews/">요양용품</a>
</div></nav>`;
}

const FOOTER = `
<footer class="footer">
<div>© 2026 요양보호사 정보 · yositong.com</div>
<div style="margin-top:10px;">${DISCLOSURE}</div>
<div style="margin-top: 10px;">
<a href="/blog/">정보글</a> · <a href="/reviews/">요양용품</a> · <a href="/jobs/">취업정보</a> · <a href="/about/">소개</a> · <a href="/privacy/">개인정보처리방침</a>
</div>
</footer>
</body>
</html>`;

function buildReview(a) {
  const url = `${BASE}/reviews/${a.slug}/`;
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
      { "@type": "ListItem", position: 2, name: "요양용품", item: `${BASE}/reviews/` },
      { "@type": "ListItem", position: 3, name: a.title, item: url }
    ]
  })}</script>`;

  const cards = a.products.map((p, i) => productCard(p, i + 1)).join('\n');

  return `${head(a.title, a.desc, url, articleSchema + breadcrumb + faqSchema)}
<article class="container">
<h1>${esc(a.h1 || a.title)}</h1>
<div class="meta">${a.date} · 운영자 · 약 ${a.readMin || 6}분 분량</div>
<div class="rv-disc">${DISCLOSURE}</div>
${renderBlocks(a.intro)}
<h2>추천 요양용품 TOP 3</h2>
${cards}
${renderBlocks(a.blocks)}
</article>
${CTA}
${FOOTER}`;
}

function buildHub() {
  const url = `${BASE}/reviews/`;
  const cards = reviews.map(a => `<a href="/reviews/${a.slug}/"><div class="t">${esc(a.hubTitle || a.h1)}</div><div class="d">${esc(a.hubDesc || '')}</div></a>`).join('\n');
  const itemList = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "ItemList",
    itemListElement: reviews.map((a, i) => ({ "@type": "ListItem", position: i + 1, url: `${BASE}/reviews/${a.slug}/`, name: a.h1 }))
  })}</script>`;
  return `${head('요양용품 추천 — 어르신·환자 돌봄 용품 모음', '성인용 기저귀, 방수매트, 욕창예방 방석, 목욕의자, 보행기, 지팡이 등 요양·간병에 필요한 용품을 가성비·베스트·프리미엄으로 비교해 추천합니다.', url, itemList)}
<article class="container">
<h1>요양용품 추천 모음</h1>
<div class="meta">어르신·환자 돌봄에 필요한 용품을 상황별로 비교했습니다</div>
<p>집에서 어르신이나 환자를 돌볼 때 실제로 필요한 용품들을 <strong>가성비·베스트·프리미엄</strong> 세 가지로 나눠 비교했습니다. 아래에서 필요한 품목을 골라보세요.</p>
<div class="rv-hub">${cards}</div>
<p style="color:#64748b;font-size:14px;margin-top:24px;">※ 소개하는 제품은 일상 돌봄을 돕는 생활용품으로, 의료기기가 아닙니다. 어르신의 건강 상태나 복지용구 급여 대상 여부는 전문가·건강보험공단과 상담하세요.</p>
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
console.log(`✓ 요양용품 리뷰 ${n}개 + 허브(/reviews/) 생성`);
console.log('sitemap용 slug:');
reviews.forEach(a => console.log(`  'reviews/${a.slug}',`));
