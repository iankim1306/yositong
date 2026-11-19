/**
 * quiz-to-5choice.cjs — 4지선다 → 5지선다 변환
 *
 * 왜
 *   실제 요양보호사 시험은 5지선다인데 우리 문항은 전부 4지선다였다.
 *   "출제 범위에 맞춘 연습문제"로 내걸었으면 보기 개수는 맞춰야 한다.
 *
 * 어떻게 — 새 보기를 지어내지 않는다
 *   지어낸 보기는 의료 인접 분야에서 틀린 내용을 심을 위험이 크다.
 *   대신 **같은 주제의 다른 문항에 이미 들어 있는 보기**를 빌려 온다.
 *   전부 사람이 쓴 실제 돌봄 문장이라 어색하지 않고, 사실 오류가 새로 생기지 않는다.
 *
 * 안전 규칙 (이게 핵심)
 *   1) 긍정형 문항("올바른 것은?") → **어디에서도 정답인 적 없는 보기**만 빌린다.
 *      정답으로 쓰인 적 있는 문장을 빌리면 정답이 두 개가 될 수 있다.
 *   2) 부정형 문항("옳지 않은 것은?", "피해야 할 것은?") → 반대로 **다른 문항의 정답**을 빌린다.
 *      부정형에서는 '옳은 실무'가 오답이 되므로 이게 논리적으로 안전하다.
 *   3) 정답과 글자가 많이 겹치면(자카드 0.45 초과) 쓰지 않는다. 헷갈리는 중복 방지.
 *   4) 이미 그 문항에 있는 보기와 비슷하면 쓰지 않는다.
 *   5) 길이가 지나치게 튀면(기존 평균의 2배 초과 등) 쓰지 않는다. 정답이 티나지 않게.
 *   6) 문항 해시 시드로 고른다 → 몇 번 돌려도 같은 결과.
 *
 * 실행: node _scripts/quiz-to-5choice.cjs [--dry]
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'quiz', 'data.js');
const DRY = process.argv.includes('--dry');

const NEG = /옳지 않은|않은 것은|아닌 것은|해서는 안|하면 안|잘못된|부적절한|피해야|틀린 것|적절하지 않은/;

const norm = s => String(s).replace(/[^가-힣a-zA-Z0-9]/g, '');
function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 1;
  let inter = 0;
  for (const c of A) if (B.has(c)) inter++;
  return inter / new Set([...A, ...B]).size;
}
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) || 1;
}

const quizData = eval(fs.readFileSync(SRC, 'utf8') + '; quizData');
console.log('━━━ 4지선다 → 5지선다 변환 ━━━');
console.log('입력:', quizData.length, '문항');

const already5 = quizData.filter(q => q.options.length === 5).length;
if (already5) console.log('이미 5지선다:', already5, '문항 (건너뜀)');

// ── 풀 구성 ──
// 🔴 처음에 여기서 사고를 냈다.
//    부정형 문항("피해야 할 것은?")의 정답은 '나쁜 실무'이고 오답은 '좋은 실무'다.
//    이걸 섞어서 풀에 담았더니 정답이 두 개인 문항이 생겼다.
//      - "가장 피해야 할 태도는?" 정답 '일방적 지시' + 추가 '대상자의 선택 제한' → 둘 다 정답
//      - "지켜야 할 원칙은?" 정답 '존엄성 유지' + 추가 '사생활 존중' → 둘 다 정답
//    그래서 좋은 실무 / 나쁜 실무를 문항 방향까지 보고 분리한다.
const isNegQ = q => NEG.test(q.question);

// 좋은 실무 = 긍정형의 정답 ∪ 부정형의 오답
// 나쁜 실무 = 긍정형의 오답 ∪ 부정형의 정답
const goodSet = new Set();
const badSet = new Set();
for (const q of quizData) {
  const neg = isNegQ(q);
  q.options.forEach((o, i) => {
    const correct = i === q.correct;
    const isGood = neg ? !correct : correct;
    (isGood ? goodSet : badSet).add(norm(o));
  });
}
// 양쪽에 다 걸린 문장은 맥락에 따라 옳고 그름이 갈린다는 뜻이다. 위험하니 아예 뺀다.
const ambiguous = new Set([...goodSet].filter(x => badSet.has(x)));
console.log('좋은 실무', goodSet.size, '| 나쁜 실무', badSet.size, '| 양쪽에 걸쳐 제외', ambiguous.size);

const poolBad = {};   // 카테고리 → 나쁜 실무 (긍정형 문항의 오답으로 씀)
const poolGood = {};  // 카테고리 → 좋은 실무 (부정형 문항의 오답으로 씀)
for (const q of quizData) {
  const c = q.category;
  poolBad[c] = poolBad[c] || new Map();
  poolGood[c] = poolGood[c] || new Map();
  const neg = isNegQ(q);
  q.options.forEach((o, i) => {
    const n = norm(o);
    if (ambiguous.has(n)) return;
    const correct = i === q.correct;
    const isGood = neg ? !correct : correct;
    (isGood ? poolGood[c] : poolBad[c]).set(n, o);
  });
}

// ── 손으로 쓴 보기 ──
// 보기가 전문용어(약물명·부위·수치)인 문항은 빌려오면 엉뚱한 게 들어간다.
// 그런 131문항은 _scripts/quiz-manual-options.cjs 에 직접 썼다.
const MANUAL = require('./quiz-manual-options.cjs');
console.log('손으로 쓴 보기:', Object.keys(MANUAL).length, '건');

let converted = 0, skipped = 0;
const failures = [];

for (const q of quizData) {
  if (q.options.length >= 5) continue;

  const isNeg = isNegQ(q);
  // 부정형이면 '좋은 실무'를, 긍정형이면 '나쁜 실무'를 오답으로 넣는다.
  const pool = isNeg ? poolGood[q.category] : poolBad[q.category];
  const correctN = norm(q.options[q.correct]);
  const existing = q.options.map(norm);
  const avgLen = q.options.reduce((s, o) => s + o.length, 0) / q.options.length;

  // 기존 보기의 '형태'를 읽는다. 서술형("~한다") 사이에 명사구를 끼우면 바로 티가 난다.
  const endsStatement = o => /다$|요$|까$/.test(String(o).trim());
  const stmtRatio = q.options.filter(endsStatement).length / q.options.length;
  const wantStatement = stmtRatio >= 0.6;
  const wantNoun = stmtRatio <= 0.2;

  // 주제 적합도. 질문+기존 보기의 글자 뭉치와 얼마나 겹치는지 본다.
  // 느슨하게 잡으면 면도 문항에 "욕창 부위 마사지" 같은 게 끼어든다.
  const contextN = norm(q.question + q.options.join(''));

  // 보기의 '종류'를 맞춘다.
  // 글자 겹침만 보면 "손씻기 최소 권장 시간은?" 보기에 "후두염"이,
  // "가슴압박 위치는?" 보기에 "소화불량"이 들어간다. 짧은 명사형 보기에서 특히 그렇다.
  function typeSig(o) {
    const t = String(o).trim();
    if (/\d/.test(t) && /초|분|시간|회|도|%|℃|cm|kg|개|명|년|월|일/.test(t)) return 'num';
    if (/증$|염$|병$|군$|통$|암$/.test(t)) return 'disease';
    if (/위$|자세$|체위$/.test(t)) return 'posture';
    if (/다$|요$|까$/.test(t)) return 'stmt';
    return 'noun';
  }
  // 기존 보기의 다수 종류
  const sigCount = {};
  q.options.forEach(o => { const g = typeSig(o); sigCount[g] = (sigCount[g] || 0) + 1; });
  const domSig = Object.entries(sigCount).sort((a, b) => b[1] - a[1])[0];
  const needSig = domSig[1] >= q.options.length * 0.75 ? domSig[0] : null; // 3/4 이상 한 종류일 때만 강제

  function collect(minTopic, maxSim) {
    const out = [];
    for (const [n, o] of pool) {
      if (existing.includes(n)) continue;
      if (jaccard(n, correctN) > 0.45) continue;
      if (existing.some(e => jaccard(n, e) > maxSim)) continue;
      if (o.length > avgLen * 1.8 || o.length < Math.max(3, avgLen * 0.4)) continue;
      const isStmt = endsStatement(o);
      if (wantStatement && !isStmt) continue;
      if (wantNoun && isStmt) continue;
      if (needSig && typeSig(o) !== needSig) continue;   // 보기 종류 불일치
      if (jaccard(n, contextN) < minTopic) continue;
      out.push(o);
    }
    return out;
  }

  // 주제 적합도를 높은 기준부터 단계적으로 낮춘다.
  // 한 번에 느슨하게 가면 겉도는 보기가 들어오고, 너무 빡세게만 가면 후보가 없다.
  // 명사형 보기는 전문용어가 많아 글자 겹침이 낮으면 바로 겉돈다
  // ("욕창 부위"에 "헤파린", "석양증후군 시간대"에 "삼킴 곤란").
  // 그래서 명사형은 하한을 두고, 밑으로는 내려가지 않는다. 후보가 없으면 손으로 쓴다.
  const floor = wantNoun ? 0.12 : 0.04;
  let cands = [];
  for (const [topic, sim] of [[0.26, 0.5], [0.20, 0.5], [0.15, 0.55], [floor, 0.6]]) {
    if (topic < floor) break;
    cands = collect(topic, sim);
    if (cands.length) break;
  }

  // 손으로 쓴 보기가 있으면 그걸 쓴다
  if (MANUAL[q.question]) cands = [MANUAL[q.question]];

  if (!cands.length) {
    skipped++;
    failures.push(q.question.slice(0, 50));
    continue;
  }

  // 시드로 고정 선택 → 재실행해도 같은 결과
  let s = hashSeed(q.question);
  const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  cands.sort((a, b) => a.localeCompare(b, 'ko'));
  const picked = cands[Math.floor(rnd() * cands.length)];

  // 정답 텍스트를 기억해 두고, 5개를 섞은 뒤 인덱스를 다시 찾는다
  const correctText = q.options[q.correct];
  const five = [...q.options, picked];
  for (let i = five.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [five[i], five[j]] = [five[j], five[i]];
  }
  q.options = five;
  q.correct = five.indexOf(correctText);
  converted++;
}

console.log('\n변환:', converted, '문항 | 후보 없어 건너뜀:', skipped);
if (failures.length) {
  console.log('\n건너뛴 문항 (손으로 채워야 함):');
  failures.slice(0, 15).forEach(f => console.log('  · ' + f));
  if (failures.length > 15) console.log('  ... 외', failures.length - 15, '건');
}

// 검증
const bad = quizData.filter(q =>
  q.options.length !== 5 ||
  typeof q.correct !== 'number' || q.correct < 0 || q.correct >= q.options.length ||
  new Set(q.options.map(norm)).size !== q.options.length);
console.log('\n검증 — 형식 오류:', bad.length);
if (bad.length) bad.slice(0, 5).forEach(b => console.log('  ✗', b.question.slice(0, 44), '| 보기', b.options.length, '| 정답', b.correct));

const pos = {};
quizData.forEach(q => pos[q.correct] = (pos[q.correct] || 0) + 1);
console.log('정답 위치 분포:');
Object.keys(pos).sort().forEach(k => console.log(`  보기${+k + 1}: ${pos[k]} (${Math.round(pos[k] / quizData.length * 100)}%)`));

if (DRY) {
  console.log('\n[--dry] 파일을 쓰지 않았습니다.');
} else if (bad.length) {
  console.log('\n❌ 형식 오류가 있어 저장하지 않았습니다.');
  process.exit(1);
} else {
  fs.writeFileSync(SRC, 'const quizData = ' + JSON.stringify(quizData, null, 2) + ';\n', 'utf8');
  console.log('\n✓ quiz/data.js 저장');
}
