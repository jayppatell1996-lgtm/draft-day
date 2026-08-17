import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';
import {
  computeTeamFixturePoints,
  featuredFromRows,
  playerPointsFromRows,
  scoreStatsPayload,
} from './fantasyScoring';
import { normalizeMatchStats } from './scoring';
import { getScoringConfig } from './scoringConfig';

function roundScore(value) {
  return Math.round(Number(value) * 100) / 100;
}

export async function getRoundByNumber(roundNumber, leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, round_number, name FROM rounds
     WHERE league_id = $1 AND round_number = $2 AND is_playoff = FALSE`,
    [leagueId, roundNumber]
  );
  return rows[0] ?? null;
}

export async function linkFixturesToRound({
  roundNumber,
  fixtureIds,
  leagueId = DEFAULT_LEAGUE_ID,
}) {
  const round = await getRoundByNumber(roundNumber, leagueId);
  if (!round) {
    throw new Error(`Round ${roundNumber} not found`);
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const fixtureId of fixtureIds) {
      await client.query(
        `INSERT INTO round_fixtures (league_id, round_id, fixture_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (round_id, fixture_id) DO NOTHING`,
        [leagueId, round.id, fixtureId]
      );
    }

    await client.query('COMMIT');
    return { roundId: round.id, linked: fixtureIds.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function upsertFixturePlayerScores({
  fixtureId,
  entries,
  leagueId = DEFAULT_LEAGUE_ID,
}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('At least one player score entry is required');
  }

  const { config: scoringConfig } = await getScoringConfig(leagueId);
  const pool = getPool();
  const client = await pool.connect();
  let upserted = 0;

  try {
    await client.query('BEGIN');

    for (const entry of entries) {
      const playerId = entry.playerId ?? entry.player_id;
      if (!playerId) {
        throw new Error('Each entry requires playerId');
      }

      const stats = normalizeMatchStats(entry.stats ?? entry);
      const featuredInXi = Boolean(
        entry.featuredInXi ?? entry.featured_in_xi ?? entry.featured
      );
      const isManOfMatch = Boolean(
        entry.isManOfMatch ?? entry.is_man_of_match ?? stats.isManOfMatch
      );
      stats.isManOfMatch = isManOfMatch;

      const basePoints = scoreStatsPayload(stats, scoringConfig);

      await client.query(
        `INSERT INTO player_match_scores (
           league_id, fixture_id, player_id, featured_in_xi,
           is_man_of_match, stats, base_points, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (fixture_id, player_id) DO UPDATE SET
           featured_in_xi = EXCLUDED.featured_in_xi,
           is_man_of_match = EXCLUDED.is_man_of_match,
           stats = EXCLUDED.stats,
           base_points = EXCLUDED.base_points,
           updated_at = NOW()`,
        [
          leagueId,
          fixtureId,
          playerId,
          featuredInXi,
          isManOfMatch,
          JSON.stringify(stats),
          basePoints,
        ]
      );
      upserted += 1;
    }

    await client.query('COMMIT');
    return { fixtureId, upserted };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function loadRoundFixtures(roundId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT rf.fixture_id, f.external_fixture_id, f.local_team_name, f.visitor_team_name
     FROM round_fixtures rf
     JOIN fixtures f ON f.id = rf.fixture_id
     WHERE rf.round_id = $1
     ORDER BY f.starts_at ASC`,
    [roundId]
  );
  return rows;
}

async function loadFixtureScores(fixtureId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT player_id, base_points, featured_in_xi
     FROM player_match_scores
     WHERE fixture_id = $1`,
    [fixtureId]
  );
  return rows;
}

async function rescoreFixtures(fixtureIds, leagueId, scoringConfig) {
  const pool = getPool();
  for (const fixtureId of fixtureIds) {
    const { rows } = await pool.query(
      `SELECT id, stats, is_man_of_match FROM player_match_scores WHERE fixture_id = $1`,
      [fixtureId]
    );
    for (const row of rows) {
      const stats =
        typeof row.stats === 'object' && row.stats != null ? row.stats : {};
      const basePoints = scoreStatsPayload(
        { ...stats, isManOfMatch: row.is_man_of_match },
        scoringConfig
      );
      await pool.query(
        `UPDATE player_match_scores SET base_points = $1, updated_at = NOW() WHERE id = $2`,
        [basePoints, row.id]
      );
    }
  }
}

async function loadSquadsForLeague(leagueId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
       s.id AS squad_id,
       s.fantasy_team_id,
       s.captain_player_id,
       s.vice_captain_player_id,
       ss.slot_type,
       ss.slot_index,
       ss.player_id,
       ss.is_playing
     FROM squads s
     JOIN squad_slots ss ON ss.squad_id = s.id
     WHERE s.league_id = $1
     ORDER BY s.fantasy_team_id, ss.is_playing DESC, ss.slot_type, ss.slot_index`,
    [leagueId]
  );

  const byTeam = new Map();
  for (const row of rows) {
    if (!byTeam.has(row.fantasy_team_id)) {
      byTeam.set(row.fantasy_team_id, {
        squadId: row.squad_id,
        fantasyTeamId: row.fantasy_team_id,
        captainPlayerId: row.captain_player_id,
        viceCaptainPlayerId: row.vice_captain_player_id,
        slots: [],
      });
    }
    byTeam.get(row.fantasy_team_id).slots.push({
      slot_type: row.slot_type,
      slot_index: row.slot_index,
      player_id: row.player_id,
      is_playing: row.is_playing,
    });
  }

  return byTeam;
}

