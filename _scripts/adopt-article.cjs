/**
 * adopt-article.cjs — 레거시(워드프레스 시절) 글을 articles-data 관리 대상으로 끌어온다.
 *
 * 왜 필요한가 (2026-11-23)
 *   GSC 실측에서 노출은 있는데 클릭이 0인 글은 전부 레거시였다.
 *   레거시는 정적 HTML이라 손을 못 댄다. URL(=순위)은 그대로 두고 내용만 갈아끼운다.
 *
 * 하는 일
 *   1) articles-data.cjs 배열 끝에 새 글 객체 추가 (슬러그는 레거시 그대로)
 *   2) legacy-slugs.json 에서 그 슬러그 제거 (이제 articles-data 가 관리 → 사이트맵 중복 방지)
 *
 * 사용: node _scripts/adopt-article.cjs <레거시-슬러그> <새글.js>
 */
const fs = require('fs');
const path = require('path');

const [slug, srcPath] = process.argv.slice(2);
if (!slug || !srcPath) {
  console.error('사용: node adopt-article.cjs <레거시-슬러그> <새글.js>');
  process.exit(1);
}
const DATA = path.join(__dirname, 'articles-data.cjs');
const LEG = path.join(__dirname, 'legacy-slugs.json');

let text = fs.readFileSync(DATA, 'utf8');
if (text.includes(`slug: '${slug}',`)) {
  console.error('✗ 이미 articles-data 에 있는 슬러그: ' + slug);
  process.exit(1);
}
const fresh = fs.readFileSync(path.resolve(srcPath), 'utf8').trim();
if (!fresh.includes(`slug: '${slug}',`)) {
  console.error('✗ 새 글 파일의 slug 가 인자와 다름: ' + slug);
  process.exit(1);
}
const at = text.lastIndexOf('\n];');
if (at === -1) { console.error('✗ 배열 끝(];)을 못 찾음'); process.exit(1); }
text = text.slice(0, at) + '\n' + fresh.replace(/,$/, '') + ',\n' + text.slice(at + 1);
fs.writeFileSync(DATA, text, 'utf8');
console.log(`✓ articles-data 에 추가: ${slug}`);

const leg = JSON.parse(fs.readFileSync(LEG, 'utf8'));
const before = leg.slugs.length;
leg.slugs = leg.slugs.filter(s => s !== slug);
if (leg.slugs.length !== before) {
  fs.writeFileSync(LEG, JSON.stringify(leg, null, 1) + '\n', 'utf8');
  console.log(`✓ legacy-slugs 에서 제거 (${before} → ${leg.slugs.length})`);
} else {
  console.log('  (legacy-slugs 에 없었음)');
}

// 검증
delete require.cache[require.resolve(DATA)];
const arts = require(DATA);
console.log(`✓ 문법 OK — 총 ${arts.length}편`);
