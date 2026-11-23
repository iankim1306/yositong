/**
 * build-quiz-pages.cjs — 주제별 기출문제 페이지 생성
 *
 * 왜 만드나
 *  기존 /quiz 는 문항 전부를 quiz/data.js(236KB)에 넣고 HTML 본문은 279자뿐이었다.
 *  검색엔진이 읽을 게 없어 "요양보호사 기출문제 무료"로 노출 486에 CTR 1.6%가 나왔다.
 *  문항을 HTML로 꺼내 주제별 페이지로 만들면 같은 데이터로 노출과 클릭이 함께 늘어난다.
 *
 * 규칙
 *  - 검색 단어는 "기출문제"로 통일한다(제목·설명·h1·내부링크).
 *  - 다만 본문에 성격을 분명히 밝힌다: 실제 기출 복원이 아니라 출제 범위에 맞춘 연습문제.
 *  - 인근 주제 링크는 자기 인덱스 기준 회전으로 고르게 돌린다.
 *    (상위 N개를 slice 로 자르면 몇 개 페이지가 링크를 독식한다 — 지역 디렉토리에서 겪은 버그)
 *
 * 실행: node _scripts/build-quiz-pages.cjs
 */
const fs = require('fs');
const path = require('path');
const { FIGURES, MATCH } = require('./quiz/figures.cjs');

const ROOT = path.resolve(__dirname, '..');
const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'quiz', 'quiz.json'), 'utf8'));
const OUT = path.join(ROOT, 'quiz');
const BASE = 'https://yositong.com';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const NAVER = `<meta name="naver-site-verification" content="9ebf50acfe0237b4f8f418e1224d4f59264fdd31" />
<meta name="naver-site-verification" content="b0bb10d2d3505f81ed288420c1c9f1dc435ddb0c" />
<meta name="google-site-verification" content="AdSJSnhdDNb6-WjWRbwJnLZmjcQASaWJbDRN36i4DXk" />`;

function nav() {
  return `<nav class="nav"><div class="nav-inner">
<a href="/" class="logo">요양보호사 정보</a>
<a href="/jobs">취업정보</a>
<a href="/academy">학원가이드</a>
<a href="/quiz">문제풀이</a>
<a href="/regions">지역별</a>
<a href="/blog">정보글</a>
</div></nav>`;
}
function footer() {
  return `<footer class="footer">
<div class="brand">요양보호사 정보</div>
<div>© 2026 yositong.com</div>
<div style="margin-top:12px;">
<a href="/jobs">취업정보</a>·<a href="/academy">학원가이드</a>·<a href="/quiz">문제풀이</a>·<a href="/regions">지역별</a>·<a href="/blog">정보글</a>·<a href="/about">소개</a>·<a href="/contact">문의</a>·<a href="/privacy">개인정보처리방침</a>
</div></footer>`;
}

