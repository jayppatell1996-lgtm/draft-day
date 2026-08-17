import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';

export async function listAdminLockTimes(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
       lt.id,
       lt.fixture_id,
       lt.franchise_external_id,
       lt.franchise_name,
       lt.locks_at,
       f.external_fixture_id,
       f.local_team_name,
       f.visitor_team_name,
       f.starts_at AS fixture_starts_at
     FROM lock_times lt
     JOIN fixtures f ON f.id = lt.fixture_id
     WHERE lt.league_id = $1
     ORDER BY lt.locks_at ASC`,
    [leagueId]
  );

  return rows.map((row) => ({
    id: row.id,
    fixtureId: row.fixture_id,
    externalFixtureId: row.external_fixture_id,
    franchiseExternalId: row.franchise_external_id,
    franchiseName: row.franchise_name,
    locksAt: row.locks_at,
    fixtureLabel: `${row.local_team_name} vs ${row.visitor_team_name}`,
    fixtureStartsAt: row.fixture_starts_at,
  }));
}

export async function listAdminFixtures(leagueId = DEFAULT_LEAGUE_ID, limit = 50) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, external_fixture_id, local_team_name, visitor_team_name,
            local_team_external_id, visitor_team_external_id, starts_at
     FROM fixtures
     WHERE league_id = $1
     ORDER BY starts_at ASC
     LIMIT $2`,
    [leagueId, limit]
  );

  return rows.map((row) => ({
    id: row.id,
    externalFixtureId: row.external_fixture_id,
    localTeamName: row.local_team_name,
    visitorTeamName: row.visitor_team_name,
    localTeamExternalId: row.local_team_external_id,
    visitorTeamExternalId: row.visitor_team_external_id,
    startsAt: row.starts_at,
    label: `${row.local_team_name} vs ${row.visitor_team_name}`,
  }));
}

export async function upsertLockTime(input, leagueId = DEFAULT_LEAGUE_ID) {
  const fixtureId = input.fixtureId;
  const franchiseExternalId = input.franchiseExternalId != null
    ? Number(input.franchiseExternalId)
    : null;
  const franchiseName = String(input.franchiseName ?? '').trim();
  const locksAt = new Date(input.locksAt);

  if (!fixtureId) throw new Error('Fixture is required');
  if (!franchiseName) throw new Error('Franchise name is required');
  if (Number.isNaN(locksAt.getTime())) throw new Error('Invalid lock time');

  const pool = getPool();

  const { rows: fixtureRows } = await pool.query(
    'SELECT id FROM fixtures WHERE id = $1 AND league_id = $2',
    [fixtureId, leagueId]
  );
  if (!fixtureRows[0]) throw new Error('Fixture not found');

  if (input.id) {
    const { rowCount } = await pool.query(
      `UPDATE lock_times
       SET fixture_id = $1, franchise_external_id = $2, franchise_name = $3, locks_at = $4
       WHERE id = $5 AND league_id = $6`,
      [fixtureId, franchiseExternalId, franchiseName, locksAt.toISOString(), input.id, leagueId]
    );
    if (rowCount === 0) throw new Error('Lock time not found');
    return { id: input.id, updated: true };
  }

  const { rows } = await pool.query(
    `INSERT INTO lock_times (league_id, fixture_id, franchise_external_id, franchise_name, locks_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (fixture_id, franchise_external_id)
     DO UPDATE SET franchise_name = EXCLUDED.franchise_name, locks_at = EXCLUDED.locks_at
     RETURNING id`,
    [leagueId, fixtureId, franchiseExternalId, franchiseName, locksAt.toISOString()]
  );

  return { id: rows[0].id, created: true };
}

export async function deleteLockTime(lockTimeId, leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rowCount } = await pool.query(
    'DELETE FROM lock_times WHERE id = $1 AND league_id = $2',
    [lockTimeId, leagueId]
  );
  if (rowCount === 0) throw new Error('Lock time not found');
  return { deleted: true };
}
