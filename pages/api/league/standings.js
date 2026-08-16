import { getServerAuthSession } from '../../../lib/getServerAuthSession';
import { getStandings, getLeagueSummary } from '../../../lib/h2hLeague';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerAuthSession(req, res);
    if (!session?.user?.teamId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [standings, league] = await Promise.all([
      getStandings(),
      getLeagueSummary(),
    ]);

    return res.status(200).json({ standings, league });
  } catch (err) {
    console.error('GET /api/league/standings:', err);
    return res.status(500).json({
      error: 'Failed to load standings',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}