const CSS = `<style>
:root{--ink:#1f2937;--soft:#6b7280;--line:#e5e7eb;--acc:#2f7d4f;--bg:#f7f8fa}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,'Malgun Gothic',sans-serif;color:var(--ink);background:#fff;line-height:1.65}
.wrap{max-width:860px;margin:0 auto;padding:0 16px}
.q-hero{background:var(--bg);border-bottom:1px solid var(--line);padding:28px 0 24px;margin-bottom:24px}
.q-hero h1{font-size:26px;margin:0 0 8px;line-height:1.35}
.q-hero p{margin:0;color:var(--soft);font-size:15px}
.q-note{border:1px solid var(--line);border-left:4px solid var(--acc);background:#fafdfb;padding:14px 16px;border-radius:6px;margin:0 0 28px;font-size:14px;color:#374151}
.q-item{border:1px solid var(--line);border-radius:8px;padding:16px 18px;margin:0 0 14px}
.q-no{font-size:12px;color:var(--soft);font-weight:700;letter-spacing:.04em}
.q-text{font-size:16px;font-weight:600;margin:6px 0 12px}
.q-opts{list-style:none;margin:0 0 10px;padding:0}
.q-opts li{padding:6px 10px;border-radius:5px;font-size:15px}
.q-opts li+li{margin-top:4px}
.q-ans{border-top:1px dashed var(--line);padding-top:10px;margin-top:10px}
.q-ans summary{cursor:pointer;color:var(--acc);font-weight:700;font-size:14px}
.q-ans p{margin:8px 0 0;font-size:14.5px;color:#374151}
.q-ans b{color:var(--acc)}
.q-fig{display:block;width:100%;max-width:440px;height:auto;margin:4px 0 14px;border:1px solid var(--line);border-radius:6px;background:#fff}
.q-topics{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 28px}
.q-topics a{display:inline-block;padding:7px 12px;border:1px solid var(--line);border-radius:999px;font-size:14px;color:var(--ink);text-decoration:none;background:#fff}
.q-topics a:hover{border-color:var(--acc);color:var(--acc)}
.q-seo{border-top:1px solid var(--line);margin-top:34px;padding-top:22px;color:#374151;font-size:15px}
.q-seo h2{font-size:19px;margin:0 0 10px}
.q-cta{background:var(--bg);border-radius:8px;padding:18px;margin:26px 0;font-size:15px}
.q-cta a{color:var(--acc);font-weight:700}
.nav{border-bottom:1px solid var(--line);background:#fff}
.nav-inner{max-width:860px;margin:0 auto;padding:12px 16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.nav-inner a{color:var(--ink);text-decoration:none;font-size:15px}
.nav-inner .logo{font-weight:800}
.footer{border-top:1px solid var(--line);margin-top:48px;padding:24px 16px;text-align:center;color:var(--soft);font-size:14px}
.footer a{color:var(--soft);text-decoration:none}
.footer .brand{font-weight:700;color:var(--ink);margin-bottom:6px}
@media(max-width:600px){.q-hero h1{font-size:22px}}
</style>`;

function figureFor(q) {
  const t = q.question;
  const hit = MATCH.find(([, re]) => re.test(t));
  return hit ? FIGURES[hit[0]] : null;
}

function renderQuestion(q, i) {
  const fig = figureFor(q);
  const opts = q.options.map((o, k) =>
    `<li>${'①②③④⑤'[k]} ${esc(o)}</li>`).join('\n');
  return `<div class="q-item">
<div class="q-no">문제 ${i + 1}</div>
<div class="q-text">${esc(q.question)}</div>
${fig ? fig.svg : ''}
<ul class="q-opts">
${opts}
</ul>
<details class="q-ans"><summary>정답과 해설 보기</summary>
<p><b>정답 ${'①②③④⑤'[q.correct]} ${esc(q.options[q.correct])}</b></p>
<p>${esc(q.explanation)}</p>
</details>
</div>`;
}

