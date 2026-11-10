/**
 * figures.cjs — 기출 유형 문제에 붙일 SVG 선화
 *
 * 왜 SVG인가
 *  - PNG는 검색엔진에게 그냥 네모난 덩어리다. 이 사이트의 가장 큰 문제가
 *    "588문항이 JS에 갇혀 검색에 안 보인다"였는데, 그림을 PNG로 넣으면 같은 병을 또 만든다.
 *  - SVG는 <title>/<desc>/<text> 가 그대로 DOM 텍스트라 본문처럼 읽힌다.
 *    그림을 늘릴수록 검색 자산도 같이 늘어난다.
 *  - 전부 직접 그린 선화라 교재·기출 그림 저작권 문제가 없다.
 *
 * 사용법: FIGURES[key] → { title, desc, svg }
 *         문항 매칭은 MATCH 배열의 정규식으로 한다.
 */
const INK = '#1f2937';      // 선
const SOFT = '#9ca3af';     // 보조선
const ACC = '#2f7d4f';      // 강조(정답 쪽)
const BAD = '#c0392b';      // 잘못된 예
const FILL = '#eef2f5';     // 면

function wrap(id, title, desc, body, vb = '0 0 420 220') {
  return `<svg class="q-fig" viewBox="${vb}" role="img" aria-labelledby="${id}-t ${id}-d" xmlns="http://www.w3.org/2000/svg">
<title id="${id}-t">${title}</title><desc id="${id}-d">${desc}</desc>
<style>.q-fig text{font-family:system-ui,-apple-system,'Malgun Gothic',sans-serif;font-size:13px;fill:${INK}}
.q-fig .sm{font-size:11px;fill:#4b5563}.q-fig .ok{fill:${ACC};font-weight:700}.q-fig .no{fill:${BAD};font-weight:700}</style>
${body}</svg>`;
}

const FIGURES = {};

/* 1. 휠체어 배치 각도 */
FIGURES['wheelchair-angle'] = (() => {
  const t = '침대에서 휠체어로 옮길 때 휠체어 배치 각도';
  const d = '휠체어를 침대 옆면과 30~45도 각도로 두고 잠금장치를 잠근 상태. 대상자의 건강한 쪽에 붙여 놓는다.';
  return { title: t, desc: d, svg: wrap('f1', t, d, `
<rect x="20" y="60" width="170" height="80" rx="6" fill="${FILL}" stroke="${INK}" stroke-width="2"/>
<text x="105" y="106" text-anchor="middle">침대</text>
<line x1="190" y1="60" x2="190" y2="140" stroke="${SOFT}" stroke-width="1.5" stroke-dasharray="4 4"/>
<g transform="translate(250,115) rotate(-38)">
  <rect x="-34" y="-30" width="68" height="56" rx="5" fill="#fff" stroke="${INK}" stroke-width="2"/>
  <circle cx="-22" cy="30" r="12" fill="none" stroke="${INK}" stroke-width="2"/>
  <circle cx="22" cy="30" r="12" fill="none" stroke="${INK}" stroke-width="2"/>
  <text x="0" y="2" text-anchor="middle" font-size="12">휠체어</text>
</g>
<path d="M190 128 A 46 46 0 0 0 222 96" fill="none" stroke="${ACC}" stroke-width="2"/>
<text x="206" y="150" class="ok" text-anchor="middle">30~45°</text>
<text x="330" y="40" class="sm">· 잠금장치를 잠근다</text>
<text x="330" y="58" class="sm">· 발판을 올린다</text>
<text x="330" y="76" class="sm">· 건강한 쪽에 붙인다</text>
<text x="20" y="40" class="sm">건강한 쪽</text>`) };
})();

