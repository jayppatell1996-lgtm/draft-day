import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';
import { validateSwap } from './squadValidation';
import { getPlayerWithPrice } from './players';
import { assertPlayersUnlocked } from './locks';
import { getTransferWindowStatus } from './transferWindow';
import { getTradeRules } from './leagueConfig';

export async function getTradeLog({
  fantasyTeamId,
  roundNumber,
  leagueId = DEFAULT_LEAGUE_ID,
  limit = 50,
}) {
  const pool = getPool();
  const params = [fantasyTeamId, leagueId, limit];
  let roundClause = '';

  if (roundNumber != null) {
    roundClause = 'AND r.round_number = $4';
    params.push(roundNumber);
  }

  const { rows } = await pool.query(
    `SELECT
       tl.id,
       tl.action,
       tl.payload,
       tl.created_at,
       r.round_number,
       r.name AS round_name,
       t.player_in_id,
       t.player_out_id,
       t.used_free_trade,
       t.cost_delta,
       pin.full_name AS player_in_name,
       pout.full_name AS player_out_name
     FROM trade_log tl
     LEFT JOIN rounds r ON r.id = tl.round_id
     LEFT JOIN transfers t ON t.id = tl.transfer_id
     LEFT JOIN players pin ON pin.id = t.player_in_id
     LEFT JOIN players pout ON pout.id = t.player_out_id
     WHERE tl.fantasy_team_id = $1 AND tl.league_id = $2
     ${roundClause}
     ORDER BY tl.created_at DESC
     LIMIT $3`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    payload: row.payload,
    createdAt: row.created_at,
    roundNumber: row.round_number,
    roundName: row.round_name,
    transfer: row.player_in_id
      ? {
          playerIn: { id: row.player_in_id, name: row.player_in_name },
          playerOut: { id: row.player_out_id, name: row.player_out_name },
          usedFreeTrade: row.used_free_trade,
          costDelta: row.cost_delta != null ? Number(row.cost_delta) : null,
        }
      : null,
  }));
}

/**
 * Execute a squad change with transfer rules when applicable.
 */