function buildTopicPage(topic, questions, idx, topics) {
  const name = topic.name;
  const url = `${BASE}/quiz/${topic.slug}`;
  // 검색 단어는 "기출문제"로 통일
  const title = `요양보호사 ${name} 기출문제 ${questions.length}문항 무료 풀이`;
  const desc = `요양보호사 시험 ${name} 분야 기출문제 ${questions.length}문항을 정답·해설과 함께 무료로 제공합니다. 출제 범위에 맞춘 실전 연습문제로 필기와 실기를 대비하세요.`;

  // 인근 주제 링크: 자기 위치 기준 회전 (고정 slice 금지)
  const near = [];
  const K = Math.min(6, topics.length - 1);
  for (let k = 1; k <= K; k++) near.push(topics[(idx + k) % topics.length]);
  const nearLinks = near.map(t =>
    `<a href="/quiz/${t.slug}">요양보호사 ${t.name} 기출문제</a>`).join('');

  const figCount = questions.filter(figureFor).length;

  const crumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "홈", "item": BASE + "/" },
      { "@type": "ListItem", "position": 2, "name": "요양보호사 기출문제", "item": BASE + "/quiz/" },
      { "@type": "ListItem", "position": 3, "name": name, "item": url }
    ]
  };
  // 상위 5문항만 QAPage 로 노출(과도한 마크업 방지)
  const qa = {
    "@context": "https://schema.org", "@type": "ItemList",
    "name": title,
    "itemListElement": questions.slice(0, 5).map((q, i) => ({
      "@type": "ListItem", "position": i + 1, "name": q.question
    }))
  };

  return `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
${NAVER}
<title>${esc(title)} - yositong</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/assets/og-image.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(crumb)}</script>
<script type="application/ld+json">${JSON.stringify(qa)}</script>
${CSS}
</head><body>
${nav()}
<section class="q-hero"><div class="wrap">
<h1>요양보호사 ${esc(name)} 기출문제</h1>
<p>${questions.length}문항 · 정답과 해설 포함${figCount ? ` · 그림 문제 ${figCount}문항` : ''} · 무료</p>
</div></section>
<main class="wrap">

<div class="q-note">
<strong>이 문제의 성격</strong><br>
실제 시험지를 그대로 복원한 것이 아니라, <strong>요양보호사 양성 표준교재의 출제 범위에 맞춰 만든 실전 연습문제</strong>입니다.
자료마다 기준이 갈리는 수치는 정답으로 묻지 않고, 현장에서 다툼이 없는 원칙 위주로 구성했습니다.
시험 일정과 출제 기준은 회차마다 달라질 수 있으니 <strong>해당 회차 공고를 반드시 확인</strong>하세요.
</div>

<div class="q-topics">
<a href="/quiz">전체 문제 풀기</a>
${nearLinks}
</div>

${questions.map(renderQuestion).join('\n')}

<div class="q-cta">
전체 ${DATA.questions.length}문항을 랜덤으로 풀어 보려면 <a href="/quiz">요양보호사 기출문제 전체 풀이</a>로 이동하세요.
지역별 일자리는 <a href="/regions">지역별 요양보호사 일자리</a>에서 확인할 수 있습니다.
</div>

<div class="q-seo">
<h2>${esc(name)} 분야는 어떻게 공부하나</h2>
<p>${topicIntro(topic.slug, name, questions.length)}</p>
</div>

<div class="q-topics" style="margin-top:24px">
${nearLinks}
</div>
</main>
${footer()}
</body></html>`;
}

