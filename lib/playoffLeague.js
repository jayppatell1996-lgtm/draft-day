import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';
import { STANDINGS_POINTS } from './roundRobin';
import { getLeagueTeams } from './h2hLeague';
import {
  MIN_PLAYOFF_TEAMS,
  PLAYOFF_STAGES,
  PLAYOFF_STAGE_LABELS,
  buildFinalPairing,
  buildQualifier2Pairing,
  getInitialPlayoffPairings,
  isMatchupDecided,
  regularSeasonComplete,
  seedTeamsFromStandings,
} from './playoffs';

function mapMatchupRow(row) {
  return {
    id: row.id,
    roundId: row.round_id,
    roundNumber: row.round_number,
    stage: row.playoff_stage,
    stageLabel: PLAYOFF_STAGE_LABELS[row.playoff_stage] || row.round_name,
    homeTeamId: row.home_id,
    homeName: row.home_name,
    awayTeamId: row.away_id,
    awayName: row.away_name,
    homePoints: row.home_points != null ? Number(row.home_points) : null,
    awayPoints: row.away_points != null ? Number(row.away_points) : null,
    result: row.result,
    status: row.status,
  };
}

export async function playoffExists(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM rounds
     WHERE league_id = $1 AND is_playoff = TRUE`,
    [leagueId]
  );
  return rows[0].count > 0;
}

export async function getRegularSeasonProgress(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (
         WHERE m.result IS NOT NULL AND m.result <> 'no_result'
       )::int AS completed
     FROM h2h_matchups m
     JOIN rounds r ON r.id = m.round_id
     WHERE m.league_id = $1 AND r.is_playoff = FALSE`,
    [leagueId]
  );
  return {
    totalMatchups: rows[0].total,
    completedMatchups: rows[0].completed,
  };
}