export async function executeSquadChange({
  fantasyTeamId,
  squadData,
  slotId,
  playerInId,
  playerOutId = null,
  leagueId = DEFAULT_LEAGUE_ID,
}) {
  const targetSlot = squadData.slots.find((s) => s.id === slotId);
  if (!targetSlot) {
    throw new Error('Slot not found');
  }

  const outgoingId = playerOutId ?? targetSlot.player_id;
  const isReplacement = Boolean(outgoingId);
  const squadComplete = squadData.filledCount >= squadData.requiredCount;

  const windowStatus = await getTransferWindowStatus({
    fantasyTeamId,
    squadId: squadData.squad.id,
    freeTradesBanked: squadData.squad.freeTradesBanked,
    lastSettledRoundNumber: squadData.squad.lastSettledRoundNumber ?? 0,
    leagueId,
    squadComplete,
  });

  const isTransfer = windowStatus.mode !== 'initial_build' && isReplacement;

  if (isTransfer && !windowStatus.canTransfer) {
    if (!windowStatus.windowOpen) {
      throw new Error('Transfer window is closed until the next lock deadline');
    }
    if (windowStatus.mode === 'playoffs' && windowStatus.tradesRemainingThisRound === 0) {
      const rules = await getTradeRules(leagueId);
      throw new Error(
        `Playoff trade limit reached (${rules.playoffTradeAllowance} total, ${rules.playoffFreeTrades} free)`
      );
    }
  }

  const playerIn = await getPlayerWithPrice(playerInId, leagueId);
  if (!playerIn || playerIn.price == null) {
    throw new Error('Player not found or has no price');
  }

  if (isTransfer) {
    await assertPlayersUnlocked([playerInId, outgoingId], leagueId);
  }

  const validation = validateSwap({
    slots: squadData.slots,
    slotId,
    player: {
      id: playerIn.id,
      role: playerIn.role,
      full_name: playerIn.fullName,
      price: playerIn.price,
    },
    salaryCap: squadData.squad.salaryCap,
  });

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  let usedFreeTrade = false;
  let roundId = windowStatus.currentRound?.id ?? null;

  if (isTransfer) {
    if (windowStatus.mode === 'playoffs') {
      usedFreeTrade = false;
    } else if (windowStatus.freeTradesAvailable > 0) {
      usedFreeTrade = true;
    }
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let playerOutPrice = 0;
    if (outgoingId) {
      const outPlayer = await getPlayerWithPrice(outgoingId, leagueId);
      playerOutPrice = outPlayer?.price ?? targetSlot.player?.price ?? 0;
    }

    await client.query(
      `UPDATE squad_slots SET player_id = $1 WHERE id = $2 AND squad_id = $3`,
      [playerInId, slotId, squadData.squad.id]
    );

    if (outgoingId && (squadData.squad.captainPlayerId === outgoingId)) {
      await client.query(
        `UPDATE squads SET captain_player_id = NULL WHERE id = $1`,
        [squadData.squad.id]
      );
    }
    if (outgoingId && (squadData.squad.viceCaptainPlayerId === outgoingId)) {
      await client.query(
        `UPDATE squads SET vice_captain_player_id = NULL WHERE id = $1`,
        [squadData.squad.id]
      );
    }

    await client.query(
      `UPDATE squads SET budget_remaining = $1, updated_at = NOW() WHERE id = $2`,
      [validation.budgetRemaining, squadData.squad.id]
    );

    let transferId = null;

    if (isTransfer && outgoingId) {
      const costDelta = Number((playerIn.price - playerOutPrice).toFixed(2));
      const transferResult = await client.query(
        `INSERT INTO transfers (
           league_id, squad_id, round_id, player_in_id, player_out_id,
           price_in, price_out, cost_delta, used_free_trade
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          leagueId,
          squadData.squad.id,
          roundId,
          playerInId,
          outgoingId,
          playerIn.price,
          playerOutPrice,
          costDelta,
          usedFreeTrade,
        ]
      );
      transferId = transferResult.rows[0].id;

      if (usedFreeTrade) {
        const rules = await getTradeRules(leagueId);
        const freeUsedBefore = windowStatus.freeTradesUsedThisRound ?? 0;
        if (freeUsedBefore >= rules.freeTradesPerRound) {
          await client.query(
            `UPDATE squads SET free_trades_banked = GREATEST(0, free_trades_banked - 1), updated_at = NOW()
             WHERE id = $1`,
            [squadData.squad.id]
          );
        }
      }

      await client.query(
        `INSERT INTO trade_log (league_id, squad_id, fantasy_team_id, transfer_id, round_id, action, payload)
         VALUES ($1, $2, $3, $4, $5, 'transfer', $6)`,
        [
          leagueId,
          squadData.squad.id,
          fantasyTeamId,
          transferId,
          roundId,
          JSON.stringify({
            slotType: targetSlot.slot_type,
            playerIn: playerIn.fullName,
            playerOut: targetSlot.player?.full_name ?? outgoingId,
            usedFreeTrade,
            costDelta: Number((playerIn.price - playerOutPrice).toFixed(2)),
          }),
        ]
      );
    } else if (!isReplacement) {
      await client.query(
        `INSERT INTO trade_log (league_id, squad_id, fantasy_team_id, round_id, action, payload)
         VALUES ($1, $2, $3, $4, 'squad_pick', $5)`,
        [
          leagueId,
          squadData.squad.id,
          fantasyTeamId,
          roundId,
          JSON.stringify({
            slotType: targetSlot.slot_type,
            playerIn: playerIn.fullName,
          }),
        ]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function executeSquadClear({
  fantasyTeamId,
  squadData,
  slotId,
  leagueId = DEFAULT_LEAGUE_ID,
}) {
  const targetSlot = squadData.slots.find((s) => s.id === slotId);
  if (!targetSlot?.player_id) {
    throw new Error('Slot is already empty');
  }

  const squadComplete = squadData.filledCount >= squadData.requiredCount;
  const windowStatus = await getTransferWindowStatus({
    fantasyTeamId,
    squadId: squadData.squad.id,
    freeTradesBanked: squadData.squad.freeTradesBanked,
    lastSettledRoundNumber: squadData.squad.lastSettledRoundNumber ?? 0,
    leagueId,
    squadComplete,
  });

  if (windowStatus.mode !== 'initial_build') {
    throw new Error('Remove is only allowed during initial squad build. Use a transfer to swap players.');
  }

  const pool = getPool();
  await pool.query(
    `UPDATE squad_slots SET player_id = NULL WHERE id = $1 AND squad_id = $2`,
    [slotId, squadData.squad.id]
  );

  if (squadData.squad.captainPlayerId === targetSlot.player_id) {
    await pool.query(`UPDATE squads SET captain_player_id = NULL WHERE id = $1`, [squadData.squad.id]);
  }
  if (squadData.squad.viceCaptainPlayerId === targetSlot.player_id) {
    await pool.query(`UPDATE squads SET vice_captain_player_id = NULL WHERE id = $1`, [squadData.squad.id]);
  }
}
