import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';
import { MIN_H2H_TEAMS, MAX_H2H_TEAMS } from './roundRobin';

function normalizeLeagueSettingsInput(input) {
  const name = String(input.name ?? '').trim();
  const seasonLabel = String(input.seasonLabel ?? '').trim();
  const salaryCap = Number(input.salaryCap);
  const maxTeams = Number(input.maxTeams);

  if (!name || name.length > 100) {
    throw new Error('League name is required (max 100 characters)');
  }
  if (!seasonLabel || seasonLabel.length > 50) {
    throw new Error('Season label is required (max 50 characters)');
  }
  if (!Number.isFinite(salaryCap) || salaryCap <= 0) {
    throw new Error('Salary cap must be greater than 0');
  }
  if (!Number.isInteger(maxTeams) || maxTeams < MIN_H2H_TEAMS || maxTeams > MAX_H2H_TEAMS) {
    throw new Error(`Max teams must be between ${MIN_H2H_TEAMS} and ${MAX_H2H_TEAMS}`);
  }

  return { name, seasonLabel, salaryCap, maxTeams };
}

export async function getLeagueSettings(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT l.name, l.season_label, l.salary_cap, l.max_teams, l.status,
            (SELECT COUNT(*)::int FROM fantasy_teams ft WHERE ft.league_id = l.id) AS team_count
     FROM leagues l
     WHERE l.id = $1`,
    [leagueId]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    name: row.name,
    seasonLabel: row.season_label,
    salaryCap: Number(row.salary_cap),
    maxTeams: row.max_teams,
    status: row.status,
    teamCount: row.team_count,
  };
}

export async function updateLeagueSettings(input, leagueId = DEFAULT_LEAGUE_ID) {
  const settings = normalizeLeagueSettingsInput(input);
  const pool = getPool();

  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM fantasy_teams WHERE league_id = $1',
    [leagueId]
  );
  const teamCount = rows[0].count;

  if (settings.maxTeams < teamCount) {
    throw new Error(
      `Max teams (${settings.maxTeams}) cannot be below current registered teams (${teamCount})`
    );
  }

  await pool.query(
    `UPDATE leagues
     SET name = $1, season_label = $2, salary_cap = $3, max_teams = $4, updated_at = NOW()
     WHERE id = $5`,
    [settings.name, settings.seasonLabel, settings.salaryCap, settings.maxTeams, leagueId]
  );

  return settings;
}
