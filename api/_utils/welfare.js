import { XMLParser } from 'fast-xml-parser';

const cache = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL = 60 * 60 * 1000;

export function formatTel(numStr) {
  if (!numStr) return '';
  const num = numStr.toString().replace(/[^0-9]/g, '');
  if (num.length === 0) return numStr;

  if (num.startsWith('02')) {
    if (num.length === 9) return num.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
    if (num.length === 10) return num.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
    return num;
  } else {
    if (num.length === 10) return num.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    if (num.length === 11) return num.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    if (num.length === 8) return num.replace(/(\d{4})(\d{4})/, '$1-$2'); // 1588-xxxx
    return num;
  }
}

const sidoMapping = {
  '서울특별시': '서울', '서울시': '서울', '서울': '서울',
  '경기도': '경기', '경기': '경기',
  '인천광역시': '인천', '인천시': '인천', '인천': '인천',
  '부산광역시': '부산', '부산시': '부산', '부산': '부산',
  '대구광역시': '대구', '대구시': '대구', '대구': '대구',
  '광주광역시': '광주', '광주시': '광주', '광주': '광주',
  '대전광역시': '대전', '대전시': '대전', '대전': '대전',
  '울산광역시': '울산', '울산시': '울산', '울산': '울산',
  '세종특별자치시': '세종', '세종시': '세종', '세종': '세종',
  '강원특별자치도': '강원', '강원도': '강원', '강원': '강원',
  '충청북도': '충북', '충북': '충북',
  '충청남도': '충남', '충남': '충남',
  '전북특별자치도': '전북', '전라북도': '전북', '전북': '전북',
  '전라남도': '전남', '전남': '전남',
  '경상북도': '경북', '경북': '경북',
  '경상남도': '경남', '경남': '경남',
  '제주특별자치도': '제주', '제주도': '제주', '제주': '제주'
};

export function extractRegion(fcltAddr, fallbackRegion) {
  let sido = '';
  let sigungu = '';
  
  const address = fcltAddr || fallbackRegion || '';
  const parts = address.trim().split(/\s+/);
  
  if (parts.length > 0) {
    const rawSido = parts[0];
    sido = sidoMapping[rawSido] || rawSido;
  }
  
  if (parts.length > 1) {
    sigungu = parts[1];
    if (sigungu.includes('(')) {
      sigungu = sigungu.split('(')[0];
    }
  }

  // fallback logic
  if (!sido && fallbackRegion) {
     const fallbackParts = fallbackRegion.trim().split(/\s+/);
     if (fallbackParts.length > 0) sido = sidoMapping[fallbackParts[0]] || fallbackParts[0];
  }
  
  return { sido, sigungu };
}

export function inferFacilityType(fcltNm, cfbNm) {
  const name = (fcltNm || '') + ' ' + (cfbNm || '');
  if (name.includes('주간') || name.includes('데이케어')) return 'day';
  if (name.includes('방문') || name.includes('재가')) return 'home';
  if (name.includes('요양원') || name.includes('실버타운') || name.includes('노인복지') || name.includes('요양센터')) return 'care';
  return 'other';
}

