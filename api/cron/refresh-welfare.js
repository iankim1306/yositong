import { kv } from '@vercel/kv';
import { fetchAllWelfareJobs } from '../_utils/welfare.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Verify CRON_SECRET if it exists
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const allJobs = await fetchAllWelfareJobs();
    
    // Aggregation
    const sidoCounts = {};
    const sigunguCounts = {};

    allJobs.forEach(item => {
      const sido = item.sido;
      const sigungu = item.sigungu;

      if (!sido) return;

      sidoCounts[sido] = (sidoCounts[sido] || 0) + 1;
      if (!sigunguCounts[sido]) sigunguCounts[sido] = {};
      if (sigungu) {
        sigunguCounts[sido][sigungu] = (sigunguCounts[sido][sigungu] || 0) + 1;
      }
    });

    const sidoResult = Object.keys(sidoCounts)
      .map(s => ({ name: s, count: sidoCounts[s] }))
      .sort((a,b) => b.count - a.count);
      
    const sigunguBySido = {};
    Object.keys(sigunguCounts).forEach(sido => {
      sigunguBySido[sido] = Object.keys(sigunguCounts[sido])
        .map(sg => ({ name: sg, count: sigunguCounts[sido][sg] }))
        .sort((a,b) => b.count - a.count);
    });

    const regionsData = { sido: sidoResult, sigunguBySido };

    // Save to KV
    await kv.set('welfare_data', allJobs);
    await kv.set('welfare_regions', regionsData);

    return res.status(200).json({ success: true, count: allJobs.length, time: new Date().toISOString() });
  } catch (error) {
    console.error('Cron refresh failed:', error);
    return res.status(500).json({ error: 'Failed to refresh data' });
  }
}
