/**
 * convert-facilities.js
 * 
 * 엑셀(국민건강보험공단_장기요양기관 시설별 현황) → JSON 변환
 * 
 * 출력:
 *   data/facilities.json          — 전체 31,282개 시설 리스트
 *   data/facilities-by-sigungu.json — 시군구별 그룹화 + 집계
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── xlsx를 동적 import (CJS 모듈) ───
const XLSX = (await import('xlsx')).default ?? (await import('xlsx'));

// ─── 설정 ───
const EXCEL_PATH = resolve('C:/Users/hadam/Downloads/국민건강보험공단_장기요양기관 시설별 현황_20250401.xlsx');
const FACILITY_TYPES_PATH = resolve(ROOT, 'data/facility-types.json');
const OUT_ALL = resolve(ROOT, 'data/facilities.json');
const OUT_BY_SIGUNGU = resolve(ROOT, 'data/facilities-by-sigungu.json');

// ─── 시도 약칭 매핑 ───
const sidoShortMap = {
  '11': '서울', '26': '부산', '27': '대구', '28': '인천',
  '29': '광주', '30': '대전', '31': '울산', '36': '세종',
  '41': '경기', '42': '강원', '43': '충북', '44': '충남',
  '45': '전북', '46': '전남', '47': '경북', '48': '경남',
  '50': '제주'
};

// ─── 시도 정식 명 → 약칭 ───
const sidoFullToShort = {
  '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구',
  '인천광역시': '인천', '광주광역시': '광주', '대전광역시': '대전',
  '울산광역시': '울산', '세종특별자치시': '세종', '경기도': '경기',
  '강원특별자치도': '강원', '강원도': '강원',
  '충청북도': '충북', '충청남도': '충남',
  '전북특별자치도': '전북', '전라북도': '전북',
  '전라남도': '전남', '경상북도': '경북', '경상남도': '경남',
  '제주특별자치도': '제주'
};

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  장기요양기관 엑셀 → JSON 변환');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ─── 1. 시설종류 매핑 로드 ───
const facilityTypes = JSON.parse(readFileSync(FACILITY_TYPES_PATH, 'utf8'));

// ─── 2. 엑셀 읽기 ───
console.log('\n▶ 엑셀 파일 읽는 중...');
const wb = XLSX.readFile(EXCEL_PATH);

// 2-a. 일반현황 시트
const wsMain = wb.Sheets['일반현황'];
const mainRows = XLSX.utils.sheet_to_json(wsMain, { header: 1 });
console.log(`  일반현황: ${mainRows.length - 1} 행`);

// 2-b. 입소인원 시트 (기관유형코드 매핑)
const wsType = wb.Sheets['입소인원'];
const typeRows = XLSX.utils.sheet_to_json(wsType, { header: 1 });
console.log(`  입소인원: ${typeRows.length - 1} 행`);

// ─── 3. 기관코드 → 유형코드 집합 맵 구성 ───
const codeToTypes = new Map();
for (let i = 1; i < typeRows.length; i++) {
  const row = typeRows[i];
  const code = String(row[0] || '').trim();
  const typeCode = String(row[1] || '').trim();
  if (!code || !typeCode) continue;
  if (!codeToTypes.has(code)) codeToTypes.set(code, new Set());
  codeToTypes.get(code).add(typeCode);
}

// ─── 4. 일반현황 파싱 ───
console.log('\n▶ 데이터 정규화 중...');
const facilities = [];
const seenCodes = new Set();

for (let i = 1; i < mainRows.length; i++) {
  const row = mainRows[i];
  const code = String(row[0] || '').trim();
  if (!code || code === 'undefined' || seenCodes.has(code)) continue;
  seenCodes.add(code);

  const name = String(row[1] || '').trim();
  const zipcode = String(row[2] || '').padStart(5, '0');
  const sidoCode = String(row[3] || '').trim();
  const sigunguCode = String(row[4] || '').trim();
  const regionFullName = String(row[6] || '').trim(); // '서울특별시 종로구 구기동'
  const designatedDate = String(row[7] || '').trim();
  const registeredDate = String(row[8] || '').trim();
  const address = String(row[9] || '').trim();

  // 지역 정보 파싱
  const regionParts = regionFullName.split(/\s+/);
  const sidoFull = regionParts[0] || '';
  const sido = sidoFullToShort[sidoFull] || sidoShortMap[sidoCode] || sidoFull;
  const sigungu = regionParts[1] || '';

  // 기관유형 코드들
  const typeCodesSet = codeToTypes.get(code) || new Set();
  const typeCodes = [...typeCodesSet];

  // 주요 시설종류 결정 (slug: care / home / day / other)
  let primarySlug = 'other';
  const mainTypeCodes = ['A01','A02','A03','A04','A05','AAA']; // 시설 (care)
  const homeTypeCodes = ['B01','B02','B05','C01','C02','C05']; // 방문 (home)
  const dayTypeCodes = ['B03','C03']; // 주야간보호 (day)

  if (typeCodes.some(c => mainTypeCodes.includes(c))) primarySlug = 'care';
  else if (typeCodes.some(c => dayTypeCodes.includes(c))) primarySlug = 'day';
  else if (typeCodes.some(c => homeTypeCodes.includes(c))) primarySlug = 'home';
  else if (typeCodes.some(c => c.startsWith('G') || c.startsWith('M') || c.startsWith('H') || c.startsWith('I') || c === 'S41')) primarySlug = 'care';

  // 유형명 배열 생성 (중복 제거)
  const typeNames = [...new Set(
    typeCodes
      .map(tc => {
        const ft = facilityTypes[tc];
        if (ft) return ft.name;
        // G/M = 치매전담실, H/I = 주야간보호 내 치매전담
        if (tc.startsWith('G')) return '치매전담실(가형)';
        if (tc.startsWith('M')) return '치매전담실(나형)';
        if (tc.startsWith('H') || tc.startsWith('I')) return '주야간보호 내 치매전담';
        if (tc === 'S41') return '치매전담형 공동생활가정';
        return null;
      })
      .filter(Boolean)
  )];

  facilities.push({
    code,
    name,
    zipcode,
    sido,
    sigungu,
    address,
    designatedDate,
    registeredDate,
    typeCodes,
    typeNames,
    primarySlug
  });
}

console.log(`  ✓ ${facilities.length}개 시설 정규화 완료`);

// ─── 5. 전체 JSON 출력 ───
writeFileSync(OUT_ALL, JSON.stringify(facilities, null, 0), 'utf8');
console.log(`\n▶ ${OUT_ALL}`);
console.log(`  크기: ${(readFileSync(OUT_ALL).length / 1024 / 1024).toFixed(1)} MB`);

// ─── 6. 시군구별 집계 ───
console.log('\n▶ 시군구별 집계 중...');
const bySigungu = {};
const sigunguStats = {};

for (const f of facilities) {
  const key = `${f.sido}-${f.sigungu}`;
  if (!bySigungu[key]) {
    bySigungu[key] = {
      sido: f.sido,
      sigungu: f.sigungu,
      slug: toSlug(f.sido, f.sigungu),
      total: 0,
      care: 0,
      home: 0,
      day: 0,
      other: 0,
      facilities: []
    };
  }
  bySigungu[key].total++;
  bySigungu[key][f.primarySlug]++;
  bySigungu[key].facilities.push({
    code: f.code,
    name: f.name,
    address: f.address,
    designatedDate: f.designatedDate,
    typeNames: f.typeNames,
    primarySlug: f.primarySlug
  });
}

function toSlug(sido, sigungu) {
  return `${sido}-${sigungu}`.replace(/\s+/g, '-');
}

// 정렬
const sortedKeys = Object.keys(bySigungu).sort((a, b) => bySigungu[b].total - bySigungu[a].total);
const result = {};
for (const k of sortedKeys) {
  result[k] = bySigungu[k];
}

writeFileSync(OUT_BY_SIGUNGU, JSON.stringify(result, null, 0), 'utf8');
console.log(`  ✓ ${Object.keys(result).length}개 시군구 그룹 생성`);
console.log(`  ${OUT_BY_SIGUNGU}`);
console.log(`  크기: ${(readFileSync(OUT_BY_SIGUNGU).length / 1024 / 1024).toFixed(1)} MB`);

// 요약 통계
const totalCare = facilities.filter(f => f.primarySlug === 'care').length;
const totalHome = facilities.filter(f => f.primarySlug === 'home').length;
const totalDay = facilities.filter(f => f.primarySlug === 'day').length;
const totalOther = facilities.filter(f => f.primarySlug === 'other').length;

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  완료 요약');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  총 시설:       ${facilities.length.toLocaleString()}`);
console.log(`  요양원(시설):  ${totalCare.toLocaleString()}`);
console.log(`  방문요양(재가): ${totalHome.toLocaleString()}`);
console.log(`  주야간보호:    ${totalDay.toLocaleString()}`);
console.log(`  기타:          ${totalOther.toLocaleString()}`);
console.log(`  시군구 그룹:   ${Object.keys(result).length}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