/* 2. 기본 체위 4종 */
FIGURES['positions'] = (() => {
  const t = '기본 체위 네 가지 — 앙와위·측위·반좌위·복위';
  const d = '앙와위는 바로 누운 자세, 측위는 옆으로 누운 자세, 반좌위는 상체를 45도 정도 올린 자세, 복위는 엎드린 자세.';
  const bed = (x) => `<rect x="${x}" y="58" width="92" height="10" rx="3" fill="${FILL}" stroke="${SOFT}" stroke-width="1.5"/>`;
  return { title: t, desc: d, svg: wrap('f2', t, d, `
${bed(10)}<g stroke="${INK}" stroke-width="2" fill="none">
<circle cx="24" cy="48" r="7"/><line x1="31" y1="52" x2="92" y2="52"/><line x1="60" y1="52" x2="78" y2="44"/></g>
<text x="56" y="88" text-anchor="middle" font-size="12">앙와위</text><text x="56" y="104" class="sm" text-anchor="middle">바로 누움</text>

${bed(115)}<g stroke="${INK}" stroke-width="2" fill="none">
<circle cx="129" cy="48" r="7"/><path d="M136 52 q24 -8 44 2"/><path d="M152 50 q6 -14 20 -8"/></g>
<text x="161" y="88" text-anchor="middle" font-size="12">측위</text><text x="161" y="104" class="sm" text-anchor="middle">옆으로 누움</text>

<rect x="220" y="58" width="92" height="10" rx="3" fill="${FILL}" stroke="${SOFT}" stroke-width="1.5"/>
<path d="M220 58 L252 30" stroke="${SOFT}" stroke-width="1.5" fill="none"/>
<g stroke="${INK}" stroke-width="2" fill="none"><circle cx="243" cy="30" r="7"/><line x1="248" y1="35" x2="302" y2="52"/></g>
<text x="266" y="88" text-anchor="middle" font-size="12">반좌위</text><text x="266" y="104" class="sm" text-anchor="middle">상체 올림</text>

${bed(325)}<g stroke="${INK}" stroke-width="2" fill="none">
<circle cx="339" cy="50" r="7"/><line x1="346" y1="54" x2="405" y2="54"/><line x1="366" y1="54" x2="380" y2="62"/></g>
<text x="371" y="88" text-anchor="middle" font-size="12">복위</text><text x="371" y="104" class="sm" text-anchor="middle">엎드림</text>`, '0 0 420 120') };
})();

/* 3. 손 씻기 단계 */
FIGURES['handwash'] = (() => {
  const t = '올바른 손 씻기에서 놓치기 쉬운 부위';
  const d = '손바닥, 손등, 손가락 사이, 엄지, 손톱 밑, 손목 순으로 문질러 씻는다. 손가락 사이와 손톱 밑이 가장 자주 빠진다.';
  const step = (i, x, label) => `
<circle cx="${x}" cy="46" r="20" fill="#fff" stroke="${INK}" stroke-width="2"/>
<text x="${x}" y="51" text-anchor="middle" font-size="14" font-weight="700">${i}</text>
<text x="${x}" y="86" text-anchor="middle" font-size="11">${label}</text>`;
  return { title: t, desc: d, svg: wrap('f3', t, d, `
${step(1, 40, '손바닥')}${step(2, 102, '손등')}${step(3, 164, '손가락 사이')}
${step(4, 226, '엄지')}${step(5, 288, '손톱 밑')}${step(6, 350, '손목')}
<line x1="62" y1="46" x2="80" y2="46" stroke="${SOFT}" stroke-width="2"/>
<line x1="124" y1="46" x2="142" y2="46" stroke="${SOFT}" stroke-width="2"/>
<line x1="186" y1="46" x2="204" y2="46" stroke="${SOFT}" stroke-width="2"/>
<line x1="248" y1="46" x2="266" y2="46" stroke="${SOFT}" stroke-width="2"/>
<line x1="310" y1="46" x2="328" y2="46" stroke="${SOFT}" stroke-width="2"/>
<text x="210" y="110" text-anchor="middle" class="ok">③ 손가락 사이와 ⑤ 손톱 밑을 가장 많이 빠뜨린다</text>`, '0 0 420 125') };
})();

/* 4. 욕창 호발 부위 */
FIGURES['pressure-points'] = (() => {
  const t = '욕창이 잘 생기는 부위';
  const d = '뒤통수, 어깨뼈, 팔꿈치, 엉치뼈(천골), 발뒤꿈치처럼 뼈가 튀어나와 바닥에 눌리는 곳에 잘 생긴다.';
  const dot = (x, y, label, lx, ly) => `<circle cx="${x}" cy="${y}" r="6" fill="${BAD}" opacity=".85"/>
<line x1="${x}" y1="${y}" x2="${lx}" y2="${ly}" stroke="${SOFT}" stroke-width="1"/>
<text x="${lx + 4}" y="${ly + 4}" class="sm">${label}</text>`;
  return { title: t, desc: d, svg: wrap('f4', t, d, `
<rect x="30" y="120" width="300" height="10" rx="3" fill="${FILL}" stroke="${SOFT}" stroke-width="1.5"/>
<g stroke="${INK}" stroke-width="2" fill="none">
<circle cx="52" cy="108" r="11"/><path d="M63 114 h200"/><path d="M263 114 q18 2 26 10"/></g>
${dot(46, 100, '뒤통수', 26, 70)}
${dot(90, 108, '어깨뼈', 78, 56)}
${dot(140, 110, '팔꿈치', 132, 76)}
${dot(205, 112, '엉치뼈(천골)', 180, 46)}
${dot(285, 118, '발뒤꿈치', 290, 86)}
<text x="210" y="160" text-anchor="middle" class="sm">뼈가 튀어나와 눌리는 곳 — 체위를 바꿔 압력을 분산한다</text>`, '0 0 420 175') };
})();

