import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';
import { getTradeRules } from './leagueConfig';
import { getTransferWindowBounds } from './locks';

export async function getScheduleExists(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM rounds
     WHERE league_id = $1 AND is_playoff = FALSE`,
    [leagueId]
  );
  return rows[0].count > 0;
}

/**
 * Active H2H round for a team: earliest non-completed round with a matchup involving the team.
 */
export async function getCurrentRoundForTeam(fantasyTeamId, leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT r.id, r.round_number, r.name, r.is_playoff, r.starts_at, r.ends_at,
            m.id AS matchup_id, m.status AS matchup_status
     FROM h2h_matchups m
     JOIN rounds r ON r.id = m.round_id
     WHERE m.league_id = $1
       AND (m.home_team_id = $2 OR m.away_team_id = $2)
       AND m.status <> 'completed'
       AND m.status <> 'cancelled'
     ORDER BY r.round_number ASC
     LIMIT 1`,
    [leagueId, fantasyTeamId]
  );

  if (!rows[0]) {
    const { rows: lastRows } = await pool.query(
      `SELECT r.id, r.round_number, r.name, r.is_playoff
       FROM h2h_matchups m
       JOIN rounds r ON r.id = m.round_id
       WHERE m.league_id = $1 AND (m.home_team_id = $2 OR m.away_team_id = $2)
       ORDER BY r.round_number DESC
       LIMIT 1`,
      [leagueId, fantasyTeamId]
    );
    return lastRows[0]
      ? {
          id: lastRows[0].id,
          roundNumber: lastRows[0].round_number,
          name: lastRows[0].name,
          isPlayoff: lastRows[0].is_playoff,
          isComplete: true,
        }
      : null;
  }

  return {
    id: rows[0].id,
    roundNumber: rows[0].round_number,
    name: rows[0].name,
    isPlayoff: rows[0].is_playoff,
    isComplete: false,
    matchupId: rows[0].matchup_id,
    matchupStatus: rows[0].matchup_status,
  };
}

async function countRoundTransfers(squadId, roundId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE used_free_trade)::int AS free_used
     FROM transfers
     WHERE squad_id = $1 AND round_id = $2`,
    [squadId, roundId]
  );
  return { total: rows[0].total, freeUsed: rows[0].free_used };
}

async function countPlayoffTransfers(squadId, leagueId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM transfers t
     JOIN rounds r ON r.id = t.round_id
     WHERE t.squad_id = $1 AND t.league_id = $2 AND r.is_playoff = TRUE`,
    [squadId, leagueId]
  );
  return rows[0].total;
}

/**
 * Bank unused free trades from completed rounds up to max banked.
 */
