import { getServerAuthSession } from '../../lib/getServerAuthSession';
import {
  assignPlayerToSlot,
  clearSlot,
  setCaptain,
  getSquadWithSlots,
} from '../../lib/squads';
import { countLeaguePlayers } from '../../lib/players';

export default async function handler(req, res) {
  try {
    const session = await getServerAuthSession(req, res);
    if (!session?.user?.teamId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const squadData = await getSquadWithSlots(session.user.teamId);
      const playerPoolSize = await countLeaguePlayers();
      return res.status(200).json({ ...squadData, playerPoolSize });
    }

    if (req.method === 'POST') {
      const { action, slotId, playerId, captainRole } = req.body ?? {};

      if (action === 'assign') {
        if (!slotId || !playerId) {
          return res.status(400).json({ error: 'slotId and playerId required' });
        }
        const squadData = await assignPlayerToSlot({
          fantasyTeamId: session.user.teamId,
          slotId,
          playerId,
        });
        return res.status(200).json(squadData);
      }

      if (action === 'clear') {
        if (!slotId) {
          return res.status(400).json({ error: 'slotId required' });
        }
        const squadData = await clearSlot({
          fantasyTeamId: session.user.teamId,
          slotId,
        });
        return res.status(200).json(squadData);
      }

      if (action === 'captain') {
        if (!playerId || !['captain', 'vice'].includes(captainRole)) {
          return res.status(400).json({ error: 'playerId and captainRole required' });
        }
        const squadData = await setCaptain({
          fantasyTeamId: session.user.teamId,
          playerId,
          role: captainRole === 'vice' ? 'vice' : 'captain',
        });
        return res.status(200).json(squadData);
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('/api/my-squad:', err);
    const status = req.method === 'GET' ? 500 : 400;
    return res.status(status).json({
      error: err.message || 'Squad request failed',
      details: process.env.NODE_ENV === 'development' && req.method === 'GET' ? err.message : undefined,
    });
  }
}
