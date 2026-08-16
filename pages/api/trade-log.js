import { getServerAuthSession } from '../../lib/getServerAuthSession';
import { getTradeLog } from '../../lib/transfers';

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
    const roundNumber =
      roundParam != null && roundParam !== ''
        ? parseInt(String(roundParam), 10)
        : undefined;

    if (roundNumber != null && Number.isNaN(roundNumber)) {
      return res.status(400).json({ error: 'Invalid round number' });
    }

    const entries = await getTradeLog({
      fantasyTeamId: session.user.teamId,
      roundNumber,
    });

    return res.status(200).json({ entries });
  } catch (err) {
    console.error('GET /api/trade-log:', err);
    return res.status(500).json({
      error: 'Failed to load trade log',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}
