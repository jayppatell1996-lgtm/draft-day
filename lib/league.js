import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';

export async function getDefaultLeague() {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, name, season_label, salary_cap, max_teams, status
     FROM leagues
     WHERE id = $1`,
    [DEFAULT_LEAGUE_ID]
  );
  return rows[0] ?? null;
}

export async function getSquadStructureConfig(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT slot_type, required_count, is_playing
     FROM squad_structure_config
     WHERE league_id = $1
     ORDER BY is_playing DESC, slot_type`,
    [leagueId]
  );
  return rows;
}
