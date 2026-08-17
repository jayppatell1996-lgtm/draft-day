import { getServerAuthSession } from '../../../lib/getServerAuthSession';
import {
  getPlayoffBracket,
  getPlayoffStatus,
} from '../../../lib/playoffLeague';
import { getLeagueSummary } from '../../../lib/h2hLeague';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerAuthSession(req, res);
    if (!session?.user?.teamId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [status, league] = await Promise.all([
      getPlayoffStatus(),
      getLeagueSummary(),
    ]);

    if (!status.hasPlayoffs) {
      return res.status(200).json({
        status,
        league,
        bracket: null,
      });
    }

    const bracket = await getPlayoffBracket();
    return res.status(200).json({ status, league, bracket });
  } catch (err) {
    console.error('GET /api/league/playoffs:', err);
    return res.status(500).json({
      error: 'Failed to load playoffs',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}
