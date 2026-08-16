import { getServerAuthSession } from '../../../lib/getServerAuthSession';
import {
  getRounds,
  getRoundMatchups,
  getLeagueSummary,
} from '../../../lib/h2hLeague';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerAuthSession(req, res);
    if (!session?.user?.teamId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const roundParam = req.query.round;
    const [rounds, league] = await Promise.all([getRounds(), getLeagueSummary()]);

    if (!roundParam) {
      return res.status(200).json({ rounds, league });
    }

    const roundNumber = parseInt(String(roundParam), 10);
    if (Number.isNaN(roundNumber) || roundNumber < 1) {
      return res.status(400).json({ error: 'Invalid round number' });
    }

    const matchups = await getRoundMatchups(roundNumber);
    return res.status(200).json({
      roundNumber,
      matchups,
      rounds,
      league,
    });
  } catch (err) {
    console.error('GET /api/league/rounds:', err);
    return res.status(500).json({
      error: 'Failed to load round matchups',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}
