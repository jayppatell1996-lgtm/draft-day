import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';

export async function listLeaguePlayers({
  leagueId = DEFAULT_LEAGUE_ID,
  role,
  franchiseExternalId,
  search,
  excludePlayerIds = [],
}) {
  const pool = getPool();
  const conditions = ['p.league_id = $1', 'p.active = TRUE'];
  const params = [leagueId];
  let paramIndex = 2;

  if (role) {
    conditions.push(`p.role = $${paramIndex++}`);
    params.push(role);
  }

  if (franchiseExternalId) {
    conditions.push(`p.franchise_external_id = $${paramIndex++}`);
    params.push(franchiseExternalId);
  }

  if (search) {
    conditions.push(`p.full_name ILIKE $${paramIndex++}`);
    params.push(`%${search}%`);
  }

  if (excludePlayerIds.length > 0) {
    conditions.push(`p.id <> ALL($${paramIndex++}::uuid[])`);
    params.push(excludePlayerIds);
  }

  const { rows } = await pool.query(
    `SELECT
       p.id,
       p.external_id,
       p.full_name,
       p.short_name,
       p.role,
       p.franchise_external_id,
       p.franchise_name,
       p.is_overseas,
       p.image_url,
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
     ORDER BY pp.price DESC NULLS LAST, p.full_name ASC`,
    params
  );

  return rows.map(mapPlayerRow);
}

export async function getPlayerWithPrice(playerId, leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
       p.id,
       p.external_id,
       p.full_name,
       p.short_name,
       p.role,
       p.franchise_external_id,
       p.franchise_name,
       p.is_overseas,
       p.image_url,
       pp.price
     FROM players p
     LEFT JOIN LATERAL (
       SELECT price
       FROM player_prices
       WHERE player_id = p.id AND effective_to IS NULL
       ORDER BY effective_from DESC
       LIMIT 1
     ) pp ON TRUE
     WHERE p.id = $1 AND p.league_id = $2`,
    [playerId, leagueId]
  );
  return rows[0] ? mapPlayerRow(rows[0]) : null;
}

export async function countLeaguePlayers(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM players WHERE league_id = $1 AND active = TRUE',
    [leagueId]
  );
  return rows[0].count;
}

function mapPlayerRow(row) {
  return {
    id: row.id,
    externalId: row.external_id,
    fullName: row.full_name,
    shortName: row.short_name,
    role: row.role,
    franchiseExternalId: row.franchise_external_id,
    franchiseName: row.franchise_name,
    isOverseas: row.is_overseas,
    imageUrl: row.image_url,
    price: row.price != null ? Number(row.price) : null,
  };
}

export function mapSportmonksRole(position) {
  const value = String(position || '').toLowerCase();
  if (value.includes('wicket') || value === 'wk') return 'WK';
  if (value.includes('all') || value === 'ar') return 'AR';
  if (value.includes('bowl')) return 'BOWL';
  if (value.includes('bat')) return 'BAT';
  return 'BAT';
}

export function defaultPriceForRole(role) {
  switch (role) {
    case 'WK':
      return 8.5;
    case 'AR':
      return 10.0;
    case 'BOWL':
      return 9.0;
    case 'BAT':
    default:
      return 9.5;
  }
}
