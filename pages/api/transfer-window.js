import { getServerAuthSession } from '../../lib/getServerAuthSession';
import { ensureSquad } from '../../lib/squads';
import { getTransferWindowStatus } from '../../lib/transferWindow';
import { listUpcomingLocks } from '../../lib/locks';
import { getSquadStructureConfig } from '../../lib/league';
import { getPool } from '../../lib/db';
import { DEFAULT_LEAGUE_ID } from '../../lib/constants';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerAuthSession(req, res);
    if (!session?.user?.teamId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const squad = await ensureSquad(session.user.teamId);
    const structureConfig = await getSquadStructureConfig();
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS filled FROM squad_slots
       WHERE squad_id = $1 AND player_id IS NOT NULL`,
      [squad.id]
    );
    const requiredCount = structureConfig.reduce((n, r) => n + r.required_count, 0);

    const [status, upcomingLocks] = await Promise.all([
      getTransferWindowStatus({
        fantasyTeamId: session.user.teamId,
        squadId: squad.id,
        freeTradesBanked: squad.free_trades_banked,
        lastSettledRoundNumber: squad.last_settled_round_number ?? 0,
        leagueId: DEFAULT_LEAGUE_ID,
        squadComplete: rows[0].filled >= requiredCount,
      }),
      listUpcomingLocks(),
    ]);

    return res.status(200).json({ ...status, upcomingLocks });
  } catch (err) {
    console.error('GET /api/transfer-window:', err);
    return res.status(500).json({
      error: 'Failed to load transfer window',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}
