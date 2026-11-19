/**
 * fetch-welfare.cjs — 구인공고 수집 (빌드 때 1회)
 *
 * 데이터: 한국사회보장정보원 사회복지시설정보서비스 (data.go.kr 15001848)
 *        이용허락범위 "제한 없음" = 상업 이용 가능.
 *        ⚠️ 워크넷 채용정보 API(3038225)는 공공누리 제4유형(상업 금지)이라 못 쓴다.
 *
 * 실측으로 알아낸 것 (2026-11-19)
 *  - End Point 는 Service1. 포털 화면은 Service2 로 안내하지만 Service2 는 폐기(resultCode=12).
 *  - numOfRows / pageNo 를 무시하고 항상 전체를 돌려준다 → 1회 호출로 끝. 페이지네이션 불필요.
 *  - 같은 공고가 6~7번 중복으로 온다 → seq 기준 중복 제거 필수(1,271 → 203).
 *  - 마감일 필드는 deadline 이 아니라 accpClseDe.
 *  - 사회복지시설 "전체" 구인이라 요양보호사 공고는 그중 일부(약 14%).
 *
 * 비용: 호출 1건/일. 포털 한도 10,000건/일 대비 0.01%. Vercel 함수 호출 0(빌드 때만 실행).
 *
 * 실행: node _scripts/fetch-welfare.cjs
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const KEY = (process.env.WELFARE_API_KEY || '').trim();
const URL_ = 'https://apis.data.go.kr/B554287/sclWlfrFcltInfoInqirService1/getFcltByJoInfo';

// 요양보호사 관련 공고 판별
const CARE_RE = /요양보호사|요양보호|간병|생활지원사|노인맞춤돌봄|노인돌봄/;

const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });


// 급여 필드는 "● 임금형태 : 월급 / ● 임금형태 : 0 ~" 처럼 원시 입력이 그대로 들어온다.
// 금액이 없는 껍데기면 버리고, 쓸 만한 것만 남긴다. 빈 값이면 화면에서 그 줄을 아예 안 그린다.
function cleanWage(raw) {
  let t = String(raw || '')
    .replace(/[●○▶·]/g, ' ')
    .replace(/임금형태\s*:?/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*[/|]\s*/g, ' / ')
    .trim()
    .replace(/^[/\s]+|[/\s~-]+$/g, '')
    .trim();
  // 숫자가 0 뿐이거나 금액이 전혀 없으면 의미 없는 값으로 본다
  const nums = t.match(/\d[\d,]*/g) || [];
  const meaningful = nums.some(n => Number(n.replace(/,/g, '')) > 0);
  if (!meaningful) {
    // "월급", "시급" 같은 형태 표기만 남아 있으면 그것만 살린다
    const form = t.match(/(월급|시급|연봉|일급|주급)/);
    return form ? `${form[1]} (면접 후 결정)` : '';
  }
  return t.length > 70 ? t.slice(0, 70) + '…' : t;
}

function sidoNorm(s) {
  const M = {
    '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구', '인천광역시': '인천',
    '광주광역시': '광주', '대전광역시': '대전', '울산광역시': '울산', '세종특별자치시': '세종',
    '경기도': '경기', '강원도': '강원', '강원특별자치도': '강원', '충청북도': '충북',
    '충청남도': '충남', '전라북도': '전북', '전북특별자치도': '전북', '전라남도': '전남',
    '전남광주통합특별시': '광주', '경상북도': '경북', '경상남도': '경남',
    '제주특별자치도': '제주', '제주도': '제주',
  };
  return M[s] || s;
}

