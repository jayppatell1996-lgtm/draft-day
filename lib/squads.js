import { getPool } from './db';
import { DEFAULT_LEAGUE_ID, SALARY_CAP } from './constants';
import { calculateBudgetRemaining } from './squadValidation';
import { getSquadStructureConfig } from './league';
import { executeSquadChange, executeSquadClear } from './transfers';
import { getTransferWindowStatus } from './transferWindow';

const SLOT_DEFINITIONS = [
  { slot_type: 'WK', slot_index: 0, is_playing: true },
  { slot_type: 'BAT', slot_index: 0, is_playing: true },
  { slot_type: 'BAT', slot_index: 1, is_playing: true },
  { slot_type: 'BAT', slot_index: 2, is_playing: true },
  { slot_type: 'BAT', slot_index: 3, is_playing: true },
  { slot_type: 'BAT', slot_index: 4, is_playing: true },
  { slot_type: 'BOWL', slot_index: 0, is_playing: true },
  { slot_type: 'BOWL', slot_index: 1, is_playing: true },
  { slot_type: 'BOWL', slot_index: 2, is_playing: true },
  { slot_type: 'BOWL', slot_index: 3, is_playing: true },
  { slot_type: 'BOWL', slot_index: 4, is_playing: true },
  { slot_type: 'FLEX', slot_index: 0, is_playing: true },
  { slot_type: 'BENCH', slot_index: 0, is_playing: false },
  { slot_type: 'BENCH', slot_index: 1, is_playing: false },
  { slot_type: 'BENCH', slot_index: 2, is_playing: false },
  { slot_type: 'BENCH', slot_index: 3, is_playing: false },
];