export async function getRegularSeasonStandings(leagueId = DEFAULT_LEAGUE_ID) {
  const teams = await getLeagueTeams(leagueId);
  const pool = getPool();

  const { rows: matchups } = await pool.query(
    `SELECT m.home_team_id, m.away_team_id, m.home_points, m.away_points, m.result
     FROM h2h_matchups m
     JOIN rounds r ON r.id = m.round_id
     WHERE m.league_id = $1
       AND r.is_playoff = FALSE
       AND m.result IS NOT NULL
       AND m.result <> 'no_result'`,
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

async function getMaxRegularRoundNumber(leagueId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT COALESCE(MAX(round_number), 0)::int AS max_round
     FROM rounds WHERE league_id = $1 AND is_playoff = FALSE`,
    [leagueId]
  );
  return rows[0].max_round;
}

async function getMatchupByStage(leagueId, stage) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
       m.id,
       m.round_id,
       m.home_points,
       m.away_points,
       m.result,
       m.status,
       r.round_number,
       r.name AS round_name,
       r.playoff_stage,
       ht.id AS home_id,
       ht.name AS home_name,
       at.id AS away_id,
       at.name AS away_name
     FROM h2h_matchups m
     JOIN rounds r ON r.id = m.round_id
     JOIN fantasy_teams ht ON ht.id = m.home_team_id
     JOIN fantasy_teams at ON at.id = m.away_team_id
     WHERE m.league_id = $1 AND r.playoff_stage = $2
     LIMIT 1`,
    [leagueId, stage]
  );
  return rows[0] ? mapMatchupRow(rows[0]) : null;
}

async function insertPlayoffRound(client, leagueId, roundNumber, stage) {
  const label = PLAYOFF_STAGE_LABELS[stage];
  const { rows } = await client.query(
    `INSERT INTO rounds (league_id, round_number, name, is_playoff, playoff_stage)
     VALUES ($1, $2, $3, TRUE, $4)
     RETURNING id`,
    [leagueId, roundNumber, label, stage]
  );
  return rows[0].id;
}

async function insertPlayoffMatchup(client, leagueId, roundId, homeTeamId, awayTeamId) {
  await client.query(
    `INSERT INTO h2h_matchups (league_id, round_id, home_team_id, away_team_id, status)
     VALUES ($1, $2, $3, $4, 'scheduled')`,
    [leagueId, roundId, homeTeamId, awayTeamId]
  );
}

export async function getPlayoffStatus(leagueId = DEFAULT_LEAGUE_ID) {
  const teamCount = (await getLeagueTeams(leagueId)).length;
  const progress = await getRegularSeasonProgress(leagueId);
  const hasPlayoffs = await playoffExists(leagueId);
  const seasonComplete = regularSeasonComplete(progress);

  return {
    teamCount,
    minPlayoffTeams: MIN_PLAYOFF_TEAMS,
    hasPlayoffs,
    regularSeasonComplete: seasonComplete,
    regularSeasonProgress: progress,
    canStartPlayoffs:
      seasonComplete &&
      !hasPlayoffs &&
      teamCount >= MIN_PLAYOFF_TEAMS,
    needsMoreTeams: teamCount < MIN_PLAYOFF_TEAMS,
  };
}

export async function createPlayoffBracket(leagueId = DEFAULT_LEAGUE_ID) {
  const status = await getPlayoffStatus(leagueId);
  if (!status.regularSeasonComplete) {
    throw new Error('Regular season is not complete — finish all H2H rounds first.');
  }
  if (status.hasPlayoffs) {
    throw new Error('Playoff bracket already exists.');
  }
  if (status.needsMoreTeams) {
    throw new Error(
      `Need at least ${MIN_PLAYOFF_TEAMS} teams for IPL playoffs (found ${status.teamCount}).`
    );
  }

  const standings = await getRegularSeasonStandings(leagueId);
  const seeds = seedTeamsFromStandings(standings);
  const pairings = getInitialPlayoffPairings(seeds);
  const baseRound = await getMaxRegularRoundNumber(leagueId);

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const q1RoundId = await insertPlayoffRound(
      client,
      leagueId,
      baseRound + 1,
      PLAYOFF_STAGES.QUALIFIER1
    );
    await insertPlayoffMatchup(
      client,
      leagueId,
      q1RoundId,
      pairings.qualifier1.homeTeamId,
      pairings.qualifier1.awayTeamId
    );

    const elimRoundId = await insertPlayoffRound(
      client,
      leagueId,
      baseRound + 2,
      PLAYOFF_STAGES.ELIMINATOR
    );
    await insertPlayoffMatchup(
      client,
      leagueId,
      elimRoundId,
      pairings.eliminator.homeTeamId,
      pairings.eliminator.awayTeamId
    );

    await client.query(
      `UPDATE leagues SET status = 'active', updated_at = NOW() WHERE id = $1`,
      [leagueId]
    );

    await client.query('COMMIT');

    return {
      seeds,
      stagesCreated: [PLAYOFF_STAGES.QUALIFIER1, PLAYOFF_STAGES.ELIMINATOR],
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function advancePlayoffBracket(leagueId = DEFAULT_LEAGUE_ID) {
  if (!(await playoffExists(leagueId))) {
    return { advanced: false, reason: 'no_playoffs' };
  }

  let q1 = await getMatchupByStage(leagueId, PLAYOFF_STAGES.QUALIFIER1);
  let elim = await getMatchupByStage(leagueId, PLAYOFF_STAGES.ELIMINATOR);
  let q2 = await getMatchupByStage(leagueId, PLAYOFF_STAGES.QUALIFIER2);
  let finalMatchup = await getMatchupByStage(leagueId, PLAYOFF_STAGES.FINAL);
  const advanced = [];

  const pool = getPool();

  if (!q2 && q1 && elim && isMatchupDecided(q1) && isMatchupDecided(elim)) {
    const pairing = buildQualifier2Pairing(q1, elim);
    if (pairing) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const roundId = await insertPlayoffRound(
          client,
          leagueId,
          Math.max(q1.roundNumber, elim.roundNumber) + 1,
          PLAYOFF_STAGES.QUALIFIER2
        );
        await insertPlayoffMatchup(
          client,
          leagueId,
          roundId,
          pairing.homeTeamId,
          pairing.awayTeamId
        );
        await client.query('COMMIT');
        advanced.push(PLAYOFF_STAGES.QUALIFIER2);
        q2 = await getMatchupByStage(leagueId, PLAYOFF_STAGES.QUALIFIER2);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  }

  if (!finalMatchup && q1 && q2 && isMatchupDecided(q1) && isMatchupDecided(q2)) {
    const pairing = buildFinalPairing(q1, q2);
    if (pairing) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const roundId = await insertPlayoffRound(
          client,
          leagueId,
          q2.roundNumber + 1,
          PLAYOFF_STAGES.FINAL
        );
        await insertPlayoffMatchup(
          client,
          leagueId,
          roundId,
          pairing.homeTeamId,
          pairing.awayTeamId
        );
        await client.query('COMMIT');
        advanced.push(PLAYOFF_STAGES.FINAL);
        finalMatchup = await getMatchupByStage(leagueId, PLAYOFF_STAGES.FINAL);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  }

  if (finalMatchup && isMatchupDecided(finalMatchup)) {
    await pool.query(
      `UPDATE leagues SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [leagueId]
    );
    advanced.push('champion');
  }

  return { advanced: advanced.length > 0, stages: advanced };
}

export async function getPlayoffBracket(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
       m.id,
       m.round_id,
       m.home_points,
       m.away_points,
       m.result,
       m.status,
       r.round_number,
       r.name AS round_name,
       r.playoff_stage,
       ht.id AS home_id,
       ht.name AS home_name,
       at.id AS away_id,
       at.name AS away_name
     FROM h2h_matchups m
     JOIN rounds r ON r.id = m.round_id
     JOIN fantasy_teams ht ON ht.id = m.home_team_id
     JOIN fantasy_teams at ON at.id = m.away_team_id
     WHERE m.league_id = $1 AND r.is_playoff = TRUE
     ORDER BY r.round_number ASC`,
    [leagueId]
  );

  const matchups = rows.map(mapMatchupRow);
  const byStage = Object.fromEntries(
    Object.values(PLAYOFF_STAGES).map((stage) => [
      stage,
      matchups.find((m) => m.stage === stage) || null,
    ])
  );

  const standings = await getRegularSeasonStandings(leagueId);
  const seeds = standings.slice(0, MIN_PLAYOFF_TEAMS).map((row, index) => ({
    seed: index + 1,
    teamId: row.teamId,
    teamName: row.teamName,
    points: row.points,
  }));

  const championId = byStage.final && isMatchupDecided(byStage.final)
    ? (byStage.final.result === 'home_win'
        ? byStage.final.homeTeamId
        : byStage.final.awayTeamId)
    : null;

  return {
    seeds,
    matchups,
    byStage,
    champion: championId
      ? {
          teamId: championId,
          teamName:
            byStage.final.homeTeamId === championId
              ? byStage.final.homeName
              : byStage.final.awayName,
        }
      : null,
  };
}

export async function getPlayoffRoundNumber(stage, leagueId = DEFAULT_LEAGUE_ID) {
  const matchup = await getMatchupByStage(leagueId, stage);
  return matchup?.roundNumber ?? null;
}
