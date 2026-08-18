import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';
import { computeFormBadge, RECENT_MATCHES } from './playerForm';

export async function getPlayerSeasonStats(playerId, leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows: playerRows } = await pool.query(
    `SELECT id, full_name, short_name, role, franchise_name, is_overseas, image_url, active
     FROM players WHERE id = $1 AND league_id = $2`,
    [playerId, leagueId]
  );
  const player = playerRows[0];
  if (!player) return null;

  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int AS matches,
       COALESCE(SUM(base_points), 0)::float AS total_points,
       COALESCE(SUM((stats->>'runs')::numeric), 0)::float AS runs,
       COALESCE(SUM((stats->>'wickets')::numeric), 0)::float AS wickets,
       COUNT(*) FILTER (WHERE featured_in_xi)::int AS featured
     FROM player_match_scores
     WHERE player_id = $1 AND league_id = $2`,
    [playerId, leagueId]
  );

  const agg = rows[0];
  const matches = agg.matches;
  const totalPoints = Number(agg.total_points);

  const { rows: recentRows } = await pool.query(
    `SELECT AVG(base_points)::float AS recent_avg
     FROM (
       SELECT pms.base_points
       FROM player_match_scores pms
       JOIN fixtures f ON f.id = pms.fixture_id
       WHERE pms.player_id = $1 AND pms.league_id = $2
       ORDER BY f.starts_at DESC
       LIMIT $3
     ) recent`,
    [playerId, leagueId, RECENT_MATCHES]
  );
  const recentAverage =
    recentRows[0]?.recent_avg != null ? Number(recentRows[0].recent_avg) : null;
  const averagePoints = matches > 0 ? totalPoints / matches : 0;
  const form = computeFormBadge({ matches, averagePoints, recentAverage });

  return {
    playerId: player.id,
    fullName: player.full_name,
    shortName: player.short_name,
    role: player.role,
    franchiseName: player.franchise_name,
    isOverseas: player.is_overseas,
    imageUrl: player.image_url,
    active: player.active,
    matches,
    featuredMatches: agg.featured,
    totalPoints,
    averagePoints: matches > 0 ? Math.round(averagePoints * 100) / 100 : 0,
    recentAverage: recentAverage != null ? Math.round(recentAverage * 100) / 100 : null,
    form: form.form,
    formLabel: form.label,
    runs: Number(agg.runs),
    wickets: Number(agg.wickets),
  };
}

export async function getPlayerMatchHistory(playerId, leagueId = DEFAULT_LEAGUE_ID, limit = 20) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
       pms.base_points,
       pms.featured_in_xi,
       pms.is_man_of_match,
       pms.stats,
       pms.created_at,
       f.starts_at,
       f.local_team_name,
       f.visitor_team_name,
       f.round_label
     FROM player_match_scores pms
     JOIN fixtures f ON f.id = pms.fixture_id
     WHERE pms.player_id = $1 AND pms.league_id = $2
     ORDER BY f.starts_at DESC
     LIMIT $3`,
    [playerId, leagueId, limit]
  );

  return rows.map((row) => ({
    points: Number(row.base_points),
    featuredInXi: row.featured_in_xi,
    isManOfMatch: row.is_man_of_match,
    stats: row.stats,
    playedAt: row.starts_at,
    fixtureLabel: `${row.local_team_name} vs ${row.visitor_team_name}`,
    roundLabel: row.round_label,
  }));
}

