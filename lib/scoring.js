/**
 * CPL fantasy scoring (Phase 8). Pure functions — idempotent per player per match.
 * See .cursor/skills/cric-fantasy-league/reference.md
 */

export const MAN_OF_MATCH_BONUS = 50;

const BATTING_MILESTONES = [
  { runs: 125, points: 30 },
  { runs: 100, points: 20 },
  { runs: 50, points: 10 },
];

const STRIKE_RATE_BONUS = [
  { minSr: 170, points: 20 },
  { minSr: 160, points: 15 },
  { minSr: 150, points: 10 },
  { minSr: 140, points: 5 },
  { minSr: 120, points: 5 },
];

const ECONOMY_BONUS = [
  { maxEconomy: 3.99, points: 30 },
  { maxEconomy: 4.99, points: 20 },
  { maxEconomy: 5.99, points: 10 },
  { maxEconomy: 6.99, points: 0 },
  { maxEconomy: 7.99, points: -5 },
  { maxEconomy: 8.99, points: -10 },
  { maxEconomy: 9.99, points: -10 },
  { maxEconomy: Infinity, points: -10 },
];

/**
 * @typedef {object} PlayerMatchStats
 * @property {number} [runs]
 * @property {number} [ballsFaced]
 * @property {number} [fours]
 * @property {number} [sixes]
 * @property {number} [wickets]
 * @property {number} [overs]
 * @property {number} [runsConceded]
 * @property {number} [maidens]
 * @property {number} [catches]
 * @property {number} [stumpings]
 * @property {number} [runOutsDirect]
 * @property {number} [runOutsIndirect]
 * @property {boolean} [excludeSuperOver]
 * @property {boolean} [isManOfMatch]
 */

/**
 * @param {PlayerMatchStats} stats
 * @returns {number}
 */
export function scorePlayer(stats = {}) {
  if (stats.excludeSuperOver) {
    return 0;
  }

  let total = 0;
  total += scoreBatting(stats);
  total += scoreBowling(stats);
  total += scoreFielding(stats);

  if (stats.isManOfMatch) {
    total += MAN_OF_MATCH_BONUS;
  }

  return roundPoints(total);
}

function scoreBatting(stats) {
  const runs = num(stats.runs);
  const balls = num(stats.ballsFaced);
  const fours = num(stats.fours);
  const sixes = num(stats.sixes);

  let points = runs;
  points += fours;
  points += sixes * 2;

  for (const tier of BATTING_MILESTONES) {
    if (runs >= tier.runs) {
      points += tier.points;
      break;
    }
  }

  if (runs >= 20 && balls > 0) {
    const sr = (runs / balls) * 100;
    for (const tier of STRIKE_RATE_BONUS) {
      if (sr >= tier.minSr) {
        points += tier.points;
        break;
      }
    }
  }

  return points;
}

function scoreBowling(stats) {
  const wickets = num(stats.wickets);
  const maidens = num(stats.maidens);
  const overs = num(stats.overs);
  const runsConceded = num(stats.runsConceded);

  let points = wickets * 25;
  points += maidens * 25;

  if (wickets >= 5) {
    points += 50;
  } else if (wickets >= 3) {
    points += 25;
  }

  if (overs > 0) {
    const economy = runsConceded / overs;
    for (const tier of ECONOMY_BONUS) {
      if (economy <= tier.maxEconomy) {
        points += tier.points;
        break;
      }
    }
  }

  return points;
}

function scoreFielding(stats) {
  let points = 0;
  points += num(stats.catches) * 12;
  points += num(stats.stumpings) * 15;
  points += num(stats.runOutsDirect) * 20;
  points += num(stats.runOutsIndirect) * 20;
  return points;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundPoints(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Normalize inbound stats payload from admin/API.
 * @param {object} raw
 * @returns {PlayerMatchStats}
 */
export function normalizeMatchStats(raw = {}) {
  return {
    runs: num(raw.runs),
    ballsFaced: num(raw.ballsFaced ?? raw.balls_faced),
    fours: num(raw.fours),
    sixes: num(raw.sixes),
    wickets: num(raw.wickets),
    overs: num(raw.overs),
    runsConceded: num(raw.runsConceded ?? raw.runs_conceded),
    maidens: num(raw.maidens),
    catches: num(raw.catches),
    stumpings: num(raw.stumpings),
    runOutsDirect: num(raw.runOutsDirect ?? raw.run_outs_direct),
    runOutsIndirect: num(raw.runOutsIndirect ?? raw.run_outs_indirect),
    excludeSuperOver: Boolean(raw.excludeSuperOver ?? raw.exclude_super_over),
    isManOfMatch: Boolean(raw.isManOfMatch ?? raw.is_man_of_match),
  };
}
