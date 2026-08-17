import { getServerAuthSession } from '../../lib/getServerAuthSession';
import {
  getPlayerSeasonStats,
  getPlayerMatchHistory,
  getSquadPointsSummary,
} from '../../lib/playerStats';
import { getPlayerWithPrice } from '../../lib/players';
import { attachLockInfoToPlayer, getFranchiseLockInfoMap } from '../../lib/playerPool';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerAuthSession(req, res);
    if (!session?.user?.teamId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { playerId, squad } = req.query;

    if (squad === '1' || squad === 'true') {
      const summary = await getSquadPointsSummary(session.user.teamId);
      return res.status(200).json(summary);
    }

    if (!playerId) {
      return res.status(400).json({ error: 'playerId required' });
    }

    const [stats, history, priceRow, lockMap] = await Promise.all([
      getPlayerSeasonStats(String(playerId)),
      getPlayerMatchHistory(String(playerId)),
      getPlayerWithPrice(String(playerId)),
      getFranchiseLockInfoMap(),
    ]);

    if (!stats) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const withLock = priceRow
      ? attachLockInfoToPlayer(priceRow, lockMap)
      : { lock: null, locked: false };

    return res.status(200).json({
      stats,
      history,
      price: priceRow?.price ?? null,
      lock: withLock.lock,
      locked: withLock.locked,
    });
  } catch (err) {
    console.error('GET /api/player-stats:', err);
    return res.status(500).json({
      error: 'Failed to load player stats',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}