export async function getSquadPointsSummary(fantasyTeamId, leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
       p.id AS player_id,
       p.full_name,
       p.role,
       p.franchise_name,
       p.is_overseas,
       p.image_url,
       ss.slot_type,
       ss.is_playing,
       s.captain_player_id,
       s.vice_captain_player_id,
       COALESCE(SUM(pms.base_points), 0)::float AS season_points
     FROM squad_slots ss
     JOIN squads s ON s.id = ss.squad_id
     JOIN players p ON p.id = ss.player_id
     LEFT JOIN player_match_scores pms ON pms.player_id = p.id AND pms.league_id = s.league_id
     WHERE s.fantasy_team_id = $1 AND s.league_id = $2 AND ss.player_id IS NOT NULL
     GROUP BY p.id, p.full_name, p.role, p.franchise_name, p.is_overseas, p.image_url,
              ss.slot_type, ss.is_playing, s.captain_player_id, s.vice_captain_player_id
     ORDER BY ss.is_playing DESC, p.full_name ASC`,
    [fantasyTeamId, leagueId]
  );

  const players = rows.map((row) => ({
    playerId: row.player_id,
    fullName: row.full_name,
    role: row.role,
    franchiseName: row.franchise_name,
    isOverseas: row.is_overseas,
    imageUrl: row.image_url,
    slotType: row.slot_type,
    isPlaying: row.is_playing,
    isCaptain: row.captain_player_id === row.player_id,
    isViceCaptain: row.vice_captain_player_id === row.player_id,
    seasonPoints: Number(row.season_points),
  }));

  const totalPoints = players.reduce((sum, p) => sum + p.seasonPoints, 0);

  return { players, totalPoints };
}

export async function getLeaguePlayerStatsMap(leagueId = DEFAULT_LEAGUE_ID) {
  return getLeaguePlayerInsightsMap(leagueId);
}

export async function getLeaguePlayerInsightsMap(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `WITH ranked AS (
       SELECT
         pms.player_id,
         pms.base_points,
         ROW_NUMBER() OVER (
           PARTITION BY pms.player_id
           ORDER BY f.starts_at DESC
         ) AS rn
       FROM player_match_scores pms
       JOIN fixtures f ON f.id = pms.fixture_id
       WHERE pms.league_id = $1
     ),
     season AS (
       SELECT
         player_id,
         COUNT(*)::int AS matches,
         COALESCE(SUM(base_points), 0)::float AS total_points
       FROM player_match_scores
       WHERE league_id = $1
       GROUP BY player_id
     ),
     recent AS (
       SELECT player_id, AVG(base_points)::float AS recent_avg
       FROM ranked
       WHERE rn <= $2
       GROUP BY player_id
     )
     SELECT
       s.player_id,
       s.matches,
       s.total_points,
       r.recent_avg
     FROM season s
     LEFT JOIN recent r ON r.player_id = s.player_id`,
    [leagueId, RECENT_MATCHES]
  );

  return new Map(
    rows.map((row) => {
      const matches = row.matches;
      const totalPoints = Number(row.total_points);
      const averagePoints = matches > 0 ? totalPoints / matches : 0;
      const form = computeFormBadge({
        matches,
        averagePoints,
        recentAverage: row.recent_avg != null ? Number(row.recent_avg) : null,
      });
      return [
        row.player_id,
        {
          matches,
          totalPoints,
          averagePoints: Math.round(averagePoints * 100) / 100,
          recentAverage:
            row.recent_avg != null ? Math.round(Number(row.recent_avg) * 100) / 100 : null,
          form: form.form,
          formLabel: form.label,
          formScore: form.score,
        },
      ];
    })
  );
}

function enrichPlayerWithInsights(player, insightsMap) {
  const insights = insightsMap.get(player.id);
  if (!insights) {
    return {
      ...player,
      seasonPoints: 0,
      matchesPlayed: 0,
      averagePoints: 0,
      form: 'unknown',
      formLabel: 'No data',
      formScore: 0,
    };
  }
  return {
    ...player,
    seasonPoints: insights.totalPoints,
    matchesPlayed: insights.matches,
    averagePoints: insights.averagePoints,
    recentAverage: insights.recentAverage,
    form: insights.form,
    formLabel: insights.formLabel,
    formScore: insights.formScore,
  };
}

export { enrichPlayerWithInsights };
