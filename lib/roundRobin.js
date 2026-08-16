export const MIN_H2H_TEAMS = 2;
export const MAX_H2H_TEAMS = 12;

/**
 * Round-robin schedule stats for a given team count.
 * Odd team counts use a bye each round (N rounds); even counts use N-1 rounds.
 */
export function getRoundRobinPlan(teamCount) {
  if (teamCount < MIN_H2H_TEAMS || teamCount > MAX_H2H_TEAMS) {
    return null;
  }

  const rounds = teamCount % 2 === 0 ? teamCount - 1 : teamCount;
  const matchupsPerRound = Math.floor(teamCount / 2);
  const totalMatchups = (teamCount * (teamCount - 1)) / 2;

  return { rounds, matchupsPerRound, totalMatchups };
}

/**
 * Round-robin schedule generator (circle method).
 * Supports 2–12 teams. Odd counts add a bye so every team plays each other once.
 *
 * @param {string[]} teamIds - fantasy team UUIDs
 * @returns {{ roundNumber: number, matchups: { homeTeamId: string, awayTeamId: string }[] }[]}
 */
export function generateRoundRobin(teamIds) {
  if (teamIds.length < MIN_H2H_TEAMS) {
    throw new Error(`At least ${MIN_H2H_TEAMS} teams required for round-robin`);
  }
  if (teamIds.length > MAX_H2H_TEAMS) {
    throw new Error(`At most ${MAX_H2H_TEAMS} teams allowed for round-robin`);
  }

  const teams = [...teamIds];
  if (teams.length % 2 !== 0) {
    teams.push(null);
  }

  const rounds = teams.length - 1;
  const half = teams.length / 2;
  const schedule = [];

  for (let r = 0; r < rounds; r += 1) {
    const matchups = [];
    for (let i = 0; i < half; i += 1) {
      const homeTeamId = teams[i];
      const awayTeamId = teams[teams.length - 1 - i];
      if (homeTeamId != null && awayTeamId != null) {
        matchups.push({ homeTeamId, awayTeamId });
      }
    }
    schedule.push({ roundNumber: r + 1, matchups });

    const fixed = teams[0];
    const rest = teams.slice(1);
    rest.unshift(rest.pop());
    teams.splice(0, teams.length, fixed, ...rest);
  }

  return schedule;
}

export const STANDINGS_POINTS = {
  win: 2,
  draw: 1,
  loss: 0,
};
