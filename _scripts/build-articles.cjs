// 정보글 데이터(articles-data.cjs) → 완성된 SEO 정보글 HTML 생성
// 모든 메타/스키마/애드센스/애널리틱스/CTA 자동 적용
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const articles = require('./articles-data.cjs');

const GA4 = 'G-5VX7EX4PCW';
const ADSENSE = 'ca-pub-7852008102553944';
const BASE = 'https://yositong.com';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 본문 블록 → HTML
function renderBlocks(blocks) {
  return blocks.map(b => {
    if (b.h2) return `<h2>${esc(b.h2)}</h2>`;
    if (b.h3) return `<h3>${esc(b.h3)}</h3>`;
    if (b.p) return `<p>${b.p}</p>`; // p는 인라인 HTML(링크/strong) 허용
    if (b.ul) return `<ul>${b.ul.map(li => `<li>${li}</li>`).join('')}</ul>`;
    if (b.ol) return `<ol>${b.ol.map(li => `<li>${li}</li>`).join('')}</ol>`;
    if (b.callout) return `<div class="callout"><strong>${esc(b.calloutTitle || '핵심 요약')}</strong><div style="margin-top:8px">${b.callout}</div></div>`;
    if (b.table) {
      const [head, ...rows] = b.table;
      return `<table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    if (b.faq) {
      return b.faq.map(f => `<details class="q"><summary>${esc(f.q)}</summary><div class="a">${f.a}</div></details>`).join('\n');
    }
    if (b.source) return `<div class="source-note"><strong>참고 자료</strong><ul style="margin:6px 0 0">${b.source.map(s => `<li>${s}</li>`).join('')}</ul><p style="margin:12px 0 0">본 글은 ${b.dateNote || '2026년'} 기준으로 작성되었으며, 정책·제도 변경에 따라 갱신됩니다.</p></div>`;
    return '';
  }).join('\n');
}

// FAQ 블록에서 FAQPage 스키마 추출
function extractFAQ(blocks) {
  const all = [];
  for (const b of blocks) {
    if (b.faq) for (const f of b.faq) all.push({ q: f.q, a: f.a.replace(/<[^>]+>/g, '') });
  }
  return all;
}

const CTA = `
<section class="cta-internal" data-cta="internal" style="margin:48px auto 32px;max-width:800px;padding:28px;background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border-radius:14px;border:1px solid #bbf7d0;text-align:center;">
  <h3 style="font-size:18px;font-weight:800;margin:0 0 8px;color:#0f172a;">실전 정보 더 찾아보세요</h3>
  <p style="margin:0 0 18px;color:#475569;font-size:15px;">전국 31,000개 시설 디렉토리 + 실시간 채용공고 + 무료 기출문제 588</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
    <a href="/jobs/" style="background:#16a34a;color:#fff;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px;">전국 채용 검색 →</a>
    <a href="/regions/seoul/" style="background:#fff;color:#16a34a;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px;border:1px solid #16a34a;">시설 디렉토리 →</a>
    <a href="/quiz/" style="background:#fff;color:#16a34a;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px;border:1px solid #16a34a;">기출문제 풀이 →</a>
    <a href="/faq/" style="background:#fff;color:#16a34a;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px;border:1px solid #16a34a;">FAQ 보기 →</a>
  </div>
</section>`;

function buildArticle(a) {
  const url = `${BASE}/${a.slug}/`;
  const faqList = extractFAQ(a.blocks);
  const faqSchema = faqList.length ? `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqList.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } }))
  })}</script>` : '';

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
<title>${esc(a.title)} | yositong</title>
<meta name="description" content="${esc(a.desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(a.title)}">
<meta property="og:description" content="${esc(a.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/assets/og-image.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${BASE}/assets/og-image.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#16a34a">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="dns-prefetch" href="https://www.googletagmanager.com">
<link rel="dns-prefetch" href="https://vitals.vercel-insights.com">
<meta name="google-adsense-account" content="${ADSENSE}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE}" crossorigin="anonymous"></script>
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "Article",
    headline: a.title, description: a.desc,
    datePublished: a.date, dateModified: a.date, inLanguage: "ko-KR",
    image: `${BASE}/assets/og-image.png`,
    author: { "@type": "Organization", name: "요양보호사 정보", url: `${BASE}/` },
    publisher: { "@type": "Organization", name: "요양보호사 정보", url: `${BASE}/`, logo: { "@type": "ImageObject", url: `${BASE}/android-chrome-512x512.png` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": url }
  })}</script>
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "정보글", item: `${BASE}/blog/` },
      { "@type": "ListItem", position: 3, name: a.title, item: url }
    ]
  })}</script>
${faqSchema}
<style>
body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', -apple-system, sans-serif; background: #f5f5f5; margin: 0; padding: 0; color: #222; line-height: 1.7; }
.nav { background: #fff; border-bottom: 1px solid #e5e5e5; padding: 15px 20px; }
.nav-inner { max-width: 800px; margin: 0 auto; display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }
.nav a { text-decoration: none; color: #555; font-weight: 500; font-size: 15px; }
.nav a.logo { font-weight: 700; color: #222; font-size: 18px; }
.nav a:hover { color: #000; }
.container { max-width: 800px; margin: 30px auto; padding: 40px; background: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.05); border-radius: 10px; }
.container h1 { font-size: 28px; margin-bottom: 10px; line-height: 1.4; }
.container .meta { color: #888; font-size: 14px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
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
.source-note { background: #f9f9f7; padding: 14px 18px; border-radius: 6px; font-size: 14px; color: #666; margin-top: 32px; border: 1px solid #e8e8e8; }
.footer { background: #2a2a2a; color: #aaa; padding: 40px 20px; margin-top: 40px; text-align: center; font-size: 14px; }
.footer a { color: #ddd; text-decoration: none; margin: 0 10px; }
@media (max-width: 600px) { .container { padding: 20px; margin: 10px; } .container h1 { font-size: 22px; } }
</style>
</head>
<body>
<nav class="nav"><div class="nav-inner">
<a href="/" class="logo">요양보호사 정보</a>
<a href="/jobs/">취업정보</a>
<a href="/academy/">학원가이드</a>
<a href="/quiz/">문제풀이</a>
<a href="/blog/">정보글</a>
<a href="/reviews/">요양용품</a>
</div></nav>

<article class="container">
<h1>${esc(a.h1 || a.title)}</h1>
<div class="meta">${a.date} · 운영자 · 약 ${a.readMin || 7}분 분량</div>
${renderBlocks(a.blocks)}
</article>

${CTA}

<footer class="footer">
<div>© 2026 요양보호사 정보 · yositong.com</div>
<div style="margin-top: 10px;">
<a href="/blog/">정보글</a> · <a href="/jobs/">취업정보</a> · <a href="/quiz/">문제풀이</a> · <a href="/about/">소개</a> · <a href="/contact/">문의</a> · <a href="/privacy/">개인정보처리방침</a>
</div>
</footer>
</body>
</html>
`;
}

let created = 0;
for (const a of articles) {
  const dir = path.join(ROOT, a.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), buildArticle(a), 'utf8');
  created++;
}
console.log(`✓ ${created}개 정보글 생성`);
console.log('슬러그 목록 (sitemap에 추가하세요):');
articles.forEach(a => console.log(`  '${a.slug}',`));
