import { computeEffectiveLineup, splitSquadSlots } from './effectiveLineup';
import { normalizeMatchStats, scorePlayer } from './scoring';

/**
 * Compute a fantasy team's points for one real fixture (auto-sub + captain 2×).
 */
export function computeTeamFixturePoints({
  slots,
  captainPlayerId,
  viceCaptainPlayerId,
  featuredPlayerIds,
  playerPoints,
}) {
  const { playingSlots, benchSlots } = splitSquadSlots(slots);
  const lineup = computeEffectiveLineup({
    playingSlots,
    benchSlots,
    captainPlayerId,
    viceCaptainPlayerId,
    featuredPlayerIds,
    playerPoints,
  });

  return {
    totalPoints: lineup.totalPoints,
    lineup,
  };
}

/**
 * Build playerPoints map from stored match score rows.
 * @param {Array<{ player_id: string, base_points: number|string }>} scoreRows
 */
export function playerPointsFromRows(scoreRows) {
  const map = {};
  for (const row of scoreRows || []) {
    map[row.player_id] = Number(row.base_points ?? 0);
  }
  return map;
}

/**
 * Build featured set from stored match score rows.
 * @param {Array<{ player_id: string, featured_in_xi: boolean }>} scoreRows
 */
export function featuredFromRows(scoreRows) {
  return new Set(
    (scoreRows || [])
      .filter((row) => row.featured_in_xi)
      .map((row) => row.player_id)
  );
}

/**
 * Score one player stat entry and return base points.
 */
export function scoreStatsPayload(stats) {
  return scorePlayer(normalizeMatchStats(stats));
}
