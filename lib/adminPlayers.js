import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';

function mapAdminPlayerRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    shortName: row.short_name,
    role: row.role,
    franchiseName: row.franchise_name,
    isOverseas: row.is_overseas,
    active: row.active,
    price: row.price != null ? Number(row.price) : null,
  };
}

export async function listAdminPlayers({
  leagueId = DEFAULT_LEAGUE_ID,
  search,
  includeInactive = true,
  limit = 200,
} = {}) {
  const pool = getPool();
  const conditions = ['p.league_id = $1'];
  const params = [leagueId];
  let paramIndex = 2;

  if (!includeInactive) {
    conditions.push('p.active = TRUE');
  }

  if (search) {
    conditions.push(`p.full_name ILIKE $${paramIndex++}`);
    params.push(`%${search}%`);
  }

  params.push(limit);

  const { rows } = await pool.query(
    `SELECT
       p.id,
       p.full_name,
       p.short_name,
       p.role,
       p.franchise_name,
       p.is_overseas,
       p.active,
       pp.price
     FROM players p
     LEFT JOIN LATERAL (
       SELECT price
       FROM player_prices
       WHERE player_id = p.id AND effective_to IS NULL
       ORDER BY effective_from DESC
       LIMIT 1
     ) pp ON TRUE
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.active DESC, p.full_name ASC
     LIMIT $${paramIndex}`,
    params
  );

  return rows.map(mapAdminPlayerRow);
}

export async function setPlayerActive(playerId, active, leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rowCount } = await pool.query(
    `UPDATE players SET active = $1, updated_at = NOW()
     WHERE id = $2 AND league_id = $3`,
    [Boolean(active), playerId, leagueId]
  );
  if (rowCount === 0) throw new Error('Player not found');
  return { playerId, active: Boolean(active) };
}

export async function updatePlayerPrice(playerId, price, leagueId = DEFAULT_LEAGUE_ID) {
  const nextPrice = Number(price);
  if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
    throw new Error('Price must be greater than 0');
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT id FROM players WHERE id = $1 AND league_id = $2',
      [playerId, leagueId]
    );
    if (!rows[0]) throw new Error('Player not found');

    await client.query(
      `UPDATE player_prices SET effective_to = NOW()
       WHERE player_id = $1 AND effective_to IS NULL`,
      [playerId]
    );

    await client.query(
      `INSERT INTO player_prices (league_id, player_id, price, effective_from)
       VALUES ($1, $2, $3, NOW())`,
      [leagueId, playerId, nextPrice]
    );

    await client.query('COMMIT');
    return { playerId, price: nextPrice };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function bulkAdjustPlayerPrices(
  { role, percentDelta },
  leagueId = DEFAULT_LEAGUE_ID
) {
  const delta = Number(percentDelta);
  if (!Number.isFinite(delta)) {
    throw new Error('Percent delta must be a number');
  }
  if (delta <= -100) {
    throw new Error('Percent delta must be greater than -100');
  }

  const pool = getPool();
  const params = [leagueId];
  let roleClause = '';
  if (role) {
    roleClause = 'AND p.role = $2';
    params.push(role);
  }

  const { rows: players } = await pool.query(
    `SELECT p.id, pp.price
     FROM players p
     JOIN LATERAL (
       SELECT price
       FROM player_prices
       WHERE player_id = p.id AND effective_to IS NULL
       ORDER BY effective_from DESC
       LIMIT 1
     ) pp ON TRUE
     WHERE p.league_id = $1 AND p.active = TRUE ${roleClause}`,
    params
  );

  let updated = 0;
  for (const player of players) {
    const current = Number(player.price);
    if (!Number.isFinite(current)) continue;
    const next = Math.max(0.5, Math.round(current * (1 + delta / 100) * 100) / 100);
    if (next === current) continue;
    await updatePlayerPrice(player.id, next, leagueId);
    updated += 1;
  }

  return { updated, total: players.length };
}
