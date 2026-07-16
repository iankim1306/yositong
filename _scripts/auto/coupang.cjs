// ============================================================
// coupang.cjs — 쿠팡파트너스 Open API 클라이언트 (검색 + 딥링크)
// 인증키: info-how/.env.local (COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY)
//
// CLI 테스트:
//   node _scripts/auto/coupang.cjs search "휴대용 선풍기"
//   node _scripts/auto/coupang.cjs pick   "휴대용 선풍기"   ← 가성비/베스트/프리미엄 3개 자동선정
// ============================================================
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const API = 'https://api-gateway.coupang.com';

// .env.local 로드
function loadEnv() {
  const p = path.join(ROOT, '.env.local');
  if (!fs.existsSync(p)) throw new Error('.env.local 없음 — 쿠팡 API 키 필요');
  const env = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  if (!env.COUPANG_ACCESS_KEY || !env.COUPANG_SECRET_KEY) throw new Error('쿠팡 키 누락');
  return env;
}

// HMAC-SHA256 서명 (threads_auto core/coupang.py와 동일 방식)
function authHeader(method, pathWithQuery, env) {
  const [p, q = ''] = pathWithQuery.split('?');
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const signedDate = `${String(d.getUTCFullYear()).slice(2)}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const message = signedDate + method + p + q;
  const signature = crypto.createHmac('sha256', env.COUPANG_SECRET_KEY).update(message).digest('hex');
  return `CEA algorithm=HmacSHA256, access-key=${env.COUPANG_ACCESS_KEY}, signed-date=${signedDate}, signature=${signature}`;
}

async function call(method, pathWithQuery, body) {
  const env = loadEnv();
  const res = await fetch(API + pathWithQuery, {
    method,
    headers: {
      'Authorization': authHeader(method, pathWithQuery, env),
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`응답 파싱 실패 (${res.status}): ${text.slice(0,200)}`); }
  if (res.status === 401) throw new Error(`인증 실패(401): 키 확인 필요 — ${text.slice(0,200)}`);
  if (!res.ok) throw new Error(`API 오류(${res.status}): ${text.slice(0,300)}`);
  return json;
}

// 상품 검색 — 트래킹 URL(productUrl)·이미지·가격이 바로 옴
// ⚠️ 쿠팡 search API는 limit>10 을 "out of range"로 거부 → 10으로 클램프
async function search(keyword, limit = 10) {
  limit = Math.min(Math.max(1, limit | 0), 10);
  const q = `/v2/providers/affiliate_open_api/apis/openapi/products/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
  const r = await call('GET', q);
  if (r.rCode !== '0') throw new Error(`검색 실패: ${r.rMessage || JSON.stringify(r).slice(0,200)}`);
  return (r.data && r.data.productData) || [];
}

// 딥링크 생성 (임의 쿠팡 URL → 파트너스 단축링크)
async function deeplink(urls) {
  const r = await call('POST', '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink', { coupangUrls: urls });
  if (r.rCode !== '0') throw new Error(`딥링크 실패: ${r.rMessage}`);
  return r.data; // [{originalUrl, shortenUrl, landingUrl}]
}

// 검색 결과에서 가성비/베스트/프리미엄 3개 자동 선정
function pick3(items) {
  const ok = items.filter(p => p.productPrice > 0);
  if (ok.length < 3) return ok;
  const sorted = [...ok].sort((a, b) => a.productPrice - b.productPrice);
  const cheap = sorted[0];                                   // 최저가 = 가성비
  const mid   = sorted[Math.floor(sorted.length / 2)];       // 중간값 = 베스트
  const high  = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.85))]; // 상위 = 프리미엄
  const uniq = [];
  for (const p of [cheap, mid, high]) if (!uniq.find(x => x.productId === p.productId)) uniq.push(p);
  let i = 0;
  while (uniq.length < 3 && i < sorted.length) {
    if (!uniq.find(x => x.productId === sorted[i].productId)) uniq.push(sorted[i]);
    i++;
  }
  return uniq;
}

// 이미지 다운로드 → reviews/{slug}/img/
async function downloadImage(url, destDir, filename) {
  fs.mkdirSync(destDir, { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`이미지 다운로드 실패: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const dest = path.join(destDir, filename);
  fs.writeFileSync(dest, buf);
  return dest;
}

module.exports = { search, deeplink, pick3, downloadImage };

// ── CLI ──
if (require.main === module) {
  const [cmd, kw] = process.argv.slice(2);
  (async () => {
    if (cmd === 'search') {
      const items = await search(kw, 10);
      for (const p of items) {
        console.log(`- ${p.productName}\n  가격 ${p.productPrice.toLocaleString()}원 | 로켓:${p.isRocket?'O':'X'} | id:${p.productId}\n  img: ${p.productImage}\n  url: ${p.productUrl}\n`);
      }
      console.log(`총 ${items.length}개`);
    } else if (cmd === 'pick') {
      const items = await search(kw, 20);
      const picks = pick3(items);
      picks.forEach((p, i) => {
        const tags = ['가성비', '베스트', '프리미엄'];
        console.log(`[${tags[i]}] ${p.productName}\n  ${p.productPrice.toLocaleString()}원 | 로켓:${p.isRocket?'O':'X'}\n  ${p.productUrl}\n`);
      });
    } else {
      console.log('사용: node coupang.cjs search "키워드" | pick "키워드"');
    }
  })().catch(e => { console.error('X', e.message); process.exit(1); });
}
