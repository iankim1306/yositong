/**
 * welfare-probe.cjs — 공공데이터 구인정보 API 사전 조사
 *
 * 실측으로 밝혀진 것 (2026-11-19)
 *  - 포털 화면은 End Point 를 Service2 로 안내하지만 **Service2 는 폐기**다(resultCode=12).
 *    실제로 사는 건 Service1 이다. 코드가 틀린 게 아니라 포털 표기가 앞서 있다.
 *  - 이 API 는 numOfRows / pageNo 를 **무시하고 항상 전체를 돌려준다**.
 *    numOfRows=10 으로 불러도 1,271건이 왔고 p1·p2 응답이 같았다.
 *    → 페이지네이션 불필요. 하루 1회 호출로 전국을 다 받는다(한도 10,000/일 대비 0.01%).
 *  - 마감일 필드는 deadline 이 아니라 **accpClseDe**(접수마감일)다.
 *
 * ⚠️ 인증키는 출력하지 않는다. 길이와 앞 4자만 표시한다.
 * 실행: node _scripts/welfare-probe.cjs
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');

const KEY = (process.env.WELFARE_API_KEY || '').trim();
const OP = 'getFcltByJoInfo';
const HOSTS = [
  ['Service1', 'https://apis.data.go.kr/B554287/sclWlfrFcltInfoInqirService1'],
  ['Service2', 'https://apis.data.go.kr/B554287/sclWlfrFcltInfoInqirService2'],
];
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });

const mask = k => (k ? `${k.length}자 / ${k.slice(0, 4)}…${k.slice(-2)}` : '(비어 있음)');

async function call(base, params) {
  const qs = new URLSearchParams({ serviceKey: KEY, ...params });
  const t0 = Date.now();
  try {
    const res = await fetch(`${base}/${OP}?${qs}`, { signal: AbortSignal.timeout(40000) });
    return { status: res.status, text: await res.text(), ms: Date.now() - t0 };
  } catch (e) {
    return { status: 'ERR', text: String(e.message), ms: Date.now() - t0 };
  }
}

function summarize(text) {
  let p;
  try { p = parser.parse(text); } catch { return { err: 'XML 파싱 실패' }; }
  const body = p?.response?.body;
  const header = p?.response?.header || p?.OpenAPI_ServiceResponse?.cmmMsgHeader;
  let items = body?.items?.item ?? [];
  if (items && !Array.isArray(items)) items = [items];
  return {
    code: header?.resultCode ?? header?.returnReasonCode,
    msg: header?.resultMsg ?? header?.returnAuthMsg ?? header?.errMsg,
    total: body?.totalCount,
    items,
  };
}

(async () => {
  console.log('━━━ 공공데이터 구인정보 API 조사 ━━━');
  console.log('인증키:', mask(KEY));
  if (!KEY) { console.log('❌ .env.local 의 WELFARE_API_KEY 가 비어 있습니다.'); process.exit(1); }
  console.log();

  let live = null;
  for (const [name, base] of HOSTS) {
    const r = await call(base, { numOfRows: '10', pageNo: '1' });
    const s = summarize(r.text);
    const head = `  ${name.padEnd(9)} HTTP ${String(r.status).padEnd(4)} ${String(r.ms).padStart(5)}ms`;
    if (s.err) { console.log(head, '→', s.err); continue; }
    console.log(head, `→ code=${s.code ?? '-'} msg=${s.msg ?? '-'} total=${s.total ?? '-'} items=${s.items.length}`);
    if (!live && s.items.length > 0) live = { name, base };
  }
  if (!live) { console.log('\n❌ 두 엔드포인트 모두 데이터 없음.'); process.exit(1); }
  console.log(`\n✅ 사용 엔드포인트: ${live.name}\n`);

  const r = await call(live.base, { numOfRows: '10000', pageNo: '1' });
  const s1 = summarize(r.text);
  const raw = s1.items;

  const seen = new Set(); const all = [];
  for (const x of raw) {
    const k = String(x.seq ?? x.joinno ?? JSON.stringify(x));
    if (seen.has(k)) continue;
    seen.add(k); all.push(x);
  }
  console.log(`1회 호출 수신 ${raw.length.toLocaleString()}건 → 중복 제거 ${all.length.toLocaleString()}건`);

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const open = all.filter(x => {
    const d = String(x.accpClseDe || '').replace(/[^0-9]/g, '');
    return !d || d >= today;
  });
  console.log(`오늘(${today}) 기준 접수중 ${open.length.toLocaleString()}건 / 마감 ${(all.length - open.length).toLocaleString()}건`);

  const ds = all.map(x => String(x.accpClseDe || '').replace(/[^0-9]/g, '')).filter(Boolean).sort();
  if (ds.length) console.log(`마감일 범위: ${ds[0]} ~ ${ds[ds.length - 1]}`);

  const sgg = {};
  open.forEach(x => {
    const a = String(x.fcltAddr || '').trim().split(/\s+/);
    if (a.length >= 2) { const k = a[0] + ' ' + a[1]; sgg[k] = (sgg[k] || 0) + 1; }
  });
  const sl = Object.entries(sgg).sort((a, b) => b[1] - a[1]);
  console.log(`\n접수중 공고가 퍼진 시군구: ${sl.length}개`);
  console.log('  상위 8:');
  sl.slice(0, 8).forEach(([k, v]) => console.log(`    ${String(v).padStart(4)}  ${k}`));
  console.log(`\n  3건 이상인 시군구: ${sl.filter(([, v]) => v >= 3).length}개`);
  console.log(`  1건 이상인 시군구: ${sl.length}개 (지역페이지 248개 중 ${Math.round(sl.length / 248 * 100)}%)`);

  const x = open[0];
  if (x) {
    console.log('\n샘플 공고:');
    console.log('  시설:', x.fcltNm, '|', x.fcltAddr);
    console.log('  제목:', x.title);
    console.log('  모집:', x.rcrtFld, '| 인원:', x.recruitNops, '| 급여:', x.wageCond);
    console.log('  접수:', x.accpBgnDe, '~', x.accpClseDe, '| 고용형태:', x.emplStle);
    console.log('  링크:', x.urllnk || '(없음)');
  }

  fs.writeFileSync(path.resolve(__dirname, 'welfare-probe-result.json'),
    JSON.stringify({ endpoint: live.name, total: all.length, open: open.length, sigungu: sl.length, topSigungu: sl.slice(0, 20), sample: open.slice(0, 2) }, null, 1), 'utf8');
  console.log('\n✓ 상세: _scripts/welfare-probe-result.json');
})();
