/**
 * replace-article.cjs — articles-data.cjs 안의 글 하나를 통째로 갈아끼운다.
 *
 * 왜 스크립트인가: 글 하나가 60~120줄이라 손으로 범위를 잡다가 중괄호를
 * 하나 흘리면 파일 전체가 깨진다. slug 로 찾아 객체 경계를 기계가 세게 한다.
 *
 * 사용: node _scripts/replace-article.cjs <slug> <새글.js 경로>
 *   새글 파일은 `{ ... },` 형태의 객체 리터럴 하나만 들어 있어야 한다.
 */
const fs = require('fs');
const path = require('path');

const [slug, srcPath] = process.argv.slice(2);
if (!slug || !srcPath) { console.error('사용: node replace-article.cjs <slug> <새글.js>'); process.exit(1); }

const TARGET = path.resolve(__dirname, 'articles-data.cjs');
const text = fs.readFileSync(TARGET, 'utf8');
const fresh = fs.readFileSync(path.resolve(srcPath), 'utf8').trim();

// 1) slug 줄 찾기
const needle = `slug: '${slug}',`;
const at = text.indexOf(needle);
if (at === -1) { console.error(`✗ slug 를 못 찾음: ${slug}`); process.exit(1); }

// 2) 그 앞에서 객체를 여는 `{` 찾기 (줄 맨 앞의 `{`)
let open = text.lastIndexOf('\n{', at);
if (open === -1) { console.error('✗ 객체 시작을 못 찾음'); process.exit(1); }
open += 1; // 개행 다음

// 3) 중괄호를 세어 닫는 지점 찾기. 문자열 안의 괄호는 세지 않는다.
let depth = 0, i = open, close = -1;
let quote = null, esc = false;
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
if (close === -1) { console.error('✗ 객체 끝을 못 찾음 — 중괄호가 안 맞는다'); process.exit(1); }
// 뒤따르는 쉼표까지 삼킨다
let end = close + 1;
if (text[end] === ',') end++;

const before = text.slice(0, open);
const after = text.slice(end);
const out = before + fresh.replace(/,$/, '') + ',' + after;
fs.writeFileSync(TARGET, out, 'utf8');

// 4) 바로 문법 검사 — 깨진 채로 커밋되는 걸 막는다
delete require.cache[require.resolve(TARGET)];
const list = require(TARGET);
const got = list.find(a => a.slug === slug);
if (!got) { console.error('✗ 교체 후 글이 사라졌다'); process.exit(1); }
const len = got.blocks.map(b => Object.values(b).flat().filter(v => typeof v === 'string').join('')).join('').replace(/<[^>]+>/g, '').length;
console.log(`✓ ${slug} 교체 — ${list.length}편 유지, ${got.blocks.length}블록, 본문 약 ${len}자`);
console.log(`  제목: ${got.title}`);