export async function settleRoundBanking({
  squadId,
  fantasyTeamId,
  leagueId = DEFAULT_LEAGUE_ID,
  upToRoundNumber,
}) {
  const rules = getTradeRules();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const squadResult = await client.query(
      `SELECT free_trades_banked, last_settled_round_number
       FROM squads WHERE id = $1 FOR UPDATE`,
      [squadId]
    );
    const squad = squadResult.rows[0];
    if (!squad) throw new Error('Squad not found');

    let banked = squad.free_trades_banked;
    let lastSettled = squad.last_settled_round_number ?? 0;

    const { rows: rounds } = await client.query(
      `SELECT r.id, r.round_number, r.is_playoff
       FROM rounds r
       WHERE r.league_id = $1
         AND r.is_playoff = FALSE
         AND r.round_number > $2
         AND r.round_number < $3
       ORDER BY r.round_number ASC`,
      [leagueId, lastSettled, upToRoundNumber]
    );

    for (const round of rounds) {
      const { rows: usage } = await client.query(
        `SELECT COUNT(*) FILTER (WHERE used_free_trade)::int AS free_used
         FROM transfers WHERE squad_id = $1 AND round_id = $2`,
        [squadId, round.id]
      );
      const freeUsed = usage[0].free_used;
      const unused = Math.max(0, rules.freeTradesPerRound - freeUsed);
      banked = Math.min(rules.maxBankedFreeTrades, banked + unused);
      lastSettled = round.round_number;

      await client.query(
        `INSERT INTO trade_log (league_id, squad_id, fantasy_team_id, round_id, action, payload)
         VALUES ($1, $2, $3, $4, 'round_banking', $5)`,
        [
          leagueId,
          squadId,
          fantasyTeamId,
          round.id,
          JSON.stringify({
            roundNumber: round.round_number,
            freeUsed,
            unusedBanked: unused,
            bankedTotal: banked,
          }),
        ]
      );
    }

    await client.query(
      `UPDATE squads SET free_trades_banked = $1, last_settled_round_number = $2, updated_at = NOW()
       WHERE id = $3`,
      [banked, lastSettled, squadId]
    );

    await client.query('COMMIT');
    return { banked, lastSettledRoundNumber: lastSettled };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getTransferWindowStatus({
  fantasyTeamId,
  squadId,
  freeTradesBanked,
  lastSettledRoundNumber,
  leagueId = DEFAULT_LEAGUE_ID,
  squadComplete = false,
}) {
  const rules = getTradeRules();
  const scheduleExists = await getScheduleExists(leagueId);
  const windowBounds = await getTransferWindowBounds(leagueId);
  const currentRound = await getCurrentRoundForTeam(fantasyTeamId, leagueId);

  const initialBuild = !scheduleExists || !squadComplete;

  if (initialBuild) {
    return {
      mode: 'initial_build',
      windowOpen: true,
      canTransfer: true,
      freeTradesAvailable: null,
      freeTradesPerRound: rules.freeTradesPerRound,
      bankedFreeTrades: freeTradesBanked,
      tradesUsedThisRound: 0,
      tradesRemainingThisRound: null,
      currentRound: currentRound
        ? { roundNumber: currentRound.roundNumber, name: currentRound.name, isPlayoff: currentRound.isPlayoff }
        : null,
      window: windowBounds,
    };
  }

  if (!currentRound) {
    return {
      mode: 'no_round',
      windowOpen: windowBounds.open,
      canTransfer: windowBounds.open,
      freeTradesAvailable: 0,
      bankedFreeTrades: freeTradesBanked,
      currentRound: null,
      window: windowBounds,
    };
  }

  if (
    currentRound.roundNumber > (lastSettledRoundNumber ?? 0) + 1 &&
    !currentRound.isComplete
  ) {
    await settleRoundBanking({
      squadId,
      fantasyTeamId,
      leagueId,
      upToRoundNumber: currentRound.roundNumber,
    });
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT free_trades_banked, last_settled_round_number FROM squads WHERE id = $1',
      [squadId]
    );
    freeTradesBanked = rows[0].free_trades_banked;
    lastSettledRoundNumber = rows[0].last_settled_round_number;
  }

  const usage = await countRoundTransfers(squadId, currentRound.id);
  let freeAvailable = 0;
  let tradesRemaining = null;
  let canTransfer = windowBounds.open;

  if (currentRound.isPlayoff) {
    const playoffUsed = await countPlayoffTransfers(squadId, leagueId);
    tradesRemaining = Math.max(0, rules.playoffTradeAllowance - playoffUsed);
    freeAvailable = 0;
    canTransfer = canTransfer && tradesRemaining > 0;
  } else {
    const roundFreeRemaining = Math.max(0, rules.freeTradesPerRound - usage.freeUsed);
    freeAvailable = freeTradesBanked + roundFreeRemaining;
    tradesRemaining = null;
  }

  return {
    mode: currentRound.isPlayoff ? 'playoffs' : 'regular_season',
    windowOpen: windowBounds.open,
    canTransfer: canTransfer && windowBounds.open,
    freeTradesAvailable: freeAvailable,
    freeTradesPerRound: currentRound.isPlayoff ? rules.playoffFreeTrades : rules.freeTradesPerRound,
    bankedFreeTrades: freeTradesBanked,
    tradesUsedThisRound: usage.total,
    freeTradesUsedThisRound: usage.freeUsed,
    tradesRemainingThisRound: tradesRemaining,
    currentRound: {
      id: currentRound.id,
      roundNumber: currentRound.roundNumber,
      name: currentRound.name,
      isPlayoff: currentRound.isPlayoff,
      isComplete: currentRound.isComplete ?? false,
    },
    window: windowBounds,
    rules,
  };
}
