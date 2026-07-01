// 정보글 폴더(한글 슬러그)의 본문 끝에 내부 링크 CTA 박스 일괄 주입 (멱등)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MARKER = 'data-cta="internal"';

const CTA_BLOCK = `
<section class="cta-internal" data-cta="internal" style="margin:48px 0 32px;padding:28px;background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border-radius:14px;border:1px solid #bbf7d0;text-align:center;">
  <h3 style="font-size:18px;font-weight:800;margin:0 0 8px;color:#0f172a;">실전 정보 더 찾아보세요</h3>
  <p style="margin:0 0 18px;color:#475569;font-size:15px;">전국 31,000개 시설 디렉토리 + 실시간 채용공고 + 무료 기출문제 588</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
    <a href="/jobs/" style="background:#16a34a;color:#fff;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px;">전국 채용 검색 →</a>
    <a href="/regions/seoul/" style="background:#fff;color:#16a34a;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px;border:1px solid #16a34a;">시설 디렉토리 →</a>
    <a href="/quiz/" style="background:#fff;color:#16a34a;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px;border:1px solid #16a34a;">기출문제 풀이 →</a>
    <a href="/faq/" style="background:#fff;color:#16a34a;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px;border:1px solid #16a34a;">FAQ 보기 →</a>
  </div>
</section>
`;

// 한글 슬러그 정보글 폴더만 (요양보호사-* 또는 2025-* 또는 숫자/한글 시작)
function isArticleFolder(name) {
  if (name.startsWith('요양보호사') || name.startsWith('2025')) return true;
  return false;
}

function walk(dir, list = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && isArticleFolder(name)) {
      const idx = path.join(full, 'index.html');
      if (fs.existsSync(idx)) list.push(idx);
    }
  }
  return list;
}

let inserted = 0, alreadyHas = 0, noFooter = 0;
for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(MARKER)) { alreadyHas++; continue; }
  // </footer> 또는 </main> 또는 </body> 직전에 삽입
  if (content.includes('<footer')) {
    content = content.replace(/(<footer)/, CTA_BLOCK + '$1');
    inserted++;
  } else if (content.includes('</body>')) {
    content = content.replace('</body>', CTA_BLOCK + '</body>');
    inserted++;
  } else {
    noFooter++;
    continue;
  }
  fs.writeFileSync(file, content, 'utf8');
}
console.log(`주입: ${inserted}, 이미 있음: ${alreadyHas}, 푸터 없음: ${noFooter}`);