function computeTeamRoundTotal(squad, fixtures, scoringConfig) {
  let total = 0;
  const fixtureBreakdown = [];

  for (const fixture of fixtures) {
    const scoreRows = fixture.scoreRows;
    const playerPoints = playerPointsFromRows(scoreRows);
    const featured = featuredFromRows(scoreRows);

    const { totalPoints, lineup } = computeTeamFixturePoints({
      slots: squad.slots,
      captainPlayerId: squad.captainPlayerId,
      viceCaptainPlayerId: squad.viceCaptainPlayerId,
      featuredPlayerIds: featured,
      playerPoints,
      scoringConfig,
    });

    total += totalPoints;
    fixtureBreakdown.push({
      fixtureId: fixture.fixture_id,
      points: totalPoints,
      autoSubs: lineup.changes.filter((c) => c.type === 'sub').length,
    });
  }

  return { total: roundScore(total), fixtureBreakdown };
}

function matchupResult(homePoints, awayPoints) {
  if (homePoints > awayPoints) return 'home_win';
  if (awayPoints > homePoints) return 'away_win';
  return 'draw';
}

export async function recalculateRoundScores(roundNumber, leagueId = DEFAULT_LEAGUE_ID) {
  const round = await getRoundByNumber(roundNumber, leagueId);
  if (!round) {
    throw new Error(`Round ${roundNumber} not found`);
  }

  const fixtureRows = await loadRoundFixtures(round.id);
  if (fixtureRows.length === 0) {
    throw new Error(
      `No fixtures linked to round ${roundNumber}. Link fixtures via admin first.`
    );
  }

  const { config: scoringConfig } = await getScoringConfig(leagueId);
  const fixtureIds = fixtureRows.map((r) => r.fixture_id);
  await rescoreFixtures(fixtureIds, leagueId, scoringConfig);

  const fixtures = [];
  for (const row of fixtureRows) {
    const scoreRows = await loadFixtureScores(row.fixture_id);
    if (scoreRows.length === 0) {
      throw new Error(
        `Fixture ${row.external_fixture_id} has no player scores. Submit scores first.`
      );
    }
    fixtures.push({ ...row, scoreRows });
  }

  const squadsByTeam = await loadSquadsForLeague(leagueId);
  const teamRoundTotals = new Map();

  for (const [teamId, squad] of squadsByTeam) {
    teamRoundTotals.set(teamId, computeTeamRoundTotal(squad, fixtures, scoringConfig));
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: matchups } = await client.query(
      `SELECT id, home_team_id, away_team_id
       FROM h2h_matchups
       WHERE round_id = $1`,
      [round.id]
    );

    const updated = [];

    for (const matchup of matchups) {
      const home = teamRoundTotals.get(matchup.home_team_id)?.total ?? 0;
      const away = teamRoundTotals.get(matchup.away_team_id)?.total ?? 0;
      const result = matchupResult(home, away);

      await client.query(
        `UPDATE h2h_matchups SET
           home_points = $1,
           away_points = $2,
           result = $3,
           status = 'completed',
           updated_at = NOW()
         WHERE id = $4`,
        [home, away, result, matchup.id]
      );

      updated.push({
        matchupId: matchup.id,
        homePoints: home,
        awayPoints: away,
        result,
      });
    }

    await client.query('COMMIT');

    return {
      roundNumber,
      roundId: round.id,
      fixtures: fixtures.length,
      matchupsUpdated: updated.length,
      matchups: updated,
      teamTotals: Object.fromEntries(
        [...teamRoundTotals.entries()].map(([teamId, data]) => [teamId, data.total])
      ),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function ensureFixture({
  externalFixtureId,
  localTeamName,
  visitorTeamName,
  startsAt,
  leagueId = DEFAULT_LEAGUE_ID,
}) {
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO fixtures (
       league_id, external_fixture_id, local_team_name, visitor_team_name, starts_at, status
     ) VALUES ($1, $2, $3, $4, $5, 'completed')
     ON CONFLICT (league_id, external_fixture_id) DO UPDATE SET
       local_team_name = EXCLUDED.local_team_name,
       visitor_team_name = EXCLUDED.visitor_team_name,
       starts_at = EXCLUDED.starts_at,
       updated_at = NOW()
     RETURNING id, external_fixture_id`,
    [leagueId, externalFixtureId, localTeamName, visitorTeamName, startsAt]
  );
  return rows[0];
}
