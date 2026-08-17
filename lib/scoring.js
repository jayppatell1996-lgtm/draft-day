/**
 * CPL fantasy scoring (Phase 8). Pure functions — idempotent per player per match.
 * Point values are read from scoring config (admin-editable via leagues.scoring_config).
 */

import { DEFAULT_SCORING_CONFIG, mergeScoringConfig } from './scoringDefaults.js';

export const MAN_OF_MATCH_BONUS = DEFAULT_SCORING_CONFIG.manOfMatchBonus;

/**
 * @typedef {import('./scoringConfig').DEFAULT_SCORING_CONFIG} ScoringConfig
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
 * @param {object} [config]
 * @returns {number}
 */
export function scorePlayer(stats = {}, config) {
  const cfg = mergeScoringConfig(config);

  if (stats.excludeSuperOver) {
    return 0;
  }

  let total = 0;
  total += scoreBatting(stats, cfg);
  total += scoreBowling(stats, cfg);
  total += scoreFielding(stats, cfg);

  if (stats.isManOfMatch) {
    total += cfg.manOfMatchBonus;
  }

  return roundPoints(total);
}

function scoreBatting(stats, cfg) {
  const b = cfg.batting;
  const runs = num(stats.runs);
  const balls = num(stats.ballsFaced);
  const fours = num(stats.fours);
  const sixes = num(stats.sixes);

  let points = runs * b.pointsPerRun;
  points += fours * b.pointsPerFour;
  points += sixes * b.pointsPerSix;

  for (const tier of b.milestones || []) {
    if (runs >= tier.runs) {
      points += tier.points;
      break;
    }
  }

  if (runs >= b.srMinRuns && balls > 0) {
    const sr = (runs / balls) * 100;
    for (const tier of b.strikeRateBonus || []) {
      if (sr >= tier.minSr) {
        points += tier.points;
        break;
      }
    }
  }

  return points;
}

function scoreBowling(stats, cfg) {
  const bw = cfg.bowling;
  const wickets = num(stats.wickets);
  const maidens = num(stats.maidens);
  const overs = num(stats.overs);
  const runsConceded = num(stats.runsConceded);

  let points = wickets * bw.pointsPerWicket;
  points += maidens * bw.pointsPerMaiden;

  if (wickets >= 5) {
    points += bw.fiveWicketBonus;
  } else if (wickets >= 3) {
    points += bw.threeWicketBonus;
  }

  if (overs > 0) {
    const economy = runsConceded / overs;
    for (const tier of bw.economyBonus || []) {
      const cap = tier.maxEconomy >= 999 ? Infinity : tier.maxEconomy;
      if (economy <= cap) {
        points += tier.points;
        break;
      }
    }
  }

  return points;
}

function scoreFielding(stats, cfg) {
  const f = cfg.fielding;
  let points = 0;
  points += num(stats.catches) * f.catch;
  points += num(stats.stumpings) * f.stumping;
  points += num(stats.runOutsDirect) * f.runOutDirect;
  points += num(stats.runOutsIndirect) * f.runOutIndirect;
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
