/**
 * IPL-style playoff bracket logic (pure functions).
 * Top 6 seeds → Q1 (#1 vs #2), Eliminator (#3 vs #4), Q2, Final.
 */

export const MIN_PLAYOFF_TEAMS = 6;

export const PLAYOFF_STAGES = {
  QUALIFIER1: 'qualifier1',
  ELIMINATOR: 'eliminator',
  QUALIFIER2: 'qualifier2',
  FINAL: 'final',
};

export const PLAYOFF_STAGE_LABELS = {
  qualifier1: 'Qualifier 1',
  eliminator: 'Eliminator',
  qualifier2: 'Qualifier 2',
  final: 'Final',
};

/**
 * @param {Array<{ teamId: string, teamName: string }>} standings
 */
export function seedTeamsFromStandings(standings, minTeams = MIN_PLAYOFF_TEAMS) {
  if (!standings || standings.length < minTeams) {
    throw new Error(
      `Need at least ${minTeams} teams for IPL playoffs (found ${standings?.length ?? 0}).`
    );
  }

  return standings.slice(0, minTeams).map((row, index) => ({
    seed: index + 1,
    teamId: row.teamId,
    teamName: row.teamName,
  }));
}

export function getInitialPlayoffPairings(seeds) {
  const bySeed = Object.fromEntries(seeds.map((s) => [s.seed, s]));
  return {
    qualifier1: {
      homeTeamId: bySeed[1].teamId,
      awayTeamId: bySeed[2].teamId,
      homeName: bySeed[1].teamName,
      awayName: bySeed[2].teamName,
    },
    eliminator: {
      homeTeamId: bySeed[3].teamId,
      awayTeamId: bySeed[4].teamId,
      homeName: bySeed[3].teamName,
      awayName: bySeed[4].teamName,
    },
  };
}

export function winnerTeamId(matchup) {
  if (!matchup?.result || matchup.result === 'no_result') return null;
  if (matchup.result === 'home_win') return matchup.homeTeamId;
  if (matchup.result === 'away_win') return matchup.awayTeamId;
  return null;
}

export function loserTeamId(matchup) {
  if (!matchup?.result || matchup.result === 'no_result') return null;
  if (matchup.result === 'home_win') return matchup.awayTeamId;
  if (matchup.result === 'away_win') return matchup.homeTeamId;
  return null;
}

export function isMatchupDecided(matchup) {
  return Boolean(winnerTeamId(matchup));
}

export function buildQualifier2Pairing(q1Matchup, elimMatchup) {
  const homeTeamId = loserTeamId(q1Matchup);
  const awayTeamId = winnerTeamId(elimMatchup);
  if (!homeTeamId || !awayTeamId) return null;
  return { homeTeamId, awayTeamId };
}

export function buildFinalPairing(q1Matchup, q2Matchup) {
  const homeTeamId = winnerTeamId(q1Matchup);
  const awayTeamId = winnerTeamId(q2Matchup);
  if (!homeTeamId || !awayTeamId) return null;
  return { homeTeamId, awayTeamId };
}

export function regularSeasonComplete(stats) {
  const { totalMatchups, completedMatchups } = stats;
  return totalMatchups > 0 && completedMatchups >= totalMatchups;
}
