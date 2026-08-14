/**
 * Seed player pool from Sportmonks squads into players + player_prices.
 *
 * Your Sportmonks token may not include IPL — the script auto-detects available
 * leagues and discovers teams from fixtures. Override with SPORTMONKS_LEAGUE_ID.
 *
 * Usage: node --env-file=.env.local scripts/seed-players.js
 */
const { Client } = require('pg');

const DEFAULT_LEAGUE_ID = '00000000-0000-4000-8000-000000000001';

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

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — ${url.split('?')[0]}`);
  }
  return res.json();
}

async function listAvailableLeagues(apiToken) {
  const json = await fetchJson(
    `https://cricket.sportmonks.com/api/v2.0/leagues?api_token=${apiToken}&per_page=50`
  );
  return json.data || [];
}

function pickLeague(leagues, preferredId) {
  if (preferredId) {
    const match = leagues.find((l) => String(l.id) === String(preferredId));
    if (match) return match;
    console.warn(`SPORTMONKS_LEAGUE_ID=${preferredId} not in your plan; auto-selecting.`);
  }

  // Prefer franchise T20 leagues, then internationals
  const priority = ['Big Bash', 'BBL', 'CPL', 'Caribbean', 'Hundred', 'IPL', 'Twenty20 International', 'T20'];
  for (const needle of priority) {
    const hit = leagues.find((l) => l.name?.toLowerCase().includes(needle.toLowerCase()));
    if (hit) return hit;
  }

  return leagues[0] || null;
}

async function leagueHasSquadData(apiToken, league) {
  const teams = await discoverTeams(apiToken, league.id);
  const sample = teams.find((t) => t.name !== 'TBC' && !t.name?.startsWith('TBD'));
  if (!sample) return false;

  try {
    const squad = await fetchSquad(
      apiToken,
      sample.id,
      sample.seasonId || league.season_id
    );
    return squad.length > 0;
  } catch {
    return false;
  }
}

async function resolveLeague(apiToken, leagues, preferredId) {
  if (preferredId) {
    const preferred = leagues.find((l) => String(l.id) === String(preferredId));
    if (preferred && (await leagueHasSquadData(apiToken, preferred))) {
      return preferred;
    }
    if (preferred) {
      console.warn(`League ${preferred.name} has no squad data on your plan; trying others…`);
    }
  }

  for (const league of leagues) {
    console.log(`Checking squad data for ${league.name}…`);
    if (await leagueHasSquadData(apiToken, league)) {
      return league;
    }
  }

  return null;
}

async function discoverTeams(apiToken, leagueId) {
  const start = new Date();
  start.setMonth(start.getMonth() - 6);
  const end = new Date();
  end.setMonth(end.getMonth() + 12);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const range = `${fmt(start)},${fmt(end)}`;

  const teams = new Map();
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 5) {
    const params = new URLSearchParams({
      api_token: apiToken,
      'filter[league_id]': String(leagueId),
      'filter[starts_between]': range,
      include: 'localteam,visitorteam',
      per_page: '50',
      page: String(page),
    });

    const json = await fetchJson(
      `https://cricket.sportmonks.com/api/v2.0/fixtures?${params.toString()}`
    );
    const fixtures = json.data || [];

    for (const fixture of fixtures) {
      if (fixture.localteam?.id) {
        teams.set(fixture.localteam.id, {
          id: fixture.localteam.id,
          name: fixture.localteam.name,
          seasonId: fixture.season_id,
        });
      }
      if (fixture.visitorteam?.id) {
        teams.set(fixture.visitorteam.id, {
          id: fixture.visitorteam.id,
          name: fixture.visitorteam.name,
          seasonId: fixture.season_id,
        });
      }
    }

    hasMore = Boolean(json.links?.next);
    page += 1;
  }

  return [...teams.values()];
}

async function fetchSquad(apiToken, teamId, seasonId) {
  const json = await fetchJson(
    `https://cricket.sportmonks.com/api/v2.0/teams/${teamId}/squad/${seasonId}?api_token=${apiToken}`
  );
  return json.data?.squad || [];
}

async function main() {
  const apiToken = process.env.SPORTMONKS_API_TOKEN;
  const connectionString = process.env.DATABASE_URL;
  const preferredLeagueId = process.env.SPORTMONKS_LEAGUE_ID;

  if (!apiToken) {
    console.error('ERROR: Set SPORTMONKS_API_TOKEN in .env.local');
    process.exit(1);
  }
  if (!connectionString) {
    console.error('ERROR: Set DATABASE_URL in .env.local');
    process.exit(1);
  }

  const leagues = await listAvailableLeagues(apiToken);
  if (leagues.length === 0) {
    console.error('ERROR: No leagues available on your Sportmonks plan.');
    process.exit(1);
  }

  console.log('Available leagues:', leagues.map((l) => `${l.id}=${l.name}`).join(', '));

  const league = await resolveLeague(apiToken, leagues, preferredLeagueId);
  if (!league) {
    console.error(
      'ERROR: No squad data available on your Sportmonks plan. CricAPI sync (Phase 9) will replace this importer.'
    );
    process.exit(1);
  }

  console.log(`Using league ${league.id} (${league.name}), season ${league.season_id}`);

  const teams = (await discoverTeams(apiToken, league.id)).filter(
    (t) => t.name !== 'TBC' && !t.name?.startsWith('TBD')
  );
  if (teams.length === 0) {
    console.error(
      `ERROR: No teams found for league ${league.id}. Try SPORTMONKS_LEAGUE_ID=5 (BBL) or check your plan.`
    );
    process.exit(1);
  }

  console.log(`Discovered ${teams.length} teams from fixtures.`);

  const client = new Client({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  let inserted = 0;
  let updated = 0;
  let skippedTeams = 0;

  try {
    for (const team of teams) {
      const seasonId = team.seasonId || league.season_id;
      console.log(`Fetching ${team.name} (team ${team.id}, season ${seasonId})…`);

      let squad;
      try {
        squad = await fetchSquad(apiToken, team.id, seasonId);
      } catch (err) {
        console.warn(`  Skipped: ${err.message}`);
        skippedTeams += 1;
        continue;
      }

      if (squad.length === 0) {
        console.warn(`  Skipped: empty squad`);
        skippedTeams += 1;
        continue;
      }

      for (const member of squad) {
        const player = member.player || member;
        if (!player?.id || !player?.fullname) continue;

        const role = mapRole(player.position || player.role);
        const price = defaultPrice(role);
        const country = player.country?.name || player.nationality || '';
        const isOverseas = country
          ? !String(country).toLowerCase().includes('australia') &&
            !String(country).toLowerCase().includes('india') &&
            !String(country).toLowerCase().includes('south africa')
          : false;

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
            isOverseas,
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

    if (rows[0].count === 0) {
      console.error('ERROR: 0 players seeded. Check Sportmonks plan and SPORTMONKS_LEAGUE_ID.');
      process.exit(1);
    }

    console.log(
      `Seed OK — ${rows[0].count} players in pool (${inserted} new, ${updated} updated, ${skippedTeams} teams skipped).`
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