(async () => {
  console.log('━━━ 구인공고 수집 ━━━');
  if (!KEY) { console.error('❌ WELFARE_API_KEY 없음'); process.exit(1); }

  const res = await fetch(`${URL_}?serviceKey=${encodeURIComponent(KEY)}&numOfRows=10000&pageNo=1`,
    { signal: AbortSignal.timeout(60000) });
  if (!res.ok) { console.error('❌ HTTP', res.status); process.exit(1); }
  const parsed = parser.parse(await res.text());
  const code = parsed?.response?.header?.resultCode;
  if (code !== '00') {
    console.error('❌ API 오류:', code, parsed?.response?.header?.resultMsg);
    process.exit(1);
  }
  let items = parsed?.response?.body?.items?.item ?? [];
  if (!Array.isArray(items)) items = [items];
  console.log(`수신 ${items.length.toLocaleString()}건`);

  // 중복 제거
  const seen = new Set();
  const uniq = [];
  for (const x of items) {
    const k = String(x.seq ?? x.joinno ?? JSON.stringify(x));
    if (seen.has(k)) continue;
    seen.add(k); uniq.push(x);
  }
  console.log(`중복 제거 ${uniq.length.toLocaleString()}건`);

  // 마감 안 지난 것만
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const open = uniq.filter(x => {
    const d = String(x.accpClseDe || '').replace(/[^0-9]/g, '');
    return !d || d >= today;
  });
  console.log(`접수중 ${open.length.toLocaleString()}건`);

  // 정규화
  const jobs = open.map(x => {
    const addr = String(x.fcltAddr || '').trim();
    const tok = addr.split(/\s+/);
    const sido = sidoNorm(tok[0] || '');
    const sigungu = tok[1] || '';
    const isCare = CARE_RE.test([x.title, x.rcrtFld, x.dtyCntn, x.applyQlfc, x.relateJssfc].join(' '));
    return {
      id: String(x.seq || x.joinno || ''),
      title: String(x.title || '').trim(),
      companyName: String(x.fcltNm || '').trim(),
      address: addr,
      sido, sigungu,
      region: `${sido} ${sigungu}`.trim(),
      rcrtFld: String(x.rcrtFld || '').trim(),
      headcount: String(x.recruitNops || '').trim(),
      wageCond: cleanWage(x.wageCond),
      emplStle: String(x.emplStle || '').trim(),
      wrkBgnTm: String(x.wrkBgnTm || '').trim(),
      wrkEndTm: String(x.wrkEndTm || '').trim(),
      accpBgnDe: String(x.accpBgnDe || '').replace(/[^0-9]/g, ''),
      accpClseDe: String(x.accpClseDe || '').replace(/[^0-9]/g, ''),
      dtyCntn: String(x.dtyCntn || '').trim(),
      applyQlfc: String(x.applyQlfc || '').trim(),
      tel: String(x.fcltTelNo || x.crgrTelNo || '').trim(),
      sourceUrl: String(x.urllnk || '').trim(),
      isCare,
    };
  }).filter(j => j.title && j.sido);

  const careJobs = jobs.filter(j => j.isCare);
  console.log(`  요양보호사 관련 ${careJobs.length}건 / 전체 ${jobs.length}건`);

  // 시군구별 집계
  const bySigungu = {};
  jobs.forEach(j => {
    const k = `${j.sido} ${j.sigungu}`;
    (bySigungu[k] = bySigungu[k] || []).push(j);
  });
  const sidoCounts = {};
  jobs.forEach(j => { sidoCounts[j.sido] = (sidoCounts[j.sido] || 0) + 1; });

  fs.writeFileSync(path.join(ROOT, 'data', 'welfare.json'), JSON.stringify(jobs, null, 1), 'utf8');
  fs.writeFileSync(path.join(ROOT, 'data', 'welfare-regions.json'), JSON.stringify({
    sido: Object.entries(sidoCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    updatedAt: new Date().toISOString(),
  }, null, 1), 'utf8');

  console.log(`\n✓ data/welfare.json (${jobs.length}건)`);
  console.log(`✓ data/welfare-regions.json`);
  console.log(`  공고 있는 시군구: ${Object.keys(bySigungu).length}개`);
})();
