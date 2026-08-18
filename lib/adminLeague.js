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

export async function getLeagueAudit(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();

  const { rows: teams } = await pool.query(
    `SELECT
       ft.id,
       ft.name,
       s.budget_remaining,
       s.free_trades_banked,
       (SELECT COUNT(*)::int FROM squad_slots ss WHERE ss.squad_id = s.id AND ss.player_id IS NOT NULL) AS squad_players,
       (SELECT COUNT(*)::int FROM transfers t
        JOIN squads sq ON sq.id = t.squad_id
        WHERE sq.fantasy_team_id = ft.id) AS transfer_count
     FROM fantasy_teams ft
     LEFT JOIN squads s ON s.fantasy_team_id = ft.id AND s.league_id = ft.league_id
     WHERE ft.league_id = $1
     ORDER BY ft.name ASC`,
    [leagueId]
  );

  const { rows: recentTransfers } = await pool.query(
    `SELECT
       t.id,
       t.created_at,
       ft.name AS team_name,
       pin.full_name AS player_in_name,
       pout.full_name AS player_out_name,
       t.used_free_trade,
       r.round_number,
       r.name AS round_name
     FROM transfers t
     JOIN squads sq ON sq.id = t.squad_id
     JOIN fantasy_teams ft ON ft.id = sq.fantasy_team_id
     LEFT JOIN players pin ON pin.id = t.player_in_id
     LEFT JOIN players pout ON pout.id = t.player_out_id
     LEFT JOIN rounds r ON r.id = t.round_id
     WHERE t.league_id = $1
     ORDER BY t.created_at DESC
     LIMIT 30`,
    [leagueId]
  );

  const { rows: recentLog } = await pool.query(
    `SELECT
       tl.id,
       tl.action,
       tl.created_at,
       ft.name AS team_name,
       r.round_number
     FROM trade_log tl
     JOIN fantasy_teams ft ON ft.id = tl.fantasy_team_id
     LEFT JOIN rounds r ON r.id = tl.round_id
     WHERE tl.league_id = $1
     ORDER BY tl.created_at DESC
     LIMIT 30`,
    [leagueId]
  );

  return {
    teams: teams.map((row) => ({
      id: row.id,
      name: row.name,
      budgetRemaining: row.budget_remaining != null ? Number(row.budget_remaining) : null,
      freeTradesBanked: row.free_trades_banked ?? 0,
      squadPlayers: row.squad_players ?? 0,
      transferCount: row.transfer_count ?? 0,
    })),
    recentTransfers: recentTransfers.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      teamName: row.team_name,
      playerInName: row.player_in_name,
      playerOutName: row.player_out_name,
      usedFreeTrade: row.used_free_trade,
      roundNumber: row.round_number,
      roundName: row.round_name,
    })),
    recentLog: recentLog.map((row) => ({
      id: row.id,
      action: row.action,
      createdAt: row.created_at,
      teamName: row.team_name,
      roundNumber: row.round_number,
    })),
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
