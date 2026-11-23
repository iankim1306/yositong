/**
 * inject-google-verification.cjs — 구글 서치콘솔 소유확인 메타 태그를 전 페이지에 넣는다.
 *
 * 🔴 왜 HTML 파일 방식을 안 쓰는가
 *   Vercel cleanUrls 가 .html 을 떼고 308 로 튕긴다(실측:
 *   /google7f97ec1b2217fdff.html → 308 → /google7f97ec1b2217fdff).
 *   그래서 구글이 권장하는 HTML 파일 업로드는 이 사이트에서 무조건 실패한다.
 *   네이버 서치어드바이저 때 똑같은 이유로 실패했던 함정이다.
 *   → 메타 태그 방식만 쓴다.
 *
 * 멱등하다. 이미 태그가 있는 파일은 건너뛴다.
 * 실행: node _scripts/inject-google-verification.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TAG = '<meta name="google-site-verification" content="AdSJSnhdDNb6-WjWRbwJnLZmjcQASaWJbDRN36i4DXk" />';
const MARK = 'google-site-verification';

// 네이버 태그 바로 뒤에 붙이는 게 1순위. 없으면 viewport, 그것도 없으면 charset 뒤.
const ANCHORS = [
  /<meta name="naver-site-verification"[^>]*\/?>\s*(?![\s\S]{0,200}naver-site-verification)/,
  /<meta name="viewport"[^>]*\/?>/,
  /<meta charset=["'][^"']*["']\s*\/?>/i,
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name.startsWith('_scripts')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
let added = 0, already = 0, skipped = [];

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes(MARK)) { already++; continue; }
  if (!/<head[\s>]/i.test(s)) { skipped.push(path.relative(ROOT, f) + ' (head 없음)'); continue; }

  let done = false;
  for (const re of ANCHORS) {
    const m = s.match(re);
    if (!m) continue;
    const at = m.index + m[0].length;
    s = s.slice(0, at) + '\n' + TAG + s.slice(at);
    done = true;
    break;
  }
  if (!done) {
    // 마지막 수단: <head> 바로 뒤
    s = s.replace(/<head([^>]*)>/i, (mm, attrs) => `<head${attrs}>\n${TAG}`);
    done = true;
  }
  fs.writeFileSync(f, s, 'utf8');
  added++;
}

console.log(`✓ 구글 소유확인 메타 주입`);
console.log(`  추가 ${added}개 / 이미 있음 ${already}개 / 전체 ${files.length}개`);
if (skipped.length) {
  console.log(`  건너뜀 ${skipped.length}개:`);
  skipped.slice(0, 10).forEach(x => console.log('    - ' + x));
}
