/**
 * merge-article.cjs — 중복 글 둘을 승자 URL 하나로 합친다.
 *
 * 왜 필요한가 (2026-11-23)
 *   워드프레스 시절 레거시 글과 내가 새로 쓴 글이 같은 주제를 두고 경쟁하고 있었다.
 *   GSC 실측: 레거시 `요양보호사-시험-난이도-어렵나요` 607노출 / 새 글은 노출 미미.
 *   좋은 내용은 새 글에, 순위는 레거시에 있었다. **순위를 가진 URL로 내용을 옮긴다.**
 *
 * 하는 일
 *   1) articles-data.cjs 의 <loser> 글 객체를 <새 글 파일> 내용으로 교체(슬러그가 바뀐다)
 *   2) legacy-slugs.json 에서 승자 슬러그 제거(이제 articles-data 가 관리하므로 중복 방지)
 *   3) 사이트 전체의 <loser> 내부링크를 승자로 교체
 *   4) vercel.json 에 308 리다이렉트 추가
 *   5) <loser> 폴더 삭제
 *
 * 사용: node _scripts/merge-article.cjs <loser-slug> <winner-slug> <새글.js>
 */
const fs = require('fs');
const path = require('path');

const [loser, winner, srcPath] = process.argv.slice(2);
if (!loser || !winner || !srcPath) {
  console.error('사용: node merge-article.cjs <loser-slug> <winner-slug> <새글.js>');
  process.exit(1);
}
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(__dirname, 'articles-data.cjs');

// ── 1) articles-data 교체 ──
let text = fs.readFileSync(DATA, 'utf8');
const fresh = fs.readFileSync(path.resolve(srcPath), 'utf8').trim();
const needle = `slug: '${loser}',`;
const at = text.indexOf(needle);
if (at === -1) { console.error('✗ loser 슬러그를 못 찾음: ' + loser); process.exit(1); }
let open = text.lastIndexOf('\n{', at);
if (open === -1) { console.error('✗ 객체 시작을 못 찾음'); process.exit(1); }
open += 1;
let depth = 0, i = open, close = -1, quote = null, esc = false;
for (; i < text.length; i++) {
  const c = text[i];
  if (quote) {
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === quote) quote = null;
    continue;
  }
  if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) { close = i; break; } }
}
if (close === -1) { console.error('✗ 객체 끝을 못 찾음'); process.exit(1); }
let end = close + 1;
if (text[end] === ',') end++;
fs.writeFileSync(DATA, text.slice(0, open) + fresh.replace(/,$/, '') + ',' + text.slice(end), 'utf8');
console.log(`✓ articles-data: ${loser} → ${winner} 로 교체`);

// ── 2) legacy-slugs 에서 승자 제거 ──
const LEG = path.join(__dirname, 'legacy-slugs.json');
const leg = JSON.parse(fs.readFileSync(LEG, 'utf8'));
const before = leg.slugs.length;
leg.slugs = leg.slugs.filter(s => s !== winner);
if (leg.slugs.length !== before) {
  fs.writeFileSync(LEG, JSON.stringify(leg, null, 1), 'utf8');
  console.log(`✓ legacy-slugs: ${winner} 제거 (${before} → ${leg.slugs.length}) — 이제 articles-data 가 관리`);
}

// ── 3) 내부링크 교체 ──
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.vercel', 'out'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(html|cjs|js|json)$/.test(e.name)) out.push(p);
  }
  return out;
}
let linkFixed = 0;
for (const f of walk(ROOT)) {
  if (f.endsWith('legacy-slugs.json') || f.includes('merge-article')) continue;
  const s = fs.readFileSync(f, 'utf8');
  if (!s.includes(loser)) continue;
  const o = s.split(loser).join(winner);
  if (o !== s) { fs.writeFileSync(f, o, 'utf8'); linkFixed++; }
}
console.log(`✓ 내부링크 교체 — ${linkFixed}개 파일`);

// ── 4) vercel.json 리다이렉트 ──
const VJ = path.join(ROOT, 'vercel.json');
const vj = JSON.parse(fs.readFileSync(VJ, 'utf8'));
vj.redirects = vj.redirects || [];
// Vercel 은 요청 경로를 퍼센트 인코딩된 상태로 비교한다.
// source 에 한글을 날것으로 넣으면 영원히 매칭이 안 되고 404 가 난다(2026-11-23 실측).
const encPath = s => '/' + encodeURIComponent(String(s).replace(/^\//, ''));
const src = encPath(loser);
const dst = encPath(winner);
if (!vj.redirects.some(r => r.source === src)) {
  vj.redirects.push({ source: src, destination: dst, permanent: true });
  fs.writeFileSync(VJ, JSON.stringify(vj, null, 2) + '\n', 'utf8');
  console.log(`✓ vercel.json 308 리다이렉트: ${src} → /${winner}`);
} else {
  console.log('  (리다이렉트 이미 있음)');
}

// ── 5) loser 폴더 삭제 ──
const dir = path.join(ROOT, loser);
if (fs.existsSync(dir)) {
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`✓ 폴더 삭제: /${loser}`);
}