/* 5. 하임리히법 위치 */
FIGURES['heimlich'] = (() => {
  const t = '복부 밀어내기(하임리히법)의 손 위치';
  const d = '배꼽과 명치 사이에 주먹을 대고 다른 손으로 감싼 뒤 안쪽 위 방향으로 빠르게 밀어 올린다.';
  return { title: t, desc: d, svg: wrap('f5', t, d, `
<g stroke="${INK}" stroke-width="2" fill="none">
<circle cx="150" cy="40" r="20"/><path d="M150 60 v70"/><path d="M150 76 l-34 26"/><path d="M150 76 l34 26"/>
<path d="M150 130 l-22 56"/><path d="M150 130 l22 56"/></g>
<line x1="150" y1="64" x2="214" y2="64" stroke="${SOFT}" stroke-width="1" stroke-dasharray="3 3"/>
<text x="220" y="68" class="sm">명치</text>
<line x1="150" y1="118" x2="214" y2="118" stroke="${SOFT}" stroke-width="1" stroke-dasharray="3 3"/>
<text x="220" y="122" class="sm">배꼽</text>
<circle cx="150" cy="92" r="13" fill="${ACC}" opacity=".9"/>
<path d="M150 108 l0 -34" stroke="${ACC}" stroke-width="3" marker-end="url(#ar)"/>
<defs><marker id="ar" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
<path d="M0 0 L10 5 L0 10 z" fill="${ACC}"/></marker></defs>
<text x="252" y="96" class="ok">주먹 위치</text>
<text x="252" y="114" class="sm">배꼽과 명치 사이</text>
<text x="252" y="134" class="sm">안쪽 위로 빠르게</text>`, '0 0 420 200') };
})();

/* 6. 가슴압박 위치 */
FIGURES['cpr-point'] = (() => {
  const t = '성인 심폐소생술 가슴압박 위치';
  const d = '가슴 중앙 복장뼈(흉골) 아래쪽 절반을 압박한다. 명치나 갈비뼈를 누르면 장기 손상 위험이 있다.';
  return { title: t, desc: d, svg: wrap('f6', t, d, `
<ellipse cx="180" cy="100" rx="78" ry="62" fill="${FILL}" stroke="${INK}" stroke-width="2"/>
<line x1="180" y1="44" x2="180" y2="150" stroke="${SOFT}" stroke-width="2"/>
<text x="180" y="36" text-anchor="middle" class="sm">복장뼈(흉골)</text>
<circle cx="180" cy="120" r="15" fill="${ACC}" opacity=".9"/>
<text x="286" y="118" class="ok">압박 지점</text>
<text x="286" y="136" class="sm">흉골 아래쪽 절반</text>
<circle cx="180" cy="158" r="9" fill="none" stroke="${BAD}" stroke-width="2"/>
<line x1="173" y1="151" x2="187" y2="165" stroke="${BAD}" stroke-width="2"/>
<text x="200" y="176" class="no">명치 ✕</text>
<text x="40" y="186" class="sm">분당 100~120회 · 가슴압박 30 : 인공호흡 2</text>`, '0 0 420 200') };
})();

/* 7. 회음부 세척 방향 */
FIGURES['perineal'] = (() => {
  const t = '회음부를 닦는 방향';
  const d = '항문 쪽 세균이 요도로 옮겨가지 않도록 반드시 앞에서 뒤로 한 방향으로 닦는다. 한 번 닦은 면은 다시 쓰지 않는다.';
  return { title: t, desc: d, svg: wrap('f7', t, d, `
<rect x="120" y="30" width="110" height="120" rx="50" fill="${FILL}" stroke="${INK}" stroke-width="2"/>
<text x="175" y="54" text-anchor="middle" class="sm">앞(요도 쪽)</text>
<text x="175" y="140" text-anchor="middle" class="sm">뒤(항문 쪽)</text>
<path d="M175 66 L175 118" stroke="${ACC}" stroke-width="4" marker-end="url(#ar2)"/>
<defs><marker id="ar2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
<path d="M0 0 L10 5 L0 10 z" fill="${ACC}"/></marker></defs>
<text x="256" y="78" class="ok">앞 → 뒤 ○</text>
<text x="256" y="100" class="sm">한 방향으로만</text>
<text x="256" y="120" class="no">뒤 → 앞 ✕</text>
<text x="256" y="140" class="sm">요로감염 위험</text>`, '0 0 420 170') };
})();

