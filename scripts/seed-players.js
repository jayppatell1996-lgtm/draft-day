/**
 * Seed IPL player pool from Sportmonks squads into players + player_prices.
 * Usage: node --env-file=.env.local scripts/seed-players.js
 */
const { Client } = require('pg');

const DEFAULT_LEAGUE_ID = '00000000-0000-4000-8000-000000000001';

// IPL franchise team IDs on Sportmonks (league_id=1)
const IPL_TEAMS = [
  { id: 1, name: 'Royal Challengers Bangalore' },
  { id: 2, name: 'Mumbai Indians' },
  { id: 3, name: 'Delhi Capitals' },
  { id: 4, name: 'Kolkata Knight Riders' },
  { id: 5, name: 'Rajasthan Royals' },
  { id: 6, name: 'Punjab Kings' },
  { id: 7, name: 'Sunrisers Hyderabad' },
  { id: 8, name: 'Chennai Super Kings' },
  { id: 9, name: 'Gujarat Titans' },
  { id: 10, name: 'Lucknow Super Giants' },
];

const SEASON_ID = 1;

function mapRole(position) {
  const value = String(position?.name || position || '').toLowerCase();
  if (value.includes('wicket') || value === 'wk') return 'WK';
  if (value.includes('all') || value === 'ar') return 'AR';
  if (value.includes('bowl')) return 'BOWL';
  if (value.includes('bat')) return 'BAT';
  return 'BAT';
}

function defaultPrice(role) {
  switch (role) {
    case 'WK':
      return 8.5;
    case 'AR':
      return 10.0;
    case 'BOWL':
      return 9.0;
    default:
      return 9.5;
  }
}

async function fetchSquad(apiToken, teamId) {
  const url = `https://cricket.sportmonks.com/api/v2.0/teams/${teamId}/squad/${SEASON_ID}?api_token=${apiToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sportmonks squad ${teamId}: HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data?.squad || json.data || [];
}

async function main() {
  const apiToken = process.env.SPORTMONKS_API_TOKEN;
  const connectionString = process.env.DATABASE_URL;

  if (!apiToken) {
    console.error('ERROR: Set SPORTMONKS_API_TOKEN in .env.local');
    process.exit(1);
  }
  if (!connectionString) {
    console.error('ERROR: Set DATABASE_URL in .env.local');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  let inserted = 0;
  let updated = 0;

  try {
    for (const team of IPL_TEAMS) {
      console.log(`Fetching ${team.name}…`);
      let squad;
      try {
        squad = await fetchSquad(apiToken, team.id);
      } catch (err) {
        console.warn(`  Skipped: ${err.message}`);
        continue;
      }

      for (const member of squad) {
        const player = member.player || member;
        if (!player?.id || !player?.fullname) continue;

        const role = mapRole(player.position || player.role);
        const price = defaultPrice(role);

        const upsert = await client.query(
          `INSERT INTO players (
             league_id, external_id, full_name, short_name, role,
             franchise_external_id, franchise_name, is_overseas, image_url, active
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
           ON CONFLICT (league_id, external_id) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             role = EXCLUDED.role,
             franchise_external_id = EXCLUDED.franchise_external_id,
             franchise_name = EXCLUDED.franchise_name,
             image_url = EXCLUDED.image_url,
             updated_at = NOW()
           RETURNING id, (xmax = 0) AS is_insert`,
          [
            DEFAULT_LEAGUE_ID,
            player.id,
            player.fullname,
            player.fullname?.split(' ').pop() || null,
            role,
            team.id,
            team.name,
            Boolean(player.nationality && !String(player.nationality).toLowerCase().includes('india')),
            player.image_path || null,
          ]
        );

        const playerId = upsert.rows[0].id;
        if (upsert.rows[0].is_insert) inserted += 1;
        else updated += 1;

        const existingPrice = await client.query(
          `SELECT id FROM player_prices
           WHERE player_id = $1 AND effective_to IS NULL`,
          [playerId]
        );

        if (existingPrice.rows.length === 0) {
          await client.query(
            `INSERT INTO player_prices (league_id, player_id, price)
             VALUES ($1, $2, $3)`,
            [DEFAULT_LEAGUE_ID, playerId, price]
          );
        }
      }
    }

    const { rows } = await client.query(
      'SELECT COUNT(*)::int AS count FROM players WHERE league_id = $1',
      [DEFAULT_LEAGUE_ID]
    );

    console.log(`Seed OK — ${rows[0].count} players in pool (${inserted} new, ${updated} updated).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
