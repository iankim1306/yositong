import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 시설 데이터 캐시
let facilitiesMap = null;

function loadFacilities() {
  if (facilitiesMap) return facilitiesMap;
  try {
    const dataPath = resolve(__dirname, '../../data/facilities.json');
    const data = JSON.parse(readFileSync(dataPath, 'utf8'));
    facilitiesMap = new Map();
    for (const f of data) {
      facilitiesMap.set(f.code, f);
    }
  } catch (e) {
    console.error('Failed to load facilities data:', e);
    facilitiesMap = new Map();
  }
  return facilitiesMap;
}

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: '시설 코드가 필요합니다.' });
  }

  const map = loadFacilities();
  const facility = map.get(code);

  if (!facility) {
    return res.status(404).json({ error: '해당 시설을 찾을 수 없습니다.' });
  }

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 시설 데이터는 정적(배포 시에만 갱신) → 캐시를 길게 둬 ISR Write 폭증 방지.
  // 데이터 변경 시 재배포하면 Vercel이 캐시를 자동 무효화함.
  res.setHeader('Cache-Control', 'public, s-maxage=2592000, stale-while-revalidate=86400');

  return res.status(200).json({
    facility,
  });
}