/* 8. 들어 올리는 자세 */
FIGURES['lifting'] = (() => {
  const t = '무거운 것을 들어 올릴 때의 자세';
  const d = '무릎을 굽히고 허리를 편 채 다리 힘으로 들어 올린다. 허리를 굽혀 드는 자세는 척추에 부담이 집중된다.';
  const fig = (x, ok) => `
<g stroke="${ok ? ACC : BAD}" stroke-width="2.5" fill="none">
<circle cx="${x}" cy="${ok ? 48 : 44}" r="11"/>
${ok ? `<path d="M${x} 59 v36"/><path d="M${x} 95 l-16 24"/><path d="M${x} 95 l16 24"/><path d="M${x} 70 l26 20"/>`
      : `<path d="M${x} 55 q12 26 34 30"/><path d="M${x + 34} 85 v34"/><path d="M${x} 62 l24 22"/>`}
</g>
<rect x="${ok ? x + 18 : x + 20}" y="${ok ? 86 : 80}" width="26" height="22" rx="3" fill="${FILL}" stroke="${INK}" stroke-width="2"/>`;
  return { title: t, desc: d, svg: wrap('f8', t, d, `
${fig(80, true)}<text x="92" y="150" text-anchor="middle" class="ok">○ 무릎을 굽힌다</text>
<text x="92" y="168" text-anchor="middle" class="sm">허리를 펴고 다리 힘으로</text>
<line x1="210" y1="30" x2="210" y2="160" stroke="${SOFT}" stroke-width="1" stroke-dasharray="4 4"/>
${fig(280, false)}<text x="300" y="150" text-anchor="middle" class="no">✕ 허리를 굽힌다</text>
<text x="300" y="168" text-anchor="middle" class="sm">척추에 부담이 집중</text>`, '0 0 420 180') };
})();

/* 9. 식사 자세 */
FIGURES['meal-posture'] = (() => {
  const t = '식사를 도울 때 안전한 자세';
  const d = '상체를 세우고 턱을 약간 당긴 자세가 기도를 좁혀 사레를 막는다. 고개를 뒤로 젖힌 자세는 가장 위험하다.';
  const head = (x, tilt, ok) => `
<g transform="translate(${x},70) rotate(${tilt})" stroke="${ok ? ACC : BAD}" stroke-width="2.5" fill="none">
<circle cx="0" cy="0" r="20"/><path d="M14 10 q10 6 14 2"/></g>`;
  return { title: t, desc: d, svg: wrap('f9', t, d, `
${head(90, 14, true)}<path d="M90 92 v40" stroke="${ACC}" stroke-width="2.5" fill="none"/>
<text x="90" y="158" text-anchor="middle" class="ok">○ 턱을 당긴다</text>
<text x="90" y="176" text-anchor="middle" class="sm">기도가 좁아져 안전</text>
<line x1="210" y1="30" x2="210" y2="170" stroke="${SOFT}" stroke-width="1" stroke-dasharray="4 4"/>
${head(320, -22, false)}<path d="M320 92 v40" stroke="${BAD}" stroke-width="2.5" fill="none"/>
<text x="320" y="158" text-anchor="middle" class="no">✕ 고개를 젖힌다</text>
<text x="320" y="176" text-anchor="middle" class="sm">기도가 열려 사레 위험</text>`, '0 0 420 190') };
})();

/* 10. 손발톱 깎는 모양 */
FIGURES['nail-cut'] = (() => {
  const t = '손톱과 발톱을 깎는 모양';
  const d = '손톱은 둥글게, 발톱은 일자로 깎는다. 발톱을 둥글게 깎으면 살을 파고들어 내성발톱이 생긴다.';
  return { title: t, desc: d, svg: wrap('f10', t, d, `
<rect x="60" y="40" width="70" height="88" rx="30" fill="${FILL}" stroke="${INK}" stroke-width="2"/>
<path d="M60 70 q35 -34 70 0" fill="none" stroke="${ACC}" stroke-width="3"/>
<text x="95" y="152" text-anchor="middle" class="ok">손톱 — 둥글게</text>
<line x1="210" y1="30" x2="210" y2="160" stroke="${SOFT}" stroke-width="1" stroke-dasharray="4 4"/>
<rect x="285" y="40" width="70" height="88" rx="30" fill="${FILL}" stroke="${INK}" stroke-width="2"/>
<line x1="285" y1="62" x2="355" y2="62" stroke="${ACC}" stroke-width="3"/>
<text x="320" y="152" text-anchor="middle" class="ok">발톱 — 일자로</text>
<text x="210" y="178" text-anchor="middle" class="sm">발톱을 둥글게 깎으면 살을 파고든다(내성발톱)</text>`, '0 0 420 192') };
})();