export async function getSquadByTeamId(fantasyTeamId, leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, league_id, fantasy_team_id, captain_player_id, vice_captain_player_id,
            budget_remaining, free_trades_banked, last_settled_round_number,
            created_at, updated_at
     FROM squads
     WHERE fantasy_team_id = $1 AND league_id = $2`,
    [fantasyTeamId, leagueId]
  );
  return rows[0] ?? null;
}

export async function ensureSquad(fantasyTeamId, leagueId = DEFAULT_LEAGUE_ID) {
  let squad = await getSquadByTeamId(fantasyTeamId, leagueId);
  if (squad) {
    return squad;
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const leagueResult = await client.query(
      'SELECT salary_cap FROM leagues WHERE id = $1',
      [leagueId]
    );
    const salaryCap = Number(leagueResult.rows[0]?.salary_cap ?? SALARY_CAP);

    const insertSquad = await client.query(
      `INSERT INTO squads (league_id, fantasy_team_id, budget_remaining)
       VALUES ($1, $2, $3)
       RETURNING id, league_id, fantasy_team_id, captain_player_id, vice_captain_player_id,
                 budget_remaining, free_trades_banked, last_settled_round_number,
                 created_at, updated_at`,
      [leagueId, fantasyTeamId, salaryCap]
    );
    squad = insertSquad.rows[0];

    for (const slot of SLOT_DEFINITIONS) {
      await client.query(
        `INSERT INTO squad_slots (squad_id, slot_type, slot_index, is_playing)
         VALUES ($1, $2, $3, $4)`,
        [squad.id, slot.slot_type, slot.slot_index, slot.is_playing]
      );
    }

    await client.query('COMMIT');
    return squad;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getSquadWithSlots(fantasyTeamId, leagueId = DEFAULT_LEAGUE_ID) {
  const squad = await ensureSquad(fantasyTeamId, leagueId);
  const pool = getPool();

  const { rows: slotRows } = await pool.query(
    `SELECT
       ss.id,
       ss.slot_type,
       ss.slot_index,
       ss.player_id,
       ss.is_playing,
       p.full_name,
       p.role,
       p.franchise_name,
       p.is_overseas,
       p.image_url,
       pp.price
     FROM squad_slots ss
     LEFT JOIN players p ON p.id = ss.player_id
     LEFT JOIN LATERAL (
       SELECT price
       FROM player_prices
       WHERE player_id = p.id AND effective_to IS NULL
       ORDER BY effective_from DESC
       LIMIT 1
     ) pp ON TRUE
     WHERE ss.squad_id = $1
     ORDER BY ss.is_playing DESC,
       CASE ss.slot_type
         WHEN 'WK' THEN 1 WHEN 'BAT' THEN 2 WHEN 'BOWL' THEN 3
         WHEN 'FLEX' THEN 4 WHEN 'BENCH' THEN 5 ELSE 6
       END,
       ss.slot_index ASC`,
    [squad.id]
  );

  const slots = slotRows.map(mapSlotRow);
  const structureConfig = await getSquadStructureConfig(leagueId);
  const leagueCap = await getLeagueSalaryCap(leagueId);
  const computedRemaining = calculateBudgetRemaining(slots, leagueCap);
  const transferWindow = await getTransferWindowStatus({
    fantasyTeamId,
    squadId: squad.id,
    freeTradesBanked: squad.free_trades_banked,
    lastSettledRoundNumber: squad.last_settled_round_number ?? 0,
    leagueId,
    squadComplete: slots.filter((s) => s.player_id).length >= structureConfig.reduce((n, r) => n + r.required_count, 0),
  });

  return {
    squad: {
      id: squad.id,
      leagueId: squad.league_id,
      fantasyTeamId: squad.fantasy_team_id,
      captainPlayerId: squad.captain_player_id,
      viceCaptainPlayerId: squad.vice_captain_player_id,
      budgetRemaining: computedRemaining,
      salaryCap: leagueCap,
      freeTradesBanked: transferWindow.bankedFreeTrades ?? squad.free_trades_banked,
      lastSettledRoundNumber: squad.last_settled_round_number ?? 0,
    },
    slots,
    structureConfig,
    filledCount: slots.filter((s) => s.player_id).length,
    requiredCount: structureConfig.reduce((n, r) => n + r.required_count, 0),
    transferWindow,
  };
}


async function getLeagueSalaryCap(leagueId) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT salary_cap FROM leagues WHERE id = $1',
    [leagueId]
  );
  return Number(rows[0]?.salary_cap ?? SALARY_CAP);
}

function mapSlotRow(row) {
  return {
    id: row.id,
    slot_type: row.slot_type,
    slot_index: row.slot_index,
    player_id: row.player_id,
    is_playing: row.is_playing,
    player: row.player_id
      ? {
          id: row.player_id,
          full_name: row.full_name,
          role: row.role,
          franchise_name: row.franchise_name,
          is_overseas: row.is_overseas,
          image_url: row.image_url,
          price: row.price != null ? Number(row.price) : 0,
        }
      : null,
  };
}

export async function assignPlayerToSlot({
  fantasyTeamId,
  slotId,
  playerId,
  leagueId = DEFAULT_LEAGUE_ID,
}) {
  const squadData = await getSquadWithSlots(fantasyTeamId, leagueId);

  await executeSquadChange({
    fantasyTeamId,
    squadData,
    slotId,
    playerInId: playerId,
    leagueId,
  });

  return getSquadWithSlots(fantasyTeamId, leagueId);
}

export async function clearSlot({
  fantasyTeamId,
  slotId,
  leagueId = DEFAULT_LEAGUE_ID,
}) {
  const squadData = await getSquadWithSlots(fantasyTeamId, leagueId);

  await executeSquadClear({
    fantasyTeamId,
    squadData,
    slotId,
    leagueId,
  });

  const updated = await getSquadWithSlots(fantasyTeamId, leagueId);
  const leagueCap = squadData.squad.salaryCap;
  const remaining = calculateBudgetRemaining(updated.slots, leagueCap);

  const pool = getPool();
  await pool.query(
    `UPDATE squads SET budget_remaining = $1, updated_at = NOW() WHERE id = $2`,
    [remaining, squadData.squad.id]
  );

  return getSquadWithSlots(fantasyTeamId, leagueId);
}

export async function setCaptain({
  fantasyTeamId,
  playerId,
  role,
  leagueId = DEFAULT_LEAGUE_ID,
}) {
  const squadData = await getSquadWithSlots(fantasyTeamId, leagueId);
  const inSquad = squadData.slots.some((s) => s.player_id === playerId);
  if (!inSquad) {
    throw new Error('Captain must be in your squad');
  }

  const pool = getPool();

  if (role === 'vice') {
    await pool.query(
      `UPDATE squads SET
         vice_captain_player_id = $1,
         captain_player_id = CASE WHEN captain_player_id = $1 THEN NULL ELSE captain_player_id END,
         updated_at = NOW()
       WHERE id = $2`,
      [playerId, squadData.squad.id]
    );
  } else {
    await pool.query(
      `UPDATE squads SET
         captain_player_id = $1,
         vice_captain_player_id = CASE WHEN vice_captain_player_id = $1 THEN NULL ELSE vice_captain_player_id END,
         updated_at = NOW()
       WHERE id = $2`,
      [playerId, squadData.squad.id]
    );
  }

  return getSquadWithSlots(fantasyTeamId, leagueId);
}
