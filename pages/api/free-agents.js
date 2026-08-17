import { getServerAuthSession } from '../../lib/getServerAuthSession';
import { listLeaguePlayers } from '../../lib/players';
import { getSquadWithSlots } from '../../lib/squads';
import { getFranchiseLockInfoMap, attachLockInfoToPlayer } from '../../lib/playerPool';
import { getLeaguePlayerStatsMap } from '../../lib/playerStats';
import { getTransferWindowStatus } from '../../lib/transferWindow';

const SORT_OPTIONS = {
  price_desc: (a, b) => (b.price ?? 0) - (a.price ?? 0),
  price_asc: (a, b) => (a.price ?? 0) - (b.price ?? 0),
  name: (a, b) => a.fullName.localeCompare(b.fullName),
  role: (a, b) => a.role.localeCompare(b.role) || a.fullName.localeCompare(b.fullName),
  franchise: (a, b) =>
    (a.franchiseName || '').localeCompare(b.franchiseName || '') ||
    a.fullName.localeCompare(b.fullName),
  points_desc: (a, b) => (b.seasonPoints ?? 0) - (a.seasonPoints ?? 0),
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerAuthSession(req, res);
    if (!session?.user?.teamId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { role, franchise, search, sort = 'price_desc', overseas } = req.query;

    const [squadData, lockMap, statsMap] = await Promise.all([
      getSquadWithSlots(session.user.teamId),
      getFranchiseLockInfoMap(),
      getLeaguePlayerStatsMap(),
    ]);

    const ownedIds = new Set(
      squadData.slots.filter((s) => s.player_id).map((s) => s.player_id)
    );

    let players = await listLeaguePlayers({
      role: role || undefined,
      franchiseExternalId: franchise ? parseInt(franchise, 10) : undefined,
      search: search || undefined,
      excludePlayerIds: [],
    });

    if (overseas === 'true') {
      players = players.filter((p) => p.isOverseas);
    } else if (overseas === 'false') {
      players = players.filter((p) => !p.isOverseas);
    }

    players = players.map((player) => {
      const withLock = attachLockInfoToPlayer(player, lockMap);
      const stats = statsMap.get(player.id);
      return {
        ...withLock,
        owned: ownedIds.has(player.id),
        seasonPoints: stats?.totalPoints ?? 0,
        matchesPlayed: stats?.matches ?? 0,
      };
    });

    const sorter = SORT_OPTIONS[sort] || SORT_OPTIONS.price_desc;
    players.sort(sorter);

    const franchises = [
      ...new Map(
        players
          .filter((p) => p.franchiseExternalId)
          .map((p) => [p.franchiseExternalId, { id: p.franchiseExternalId, name: p.franchiseName }])
      ).values(),
    ].sort((a, b) => a.name.localeCompare(b.name));

    const transferWindow = squadData.transferWindow;

    return res.status(200).json({
      players,
      franchises,
      ownedPlayerIds: [...ownedIds],
      transferWindow,
      sort,
    });
  } catch (err) {
    console.error('GET /api/free-agents:', err);
    return res.status(500).json({
      error: 'Failed to load free agents',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}