/* 11. 소변 주머니 높이 */
FIGURES['urine-bag'] = (() => {
  const t = '유치도뇨관 소변 주머니의 높이';
  const d = '소변 주머니는 항상 방광보다 낮게 둔다. 높으면 소변이 역류해 요로감염을 일으키고, 바닥에 닿으면 오염된다.';
  return { title: t, desc: d, svg: wrap('f11', t, d, `
<rect x="40" y="46" width="180" height="56" rx="8" fill="${FILL}" stroke="${INK}" stroke-width="2"/>
<text x="130" y="80" text-anchor="middle">대상자(방광)</text>
<line x1="130" y1="102" x2="130" y2="118" stroke="${SOFT}" stroke-width="1.5" stroke-dasharray="4 4"/>
<text x="140" y="116" class="sm">방광 높이</text>
<path d="M200 90 q60 40 72 66" fill="none" stroke="${INK}" stroke-width="2"/>
<rect x="252" y="152" width="44" height="40" rx="5" fill="#fff" stroke="${ACC}" stroke-width="2.5"/>
<text x="274" y="176" text-anchor="middle" font-size="11" class="ok">○</text>
<line x1="230" y1="206" x2="400" y2="206" stroke="${SOFT}" stroke-width="2"/>
<text x="315" y="222" class="sm">바닥</text>
<text x="306" y="150" class="ok">방광보다 낮게</text>
<text x="306" y="168" class="sm">단, 바닥에 닿지 않게</text>`, '0 0 420 232') };
})();

/* 12. 편마비 옷 입고 벗기 */
FIGURES['dressing'] = (() => {
  const t = '편마비 대상자의 옷 입고 벗는 순서';
  const d = '입힐 때는 마비된 쪽부터, 벗길 때는 건강한 쪽부터가 원칙이다. 마비된 팔을 억지로 굽히지 않아 관절 손상을 줄인다.';
  return { title: t, desc: d, svg: wrap('f12', t, d, `
<rect x="24" y="34" width="170" height="110" rx="10" fill="${FILL}" stroke="${INK}" stroke-width="2"/>
<text x="109" y="62" text-anchor="middle" font-weight="700">입힐 때</text>
<text x="109" y="92" text-anchor="middle" class="ok">마비된 쪽 먼저</text>
<text x="109" y="118" text-anchor="middle" class="sm">→ 건강한 쪽 나중</text>
<rect x="226" y="34" width="170" height="110" rx="10" fill="${FILL}" stroke="${INK}" stroke-width="2"/>
<text x="311" y="62" text-anchor="middle" font-weight="700">벗길 때</text>
<text x="311" y="92" text-anchor="middle" class="ok">건강한 쪽 먼저</text>
<text x="311" y="118" text-anchor="middle" class="sm">→ 마비된 쪽 나중</text>
<text x="210" y="168" text-anchor="middle" class="sm">마비된 팔이 옷에 남아 있어야 안전하게 뺄 수 있다</text>`, '0 0 420 180') };
})();

/** 문항 → 그림 매칭 규칙 (먼저 걸리는 것 하나만 붙인다) */
const MATCH = [
  ['wheelchair-angle', /휠체어.*(위치|각도)|침상에서 휠체어로/],
  ['positions',        /앙와위|측위|반좌위|복위|기본 체위/],
  ['handwash',         /손 ?씻기|손 위생/],
  ['pressure-points',  /욕창.*(부위|호발|예방)|뼈가 돌출/],
  ['heimlich',         /하임리히|복부 밀어내기/],
  ['cpr-point',        /가슴압박 위치|심폐소생술에서 가슴압박/],
  ['perineal',         /회음부/],
  ['lifting',          /들어 올릴 때|무거운 물건/],
  ['meal-posture',     /식사를 도울 때 가장 안전한 자세|턱을 약간 당긴/],
  ['nail-cut',         /손톱|발톱/],
  ['urine-bag',        /소변 주머니/],
  ['dressing',         /상의를 입힐|상의를 벗길|편마비.*옷/],
];

module.exports = { FIGURES, MATCH };
