import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';
import {
  createH2HSchedule,
  getLeagueSummary,
  getLeagueTeams,
  scheduleExists,
} from './h2hLeague';

export async function getAdminOverview(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const [league, teams] = await Promise.all([
    getLeagueSummary(leagueId),
    getLeagueTeams(leagueId),
  ]);

  const { rows: counts } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM rounds WHERE league_id = $1) AS rounds,
       (SELECT COUNT(*)::int FROM h2h_matchups WHERE league_id = $1) AS matchups,
       (SELECT COUNT(*)::int FROM transfers WHERE league_id = $1) AS transfers,
       (SELECT COUNT(*)::int FROM trade_log WHERE league_id = $1) AS trade_log_entries`,
    [leagueId]
  );

  return {
    league,
    teams: teams.map((t) => ({ id: t.id, name: t.name, createdAt: t.created_at })),
    stats: counts[0],
  };
}

/**
 * Remove H2H rounds/matchups so the tournament can be regenerated.
 * Optionally clears transfer history and resets per-squad trade banking.
 */
export async function resetH2HTournament(
  leagueId = DEFAULT_LEAGUE_ID,
  { clearTransfers = false } = {}
) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const matchupResult = await client.query(
      'DELETE FROM h2h_matchups WHERE league_id = $1',
      [leagueId]
    );
    const roundsResult = await client.query(
      'DELETE FROM rounds WHERE league_id = $1',
      [leagueId]
    );

    let transfersDeleted = 0;
    let tradeLogDeleted = 0;
    let squadsReset = 0;

    if (clearTransfers) {
      const transferDelete = await client.query(
        'DELETE FROM transfers WHERE league_id = $1',
        [leagueId]
      );
      transfersDeleted = transferDelete.rowCount;

      const logDelete = await client.query(
        'DELETE FROM trade_log WHERE league_id = $1',
        [leagueId]
      );
      tradeLogDeleted = logDelete.rowCount;

      const squadUpdate = await client.query(
        `UPDATE squads
         SET free_trades_banked = 0,
             last_settled_round_number = 0,
             updated_at = NOW()
         WHERE league_id = $1`,
        [leagueId]
      );
      squadsReset = squadUpdate.rowCount;
    } else {
      await client.query(
        `UPDATE transfers SET round_id = NULL WHERE league_id = $1 AND round_id IS NOT NULL`,
        [leagueId]
      );
      await client.query(
        `UPDATE trade_log SET round_id = NULL WHERE league_id = $1 AND round_id IS NOT NULL`,
        [leagueId]
      );
    }

    await client.query(
      `UPDATE leagues SET status = 'draft', updated_at = NOW() WHERE id = $1`,
      [leagueId]
    );

    await client.query('COMMIT');

    return {
      matchupsDeleted: matchupResult.rowCount,
      roundsDeleted: roundsResult.rowCount,
      transfersDeleted,
      tradeLogDeleted,
      squadsReset,
      clearTransfers,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function regenerateH2HSchedule(
  leagueId = DEFAULT_LEAGUE_ID,
  { clearTransfers = false } = {}
) {
  if (await scheduleExists(leagueId)) {
    await resetH2HTournament(leagueId, { clearTransfers });
  }
  return createH2HSchedule(leagueId);
}
