import { getServerAuthSession } from '../../lib/getServerAuthSession';
import { listLeaguePlayers } from '../../lib/players';
import { getSquadWithSlots } from '../../lib/squads';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerAuthSession(req, res);
    if (!session?.user?.teamId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { role, franchise, search } = req.query;
    const squadData = await getSquadWithSlots(session.user.teamId);
    const ownedIds = squadData.slots.filter((s) => s.player_id).map((s) => s.player_id);

    const players = await listLeaguePlayers({
      role: role || undefined,
      franchiseExternalId: franchise ? parseInt(franchise, 10) : undefined,
      search: search || undefined,
      excludePlayerIds: [],
    });

    return res.status(200).json({
      players,
      franchises: [...new Map(
        players
          .filter((p) => p.franchiseExternalId)
          .map((p) => [p.franchiseExternalId, { id: p.franchiseExternalId, name: p.franchiseName }])
      ).values()],
      ownedPlayerIds: ownedIds,
    });
  } catch (err) {
    console.error('GET /api/league-players:', err);
    return res.status(500).json({
      error: 'Failed to load players',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}
