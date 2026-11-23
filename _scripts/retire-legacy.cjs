/**
 * retire-legacy.cjs — 레거시 글 하나를 통째로 접고 다른 글로 308 리다이렉트한다.
 *
 * 왜 필요한가 (2026-11-23)
 *   GSC 실측에서 같은 주제를 두고 레거시 여러 편이 서로 순위를 갉아먹고 있었다.
 *   (예: "국비지원" 3파전 — 레거시 2편 전부 클릭 0, 새 글은 노출 미미)
 *   클릭이 0이면 URL을 지켜 봐야 얻을 게 없다. 노출만 승자 URL로 넘긴다.
 *
 *   merge-article.cjs 와 다른 점: 저쪽은 '레거시 URL을 살리고 내용을 옮기는' 쪽,
 *   이쪽은 '레거시 URL을 버리고 다른 글로 합치는' 쪽이다.
 *
 * 하는 일
 *   1) legacy-slugs.json 에서 제거 (사이트맵에서 빠진다)
 *   2) 사이트 전체의 내부링크를 승자로 교체
 *   3) vercel.json 에 308 리다이렉트 추가
 *   4) 레거시 폴더 삭제
 *
 * 사용: node _scripts/retire-legacy.cjs <버릴-슬러그> <승자-슬러그>
 */
const fs = require('fs');
const path = require('path');

const [loser, winner] = process.argv.slice(2);
if (!loser || !winner) {
  console.error('사용: node retire-legacy.cjs <버릴-슬러그> <승자-슬러그>');
  process.exit(1);
}
const ROOT = path.resolve(__dirname, '..');

// 승자가 실제로 존재하는지 (articles-data 또는 legacy) 확인 — 404 로 보내는 사고 방지
const data = fs.readFileSync(path.join(__dirname, 'articles-data.cjs'), 'utf8');
const LEGP = path.join(__dirname, 'legacy-slugs.json');
const leg = JSON.parse(fs.readFileSync(LEGP, 'utf8'));
if (!data.includes(`slug: '${winner}',`) && !leg.slugs.includes(winner)) {
  console.error('✗ 승자 슬러그를 articles-data 에서도 legacy 에서도 못 찾음: ' + winner);
  process.exit(1);
}
if (loser === winner) { console.error('✗ loser 와 winner 가 같음'); process.exit(1); }

// ── 1) legacy-slugs 에서 제거 ──
const before = leg.slugs.length;
leg.slugs = leg.slugs.filter(s => s !== loser);
if (leg.slugs.length === before) {
  console.log('  (legacy-slugs 에 없었음 — 계속 진행)');
} else {
  fs.writeFileSync(LEGP, JSON.stringify(leg, null, 1) + '\n', 'utf8');
  console.log(`✓ legacy-slugs 에서 제거 (${before} → ${leg.slugs.length})`);
}

// ── 2) 내부링크 교체 ──
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.vercel', 'out'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== loser) walk(p, out); }
    else if (/\.(html|cjs|js|json)$/.test(e.name)) out.push(p);
  }
  return out;
}
let linkFixed = 0;
for (const f of walk(ROOT)) {
  if (f.endsWith('legacy-slugs.json') || /retire-legacy|merge-article/.test(f)) continue;
  const s = fs.readFileSync(f, 'utf8');
  if (!s.includes(loser)) continue;
  const o = s.split(loser).join(winner);
  if (o !== s) { fs.writeFileSync(f, o, 'utf8'); linkFixed++; }
}
console.log(`✓ 내부링크 교체 — ${linkFixed}개 파일`);

// ── 3) vercel.json 308 ──
const VJ = path.join(ROOT, 'vercel.json');
const vj = JSON.parse(fs.readFileSync(VJ, 'utf8'));
vj.redirects = vj.redirects || [];
const src = '/' + loser;
// 승자가 다시 접히는 경우(체인) 방지: 기존 리다이렉트의 목적지가 loser 면 함께 갱신
for (const r of vj.redirects) {
  if (r.destination === src) { r.destination = '/' + winner; console.log(`  체인 정리: ${r.source} → /${winner}`); }
}
if (!vj.redirects.some(r => r.source === src)) {
  vj.redirects.push({ source: src, destination: '/' + winner, permanent: true });
  fs.writeFileSync(VJ, JSON.stringify(vj, null, 2) + '\n', 'utf8');
  console.log(`✓ vercel.json 308: ${src} → /${winner}`);
} else {
  fs.writeFileSync(VJ, JSON.stringify(vj, null, 2) + '\n', 'utf8');
  console.log('  (리다이렉트 이미 있음)');
}

// ── 4) 폴더 삭제 ──
const dir = path.join(ROOT, loser);
if (fs.existsSync(dir)) {
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`✓ 폴더 삭제: /${loser}`);
} else {
  console.log(`  (폴더 없음: /${loser})`);
}