export async function fetchAllWelfareJobs() {
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  const apiKey = process.env.WELFARE_API_KEY;

  if (!apiKey) {
    // Return mock data
    const mockData = Array.from({ length: 50 }).map((_, i) => {
      const sidos = ['서울', '경기', '부산', '대구', '인천'];
      const sigungus = ['강남구', '고양시 덕양구', '해운대구', '수성구', '부평구'];
      const sido = sidos[i % 5];
      const sigungu = sigungus[i % 5];
      const types = ['care', 'home', 'day', 'other'];
      const fType = types[i % 4];
      
      return {
        id: `MOCK_${i}_1`,
        title: `[MOCK] ${sido} ${sigungu} 요양보호사 모집`,
        companyName: `테스트 복지센터 ${i+1}`,
        address: `${sido} ${sigungu} 테스트길 123`,
        region: `${sido} ${sigungu}`,
        sido,
        sigungu,
        salary: '시급 13,000원',
        wageCond: '시급 13,000원',
        workType: i % 2 === 0 ? '주 5일' : '3교대',
        employType: i % 2 === 0 ? '정규직' : '계약직',
        deadline: i % 5 === 0 ? '20241231' : '99999999',
        postedAt: i === 0 ? new Date().toISOString().slice(0,10).replace(/-/g,'') : '20240101',
        headcount: '1',
        sourceUrl: 'https://example.com',
        insurance: { health: 'Y', pension: 'Y', employ: 'Y', industry: 'Y' },
        tel: '02-1234-5678',
        crgrTelNo: '02-1234-5678',
        facilityType: fType,
        dtyCntn: '어르신 식사 및 이동 보조, 청결 유지',
        applyQlfc: '요양보호사 1급 자격증 필수',
        wrkBgnTm: '0900',
        wrkEndTm: '1800',
        sbmtPaper: '이력서, 자격증 사본',
        crgrNm: '김담당',
        crgrMailAddr: 'test@example.com'
      };
    });
    cache.data = mockData;
    cache.timestamp = Date.now();
    return mockData;
  }

  const baseUrl = 'https://apis.data.go.kr/B554287/sclWlfrFcltInfoInqirService1/getFcltByJoInfo';
  const params = new URLSearchParams({
    serviceKey: apiKey,
    numOfRows: '1000',
    pageNo: '1'
  });

  try {
    const url = `${baseUrl}?${params.toString()}`;
    const response = await fetch(url);
    const xmlText = await response.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
      parseTagValue: false, // Keep values as string to prevent dropping leading zeros (e.g., tel)
    });
    
    const parsed = parser.parse(xmlText);
    const rawItems = parsed?.response?.body?.items?.item || [];
    const itemsArray = Array.isArray(rawItems) ? rawItems : [rawItems];

    const today = new Date();
    const todayStr = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');

    const filteredItems = itemsArray.filter(item => {
      if (!item) return false;
      const title = typeof item.title === 'string' ? item.title : '';
      const jssfc = typeof item.relateJssfc === 'string' ? item.relateJssfc : '';
      const dty = typeof item.dtyCntn === 'string' ? item.dtyCntn : '';
      const fldCd = typeof item.rcrtFldCd === 'string' ? item.rcrtFldCd : item.rcrtFldCd?.toString() || '';
      const isJobMatch =
        title.includes('요양보호사') ||
        jssfc.includes('요양보호사') ||
        dty.includes('요양보호사') ||
        fldCd === '068900' || fldCd === '68900';

      // 마감일이 오늘 이후이거나 마감일 정보 없는 경우만 통과
      const deadline = typeof item.accpClseDe === 'string' ? item.accpClseDe : (item.accpClseDe?.toString() || '');
      const notExpired = !deadline || deadline >= todayStr;

      return isJobMatch && notExpired;
    });

    const normalizedItems = filteredItems.map(item => {
      const fcltAddr = typeof item.fcltAddr === 'string' ? item.fcltAddr : '';
      const wrkPrargRegn = typeof item.wrkPrargRegn === 'string' ? item.wrkPrargRegn : '';
      const { sido, sigungu } = extractRegion(fcltAddr, wrkPrargRegn);
      
      const fcltNm = typeof item.fcltNm === 'string' ? item.fcltNm : '';
      const cfbNm = typeof item.cfbNm === 'string' ? item.cfbNm : '';
      const facilityType = inferFacilityType(fcltNm, cfbNm);

      return {
        id: `${item.fcltCd}_${item.seq}`,
        title: item.title,
        companyName: fcltNm,
        address: fcltAddr,
        region: wrkPrargRegn,
        regionCode: item.wrkPrargRegnCd,
        sido,
        sigungu,
        facilityType,
        salary: item.wageCond,
        wageCond: item.wageCond,
        workType: item.wrkStle,
        employType: item.emplStle,
        deadline: item.accpClseDe,
        postedAt: item.accpBgnDe,
        headcount: item.recruitNops,
        sourceUrl: item.urllnk,
        insurance: {
          health: item.htirSbscrbYn,
          pension: item.npnSbscrbYn,
          employ: item.emplInsrSbscrbYn,
          industry: item.indstInsrSbscrbYn
        },
        tel: formatTel(item.fcltTelNo),
        crgrTelNo: formatTel(item.crgrTelNo),
        dtyCntn: typeof item.dtyCntn === 'string' ? item.dtyCntn : '',
        applyQlfc: typeof item.applyQlfc === 'string' ? item.applyQlfc : '',
        wrkBgnTm: typeof item.wrkBgnTm === 'string' ? item.wrkBgnTm : '',
        wrkEndTm: typeof item.wrkEndTm === 'string' ? item.wrkEndTm : '',
        sbmtPaper: typeof item.sbmtPaper === 'string' ? item.sbmtPaper : '',
        crgrNm: typeof item.crgrNm === 'string' ? item.crgrNm : '',
        crgrMailAddr: typeof item.crgrMailAddr === 'string' ? item.crgrMailAddr : '',
      };
    });

    cache.data = normalizedItems;
    cache.timestamp = Date.now();
    return normalizedItems;
  } catch (error) {
    console.error('Welfare API Error:', error);
    throw error;
  }
}
