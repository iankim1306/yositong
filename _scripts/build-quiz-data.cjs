/**
 * build-quiz-data.cjs
 *
 * quiz/data.js 를 다시 만든다.
 *   1) 기존 문항 로드 → 중복 제거
 *   2) Chapter 1~7 → 주제별 카테고리로 재분류
 *      (Chapter 3·4가 내용이 겹쳐 그대로 쓰면 비슷한 페이지끼리 서로 잡아먹는다)
 *   3) _scripts/quiz/add-*.cjs 의 보강 문항 병합
 *   4) 보기 순서를 섞어 정답 위치를 고르게 분산
 *      (기존 데이터는 정답이 보기1~2에 77%, 보기4는 4%뿐이라 찍어도 맞는 문제가 됐다)
 *   5) quiz/data.js 와 _scripts/quiz/quiz.json 출력
 *
 * 실행: node _scripts/build-quiz-data.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'quiz', 'data.js');
const ADD_DIR = path.join(__dirname, 'quiz');

// ── 주제 정의: slug 는 URL, name 은 화면·제목에 쓴다 ──
const TOPICS = [
  { slug: 'move',      name: '이동·체위 변경',       kw: /휠체어|이동|체위|침상|보행|옮길|옮기|낙상|지팡이|보행기|계단|침대|앙와위|측위|반좌위|일으켜/ },
  { slug: 'disease',   name: '노인성 질환',           kw: /뇌졸중|파킨슨|당뇨|고혈압|관절염|골다공증|전립선|백내장|녹내장|폐렴|노화|노인증후군|질환|욕창/ },
  { slug: 'basic',     name: '요양보호 기본·원칙',    kw: null },
  { slug: 'ethics',    name: '직업윤리·인권',         kw: /윤리|인권|학대|비밀|존엄|권리|차별|사생활/ },
  { slug: 'meal',      name: '식사 돕기',             kw: /식사|삼킴|연하|영양|수분 섭취|경관|비위관|음식|섭취를|식이|흡인성 폐렴/ },
  { slug: 'hygiene',   name: '개인위생·목욕',         kw: /목욕|세면|세발|머리감기|구강|칫솔|의치|손발톱|회음부|옷 갈아|의복|침구 정리/ },
  { slug: 'excretion', name: '배설 돕기',             kw: /배설|기저귀|이동변기|유치도뇨|소변|대변|실금|변비|관장|화장실 이용/ },
  { slug: 'dementia',  name: '치매 요양보호',         kw: /치매|인지기능|석양증후군|배회|섬망|반복적인 질문/ },
  { slug: 'emergency', name: '응급처치',              kw: /응급|질식|기도폐쇄|하임리히|심폐소생|자동심장충격|출혈|화상|골절|경련|의식을 잃/ },
  { slug: 'infection', name: '감염 예방',             kw: /감염|손씻기|손 씻기|손 위생|소독|멸균|일회용 장갑|마스크|결핵|독감|노로/ },
  { slug: 'comm',      name: '의사소통',              kw: /의사소통|대화|말벗|경청|비언어|난청|청각장애|언어장애|여가 활동|호칭/ },
  { slug: 'dying',     name: '임종 요양보호',         kw: /임종|호스피스|사후|사별|말기|연명의료/ },
  { slug: 'system',    name: '제도·급여',             kw: /장기요양|등급|급여|수급|제도|보험|신고 의무|기록|법적 지위|부당청구/ },
  { slug: 'selfcare',  name: '요양보호사 건강관리',   kw: /스트레스|근골격|요통|직업병|소진|번아웃|작업 자세|성희롱|산업재해/ },
];
const BY_NAME = Object.fromEntries(TOPICS.map(t => [t.name, t]));

// ── 1) 기존 문항 ──
const existing = eval(fs.readFileSync(SRC, 'utf8') + '; quizData');
const seen = new Set();
const base = [];
for (const q of existing) {
  const k = q.question.replace(/\s+/g, '');
  if (seen.has(k)) continue;
  seen.add(k);
  base.push(q);
}
console.log(`기존 ${existing.length}문항 → 중복 제거 ${base.length}문항`);

// ── 2) 재분류 ──
const ordered = TOPICS.filter(t => t.kw);
function classify(q) {
  const t = q.question + ' ' + (q.options || []).join(' ') + ' ' + (q.explanation || '');
  // 보강 문항은 이미 정확한 주제명을 달고 있으므로 그대로 신뢰한다.
  if (q.category && BY_NAME[q.category]) return q.category;
  const hit = ordered.find(r => r.kw.test(t));
  return hit ? hit.name : '요양보호 기본·원칙';
}
// 재분류 우선순위: 구체적인 주제가 먼저 잡히도록 순서를 바꿔 적용
const PRIORITY = ['임종 요양보호','응급처치','감염 예방','치매 요양보호','배설 돕기','개인위생·목욕',
                  '식사 돕기','의사소통','노인성 질환','이동·체위 변경','제도·급여','요양보호사 건강관리','직업윤리·인권'];
const priorityRules = PRIORITY.map(n => BY_NAME[n]).filter(t => t && t.kw);
function classifyBase(q) {
  // 이미 주제명이 붙어 있으면 그대로 둔다.
  // (빌드를 두 번 돌리면 손으로 지정한 보강 문항의 카테고리를 키워드 추정이 덮어써서
  //  분포가 망가진다 — 빌드는 몇 번을 돌려도 같은 결과여야 한다)
  if (q.category && BY_NAME[q.category]) return q.category;
  const t = q.question + ' ' + (q.options || []).join(' ') + ' ' + (q.explanation || '');
  const hit = priorityRules.find(r => r.kw.test(t));
  return hit ? hit.name : '요양보호 기본·원칙';
}
base.forEach(q => { q.category = classifyBase(q); });

// ── 3) 보강 문항 병합 ──
const addFiles = fs.readdirSync(ADD_DIR).filter(f => /^add-.*\.cjs$/.test(f)).sort();
let added = [];
for (const f of addFiles) {
  const list = require(path.join(ADD_DIR, f));
  console.log(`  + ${f}: ${list.length}문항`);
  added = added.concat(list);
}
// 보강분끼리·기존과의 중복도 제거
const all = [];
const seen2 = new Set();
for (const q of base.concat(added)) {
  const k = q.question.replace(/\s+/g, '');
  if (seen2.has(k)) { console.log('  (중복 제외) ' + q.question.slice(0, 30)); continue; }
  seen2.add(k);
  all.push(q);
}

// ── 3-b) 유사 중복 제거 ──
// 같은 내용을 말만 바꾼 문항이 섞여 있다("...내리막길에서는 왜 뒤로 끌어야 하는가?" 류).
// 문자 집합 자카드 유사도로 걸러 내고, 해설이 더 충실한 쪽을 남긴다.
function normQ(s) { return s.replace(/[^가-힣a-zA-Z0-9]/g, ''); }
function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  let inter = 0; for (const c of A) if (B.has(c)) inter++;
  return inter / new Set([...A, ...B]).size;
}
function nearDuplicate(list) {
  const keep = [];
  const dropped = [];
  for (const q of list) {
    const n = normQ(q.question);
    const hitIdx = keep.findIndex(k => k._n.length && jaccard(n, k._n) > 0.82);
    if (hitIdx === -1) { q._n = n; keep.push(q); continue; }
    const kept = keep[hitIdx];
    // 해설이 더 긴(설명이 충실한) 쪽을 남긴다
    if ((q.explanation || '').length > (kept.explanation || '').length) {
      q._n = n; dropped.push(kept.question); keep[hitIdx] = q;
    } else {
      dropped.push(q.question);
    }
  }
  keep.forEach(q => delete q._n);
  return { keep, dropped };
}
{
  const before = all.length;
  const r = nearDuplicate(all);
  all.length = 0; Array.prototype.push.apply(all, r.keep);
  console.log(`
유사 중복 제거: ${before} → ${all.length} (${r.dropped.length}문항 제외)`);
  r.dropped.slice(0, 6).forEach(d => console.log('  - ' + d.slice(0, 44)));
}

// ── 4) 보기 섞기 ──
// 기존 데이터는 정답이 보기1~2에 77%, 보기4는 4%뿐이라 2번만 찍어도 43%가 맞았다.
// 문항 내용에서 뽑은 해시를 시드로 써서, 빌드를 몇 번 돌려도 같은 배치가 나오게 한다.
// (전역 시드 하나로 돌리면 이미 섞인 보기를 또 섞어 분포가 다시 쏠린다)
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) || 1;
}
for (const q of all) {
  const correctText = q.options[q.correct];
  // 입력 순서에 영향받지 않도록 먼저 사전순으로 세운다 → 같은 문항이면 항상 같은 결과
  const opts = q.options.slice().sort((a, b) => a.localeCompare(b, 'ko'));
  // mulberry32: 비트를 충분히 섞는다.
  // (glibc 류 LCG 는 하위 비트가 뭉쳐서, 보기가 5개로 늘자 정답이 보기5에 15%만 갔다 —
  //  5개 균등이면 20% 여야 한다. 시드 하나로 한 번만 뽑으니 편향이 그대로 드러난 것)
  let s2 = hashSeed(q.question);
  const rnd2 = () => {
    s2 = (s2 + 0x6D2B79F5) >>> 0;
    let t = s2;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(rnd2() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  q.options = opts;
  q.correct = opts.indexOf(correctText);
}

// ── 5) 출력 ──
const byCat = {};
all.forEach(q => (byCat[q.category] = byCat[q.category] || []).push(q));

console.log('\n최종 분포:');
TOPICS.forEach(t => {
  const n = (byCat[t.name] || []).length;
  console.log(`  ${String(n).padStart(4)}  ${t.name}  (/quiz/${t.slug}/)`);
});
console.log(`  ${String(all.length).padStart(4)}  합계`);

const pos = {};
all.forEach(q => pos[q.correct] = (pos[q.correct] || 0) + 1);
console.log('\n정답 위치 분포:');
Object.keys(pos).sort().forEach(k => {
  console.log(`  보기${+k + 1}: ${pos[k]} (${Math.round(pos[k] / all.length * 100)}%)`);
});

const js = 'const quizData = ' + JSON.stringify(all, null, 2) + ';\n';
fs.writeFileSync(SRC, js, 'utf8');
fs.writeFileSync(path.join(ADD_DIR, 'quiz.json'),
  JSON.stringify({ topics: TOPICS.map(t => ({ ...t, kw: undefined })), questions: all }, null, 1), 'utf8');
console.log('\n✓ quiz/data.js 재생성 (' + all.length + '문항)');
console.log('✓ _scripts/quiz/quiz.json 저장');
