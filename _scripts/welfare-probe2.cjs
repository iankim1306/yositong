/**
 * welfare-probe2.cjs — 모집분야 분석
 *
 * probe1 에서 확인: 전국 접수중 203건(중복 제거 후).
 * 그런데 이건 사회복지시설 "전체" 구인이다. 샘플이 "장애인요양원 관리인"이었다.
 * 요양보호사 공고가 그중 몇 건인지가 이 기능의 생사를 가른다.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
const { XMLParser } = require('fast-xml-parser');

const KEY = (process.env.WELFARE_API_KEY || '').trim();
const URL_ = 'https://apis.data.go.kr/B554287/sclWlfrFcltInfoInqirService1/getFcltByJoInfo';
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });

(async () => {
  const res = await fetch(`${URL_}?serviceKey=${encodeURIComponent(KEY)}&numOfRows=10000&pageNo=1`, { signal: AbortSignal.timeout(40000) });
  const p = parser.parse(await res.text());
  let items = p?.response?.body?.items?.item ?? [];
  if (!Array.isArray(items)) items = [items];

  const seen = new Set(); const all = [];
  for (const x of items) { const k = String(x.seq ?? JSON.stringify(x)); if (seen.has(k)) continue; seen.add(k); all.push(x); }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const open = all.filter(x => { const d = String(x.accpClseDe || '').replace(/[^0-9]/g, ''); return !d || d >= today; });
  console.log(`접수중 ${open.length}건 기준 분석\n`);

  // 모집분야 분포
  const fld = {};
  open.forEach(x => { const k = String(x.rcrtFld || '(없음)').trim(); fld[k] = (fld[k] || 0) + 1; });
  console.log('모집분야(rcrtFld) 분포:');
  Object.entries(fld).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));

  // 요양보호사 관련 필터 — 제목·모집분야·직무내용·자격에서 찾는다
  const RE = /요양보호사|요양보호|간병|생활지원사|노인맞춤돌봄/;
  const care = open.filter(x => RE.test([x.title, x.rcrtFld, x.dtyCntn, x.applyQlfc, x.relateJssfc].join(' ')));
  console.log(`\n🔑 요양보호사 관련 공고: ${care.length}건 / ${open.length}건 (${Math.round(care.length / open.length * 100)}%)`);

  const sgg = {};
  care.forEach(x => { const a = String(x.fcltAddr || '').trim().split(/\s+/); if (a.length >= 2) { const k = a[0] + ' ' + a[1]; sgg[k] = (sgg[k] || 0) + 1; } });
  const sl = Object.entries(sgg).sort((a, b) => b[1] - a[1]);
  console.log(`  퍼진 시군구: ${sl.length}개 (248개 중 ${Math.round(sl.length / 248 * 100)}%)`);
  console.log('  상위 6:', sl.slice(0, 6).map(([k, v]) => `${k}(${v})`).join(', '));

  // 시설 종류 분포 (요양 시설인가)
  const fac = {};
  open.forEach(x => {
    const n = String(x.fcltNm || '');
    const k = /요양원|요양센터|요양병원|노인/.test(n) ? '노인·요양 시설'
      : /장애|재활/.test(n) ? '장애인 시설'
        : /어린이집|아동|청소년/.test(n) ? '아동·청소년'
          : /복지관|복지센터/.test(n) ? '복지관' : '기타';
    fac[k] = (fac[k] || 0) + 1;
  });
  console.log('\n시설 종류 분포:');
  Object.entries(fac).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));

  if (care[0]) {
    console.log('\n요양보호사 공고 샘플 3건:');
    care.slice(0, 3).forEach(x => {
      console.log(`  · ${x.fcltNm} (${String(x.fcltAddr || '').split(/\s+/).slice(0, 2).join(' ')})`);
      console.log(`    ${x.title} | ${x.wageCond || '급여 미기재'} | ~${x.accpClseDe}`);
    });
  }
})();
