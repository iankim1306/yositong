// 모든 .html 파일에서 옛 그린 토큰을 새 토큰으로 일괄 치환 (멱등)
const fs = require('fs');
const path = require('path');

// 옛 토큰 -> 새 토큰
const replacements = [
  ['#2a5c3f', '#16a34a'],   // accent (어두운 그린 -> 밝은 그린)
  ['#204a32', '#15803d'],   // accent hover/dark
  ['#edf4ef', '#f0fdf4'],   // accent soft
];

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.vercel', '.git', '_scripts']);

function walk(dir, list = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, list);
    else if (name.endsWith('.html')) list.push(full);
  }
  return list;
}

let changed = 0, untouched = 0;
for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
    // 대문자 변형도 처리
    content = content.split(from.toUpperCase()).join(to);
  }
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changed++;
  } else {
    untouched++;
  }
}
console.log(`치환됨: ${changed}, 변경 없음: ${untouched}`);
