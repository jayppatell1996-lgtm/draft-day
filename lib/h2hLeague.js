import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';
import {
  generateRoundRobin,
  getRoundRobinPlan,
  MIN_H2H_TEAMS,
  MAX_H2H_TEAMS,
  STANDINGS_POINTS,
} from './roundRobin';

export async function getLeagueTeams(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, name, created_at
     FROM fantasy_teams
     WHERE league_id = $1
     ORDER BY created_at ASC, name ASC`,
    [leagueId]
  );
  return rows;
}

export async function scheduleExists(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM rounds WHERE league_id = $1 AND is_playoff = FALSE',
    [leagueId]
  );
  return rows[0].count > 0;
}

export async function createH2HSchedule(leagueId = DEFAULT_LEAGUE_ID) {
  const teams = await getLeagueTeams(leagueId);
  if (teams.length < MIN_H2H_TEAMS) {
    throw new Error(
      `Need at least ${MIN_H2H_TEAMS} fantasy teams to generate a schedule (found ${teams.length}).`
    );
  }
  if (teams.length > MAX_H2H_TEAMS) {
    throw new Error(
      `At most ${MAX_H2H_TEAMS} fantasy teams supported (found ${teams.length}).`
    );
  }

  if (await scheduleExists(leagueId)) {
    throw new Error('H2H schedule already exists for this league.');
  }

  const teamIds = teams.map((t) => t.id);
  const schedule = generateRoundRobin(teamIds);

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const round of schedule) {
      const roundResult = await client.query(
        `INSERT INTO rounds (league_id, round_number, name, is_playoff)
         VALUES ($1, $2, $3, FALSE)
         RETURNING id`,
        [leagueId, round.roundNumber, `Round ${round.roundNumber}`]
      );
      const roundId = roundResult.rows[0].id;

      for (const matchup of round.matchups) {
        await client.query(
          `INSERT INTO h2h_matchups (
             league_id, round_id, home_team_id, away_team_id, status
           ) VALUES ($1, $2, $3, $4, 'scheduled')`,
          [leagueId, roundId, matchup.homeTeamId, matchup.awayTeamId]
        );
      }
    }

    await client.query(
      `UPDATE leagues SET status = 'active', updated_at = NOW() WHERE id = $1`,
      [leagueId]
    );

    await client.query('COMMIT');

    const plan = getRoundRobinPlan(teams.length);

    return {
      teamCount: teams.length,
      rounds: schedule.length,
      matchups: schedule.reduce((n, r) => n + r.matchups.length, 0),
      plan,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getRounds(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, round_number, name, is_playoff, starts_at, ends_at
     FROM rounds
     WHERE league_id = $1 AND is_playoff = FALSE
     ORDER BY round_number ASC`,
    [leagueId]
  );
  return rows.map((r) => ({
    id: r.id,
    roundNumber: r.round_number,
    name: r.name,
    isPlayoff: r.is_playoff,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
  }));
}

export async function getRoundMatchups(roundNumber, leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
       m.id,
       m.home_points,
       m.away_points,
       m.result,
       m.status,
       r.round_number,
       r.name AS round_name,
       ht.id AS home_id,
       ht.name AS home_name,
       at.id AS away_id,
       at.name AS away_name
     FROM h2h_matchups m
     JOIN rounds r ON r.id = m.round_id
     JOIN fantasy_teams ht ON ht.id = m.home_team_id
     JOIN fantasy_teams at ON at.id = m.away_team_id
     WHERE m.league_id = $1 AND r.round_number = $2 AND r.is_playoff = FALSE
     ORDER BY ht.name ASC`,
    [leagueId, roundNumber]
  );

  return rows.map((row) => ({
    id: row.id,
    roundNumber: row.round_number,
    roundName: row.round_name,
    home: {
      id: row.home_id,
      name: row.home_name,
      points: row.home_points != null ? Number(row.home_points) : null,
    },
    away: {
      id: row.away_id,
      name: row.away_name,
      points: row.away_points != null ? Number(row.away_points) : null,
    },
    result: row.result,
    status: row.status,
  }));
}

export async function getStandings(leagueId = DEFAULT_LEAGUE_ID) {
  const teams = await getLeagueTeams(leagueId);
  const pool = getPool();

  const { rows: matchups } = await pool.query(
    `SELECT home_team_id, away_team_id, home_points, away_points, result, status
     FROM h2h_matchups
     WHERE league_id = $1 AND result IS NOT NULL AND result <> 'no_result'`,
    [leagueId]
  );

  const stats = new Map(
    teams.map((t) => [
      t.id,
      {
        teamId: t.id,
        teamName: t.name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        scored: 0,
        against: 0,
      },
    ])
  );

  for (const m of matchups) {
    const home = stats.get(m.home_team_id);
    const away = stats.get(m.away_team_id);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;

    if (m.home_points != null) {
      home.scored += Number(m.home_points);
      away.against += Number(m.home_points);
    }
    if (m.away_points != null) {
      away.scored += Number(m.away_points);
      home.against += Number(m.away_points);
    }

    if (m.result === 'home_win') {
      home.wins += 1;
      home.points += STANDINGS_POINTS.win;
      away.losses += 1;
      away.points += STANDINGS_POINTS.loss;
    } else if (m.result === 'away_win') {
      away.wins += 1;
      away.points += STANDINGS_POINTS.win;
      home.losses += 1;
      home.points += STANDINGS_POINTS.loss;
    } else if (m.result === 'draw') {
      home.draws += 1;
      away.draws += 1;
      home.points += STANDINGS_POINTS.draw;
      away.points += STANDINGS_POINTS.draw;
    }
  }

  return [...stats.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.teamName.localeCompare(b.teamName);
  });
}

export async function getLeagueSummary(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT id, name, season_label, status, max_teams FROM leagues WHERE id = $1',
    [leagueId]
  );
  const league = rows[0];
  if (!league) return null;

  const teamCount = (await getLeagueTeams(leagueId)).length;
  const hasSchedule = await scheduleExists(leagueId);
  const schedulePlan = getRoundRobinPlan(teamCount);
  const canGenerateSchedule =
    !hasSchedule &&
    teamCount >= MIN_H2H_TEAMS &&
    teamCount <= MAX_H2H_TEAMS;

  return {
    id: league.id,
    name: league.name,
    seasonLabel: league.season_label,
    status: league.status,
    maxTeams: league.max_teams,
    teamCount,
    hasSchedule,
    minTeams: MIN_H2H_TEAMS,
    maxTeamsSupported: MAX_H2H_TEAMS,
    schedulePlan,
    canGenerateSchedule,
  };
}