function topicIntro(slug, name, n) {
  const M = {
    move: '요양보호사 시험에서 가장 비중이 큰 영역입니다. 체위 변경과 이동 보조는 각도·순서·지지 위치를 묻는 문제가 반복해서 나옵니다. 휠체어를 침대와 몇 도로 두는지, 편마비 대상자를 어느 쪽으로 옮기는지처럼 숫자와 방향이 함께 나오는 문제를 특히 눈여겨보세요. 대상자의 안전과 요양보호사 본인의 허리 보호가 동시에 걸린 영역이라 실기에서도 자주 다뤄집니다.',
    disease: '노화에 따른 생리적 변화와 흔한 노인성 질환을 다룹니다. 질환의 치료법보다는 요양보호사가 관찰해야 할 증상과 보고 시점을 묻는 문제가 많습니다. 약물 용량이나 진단은 요양보호사의 업무 범위가 아니라는 점을 기준으로 선지를 보면 답이 보입니다.',
    basic: '요양보호사의 역할과 서비스 제공의 기본 원칙을 다룹니다. 선지에 "요양보호사 본인의 편의", "기관의 이익"이 들어가면 대개 오답입니다. 판단 기준은 언제나 대상자의 욕구와 존엄, 그리고 잔존 기능 유지입니다.',
    ethics: '직업윤리와 인권은 매 회차 출제되는 영역입니다. 비밀유지, 학대 신고 의무, 금품 수수 금지가 핵심 축입니다. 특히 신체 구속과 강제 돌봄은 선의로 한 일이라도 학대가 될 수 있다는 점이 자주 나옵니다.',
    meal: '식사 돕기는 흡인(사레)이 사망으로 이어질 수 있어 안전 문제로 다뤄집니다. 상체를 세우고 턱을 당긴 자세, 한 숟가락씩 삼킨 것을 확인하고 진행하기, 편마비 대상자는 건강한 쪽으로 넣기가 반복 출제 포인트입니다.',
    hygiene: '목욕·구강·의치·손발톱 관리가 모두 들어갑니다. 회음부는 앞에서 뒤로, 발톱은 일자로처럼 방향과 모양을 묻는 문제가 많습니다. 수치심을 줄이는 배려를 묻는 문항도 꾸준히 나옵니다.',
    excretion: '배설 돕기는 수치심이 가장 큰 돌봄이라 기술과 태도를 함께 묻습니다. 기저귀는 배설 확인 즉시 교체, 이동변기는 건강한 쪽에 침대 높이로, 소변 주머니는 방광보다 낮게가 핵심입니다. 도뇨관 삽입이 업무 범위 밖이라는 점도 자주 나옵니다.',
    dementia: '치매 돌봄의 원칙은 "사실을 교정하지 말고 감정에 반응한다"입니다. 선지에서 논쟁하거나 바로잡으려는 쪽은 대개 오답입니다. 배회·망상·석양증후군처럼 증상별 대응과 안전한 환경 조성이 함께 출제됩니다.',
    emergency: '응급처치는 요양보호사의 업무 범위를 묻는 문제가 섞여 나옵니다. 기본 처치와 119 신고까지가 역할이고, 투약이나 뼈 맞추기는 하지 않습니다. 하임리히법 위치, 가슴압박 비율과 속도는 숫자까지 외워 두는 편이 좋습니다.',
    infection: '손 위생이 모든 문제의 바탕입니다. 장갑을 벗는 방법, 표준주의 개념, 노로바이러스에는 알코올이 듣지 않는다는 점이 변별력 있는 포인트입니다. 요양보호사 본인의 감염 관리도 함께 다뤄집니다.',
    comm: '경청과 공감이 기본 축입니다. 난청 대상자에게는 소리를 높이기보다 낮은 톤으로, 시각장애 대상자에게는 시계 방향으로 설명하는 식의 구체적 기법이 출제됩니다. 말을 대신 끝맺는 선지는 대개 오답입니다.',
    dying: '임종 돌봄의 목표는 치료가 아니라 편안함입니다. 청각이 마지막까지 남는다는 점, 사망 판정과 삽입물 제거는 의료진의 몫이라는 점이 핵심입니다. 가족에 대한 정서적 지지도 요양보호사의 역할에 포함됩니다.',
    system: '장기요양보험의 구조를 묻습니다. 신청과 등급 판정은 국민건강보험공단, 등급은 소득이 아니라 심신 기능으로 결정된다는 두 가지가 출발점입니다. 재가급여 종류를 구분하는 문제가 특히 자주 나옵니다.',
    selfcare: '요양보호사 본인의 건강과 권리를 다룹니다. 들어 올릴 때 무릎을 굽히고 대상자를 몸에 가까이 붙이는 자세, 소진 예방, 성희롱·산재 대응이 핵심입니다. 혼자 무리하지 않고 동료·기구를 쓰는 선지가 대개 정답입니다.',
  };
  return (M[slug] || '') + ` 이 페이지에는 ${name} 분야 ${n}문항이 정답·해설과 함께 정리돼 있습니다.`;
}

// ── 실행 ──
const topics = DATA.topics;
const byCat = {};
DATA.questions.forEach(q => (byCat[q.category] = byCat[q.category] || []).push(q));

let made = 0, totalBytes = 0, figTotal = 0;
topics.forEach((t, i) => {
  const list = byCat[t.name] || [];
  if (!list.length) return;
  const dir = path.join(OUT, t.slug);
  fs.mkdirSync(dir, { recursive: true });
  const html = buildTopicPage(t, list, i, topics);
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  const f = list.filter(figureFor).length;
  figTotal += f;
  totalBytes += Buffer.byteLength(html);
  console.log(`  ✓ /quiz/${t.slug}/  ${String(list.length).padStart(3)}문항  ${String(Math.round(Buffer.byteLength(html) / 1024)).padStart(3)}KB  그림 ${f}`);
  made++;
});
console.log(`\n✓ ${made}개 주제 페이지 생성 (총 ${Math.round(totalBytes / 1024)}KB, 그림 부착 ${figTotal}문항)`);
