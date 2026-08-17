/** CPL defaults and pure scoring-config helpers (safe for client + unit tests). */

export const DEFAULT_SCORING_CONFIG = {
  batting: {
    pointsPerRun: 1,
    pointsPerFour: 1,
    pointsPerSix: 2,
    srMinRuns: 20,
    milestones: [
      { runs: 125, points: 30 },
      { runs: 100, points: 20 },
      { runs: 50, points: 10 },
    ],
    strikeRateBonus: [
      { minSr: 170, points: 20 },
      { minSr: 160, points: 15 },
      { minSr: 150, points: 10 },
      { minSr: 140, points: 5 },
      { minSr: 120, points: 5 },
    ],
  },
  bowling: {
    pointsPerWicket: 25,
    pointsPerMaiden: 25,
    threeWicketBonus: 25,
    fiveWicketBonus: 50,
    economyBonus: [
      { maxEconomy: 3.99, points: 30 },
      { maxEconomy: 4.99, points: 20 },
      { maxEconomy: 5.99, points: 10 },
      { maxEconomy: 6.99, points: 0 },
      { maxEconomy: 7.99, points: -5 },
      { maxEconomy: 8.99, points: -10 },
      { maxEconomy: 9.99, points: -10 },
      { maxEconomy: 999, points: -10 },
    ],
  },
  fielding: {
    catch: 12,
    stumping: 15,
    runOutDirect: 20,
    runOutIndirect: 20,
  },
  manOfMatchBonus: 50,
  captainMultiplier: 2,
};

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_SCORING_CONFIG));
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, patch) {
  if (!isPlainObject(patch)) return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (Array.isArray(value)) {
      out[key] = value.map((item) => (isPlainObject(item) ? { ...item } : item));
    } else if (isPlainObject(value) && isPlainObject(base[key])) {
      out[key] = deepMerge(base[key], value);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

export function mergeScoringConfig(overrides) {
  if (!overrides || Object.keys(overrides).length === 0) {
    return cloneDefaults();
  }
  return deepMerge(cloneDefaults(), overrides);
}

function sanitizeNumber(value, fallback, { min = null } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (min != null && n < min) return min;
  return n;
}

export function normalizeScoringConfigInput(input) {
  const merged = mergeScoringConfig(input);
  const b = merged.batting;
  const bw = merged.bowling;
  const f = merged.fielding;

  b.pointsPerRun = sanitizeNumber(b.pointsPerRun, 1, { min: 0 });
  b.pointsPerFour = sanitizeNumber(b.pointsPerFour, 1, { min: 0 });
  b.pointsPerSix = sanitizeNumber(b.pointsPerSix, 2, { min: 0 });
  b.srMinRuns = sanitizeNumber(b.srMinRuns, 20, { min: 0 });

  b.milestones = (b.milestones || [])
    .map((m) => ({
      runs: sanitizeNumber(m.runs, 0, { min: 0 }),
      points: sanitizeNumber(m.points, 0),
    }))
    .filter((m) => m.runs > 0)
    .sort((a, c) => c.runs - a.runs);

  b.strikeRateBonus = (b.strikeRateBonus || [])
    .map((t) => ({
      minSr: sanitizeNumber(t.minSr, 0, { min: 0 }),
      points: sanitizeNumber(t.points, 0),
    }))
    .filter((t) => t.minSr > 0)
    .sort((a, c) => c.minSr - a.minSr);

  bw.pointsPerWicket = sanitizeNumber(bw.pointsPerWicket, 25, { min: 0 });
  bw.pointsPerMaiden = sanitizeNumber(bw.pointsPerMaiden, 25, { min: 0 });
  bw.threeWicketBonus = sanitizeNumber(bw.threeWicketBonus, 25, { min: 0 });
  bw.fiveWicketBonus = sanitizeNumber(bw.fiveWicketBonus, 50, { min: 0 });

  bw.economyBonus = (bw.economyBonus || [])
    .map((t) => ({
      maxEconomy: sanitizeNumber(t.maxEconomy, 999, { min: 0 }),
      points: sanitizeNumber(t.points, 0),
    }))
    .sort((a, c) => a.maxEconomy - c.maxEconomy);

  f.catch = sanitizeNumber(f.catch, 12, { min: 0 });
  f.stumping = sanitizeNumber(f.stumping, 15, { min: 0 });
  f.runOutDirect = sanitizeNumber(f.runOutDirect, 20, { min: 0 });
  f.runOutIndirect = sanitizeNumber(f.runOutIndirect, 20, { min: 0 });

  merged.manOfMatchBonus = sanitizeNumber(merged.manOfMatchBonus, 50, { min: 0 });
  merged.captainMultiplier = sanitizeNumber(merged.captainMultiplier, 2, { min: 1 });

  return merged;
}

function findTier(tiers, minSr) {
  return tiers?.find((t) => t.minSr === minSr)?.points ?? 0;
}

function findEconomy(tiers, maxEconomy) {
  return tiers?.find((t) => t.maxEconomy === maxEconomy)?.points ?? 0;
}

export function configToForm(config) {
  const m = Object.fromEntries(
    (config.batting.milestones || []).map((t) => [`milestone${t.runs}`, t.points])
  );
  return {
    pointsPerRun: config.batting.pointsPerRun,
    pointsPerFour: config.batting.pointsPerFour,
    pointsPerSix: config.batting.pointsPerSix,
    srMinRuns: config.batting.srMinRuns,
    milestone50: m.milestone50 ?? 10,
    milestone100: m.milestone100 ?? 20,
    milestone125: m.milestone125 ?? 30,
    srBonus170: findTier(config.batting.strikeRateBonus, 170),
    srBonus160: findTier(config.batting.strikeRateBonus, 160),
    srBonus150: findTier(config.batting.strikeRateBonus, 150),
    srBonus140: findTier(config.batting.strikeRateBonus, 140),
    srBonus120: findTier(config.batting.strikeRateBonus, 120),
    pointsPerWicket: config.bowling.pointsPerWicket,
    pointsPerMaiden: config.bowling.pointsPerMaiden,
    threeWicketBonus: config.bowling.threeWicketBonus,
    fiveWicketBonus: config.bowling.fiveWicketBonus,
    economyUnder4: findEconomy(config.bowling.economyBonus, 3.99),
    economyUnder5: findEconomy(config.bowling.economyBonus, 4.99),
    economyUnder6: findEconomy(config.bowling.economyBonus, 5.99),
    economyUnder8: findEconomy(config.bowling.economyBonus, 7.99),
    economyOver10: findEconomy(config.bowling.economyBonus, 999),
    catch: config.fielding.catch,
    stumping: config.fielding.stumping,
    runOutDirect: config.fielding.runOutDirect,
    runOutIndirect: config.fielding.runOutIndirect,
    manOfMatchBonus: config.manOfMatchBonus,
    captainMultiplier: config.captainMultiplier,
  };
}

export function formToConfig(form) {
  return normalizeScoringConfigInput({
    batting: {
      pointsPerRun: form.pointsPerRun,
      pointsPerFour: form.pointsPerFour,
      pointsPerSix: form.pointsPerSix,
      srMinRuns: form.srMinRuns,
      milestones: [
        { runs: 125, points: form.milestone125 },
        { runs: 100, points: form.milestone100 },
        { runs: 50, points: form.milestone50 },
      ],
      strikeRateBonus: [
        { minSr: 170, points: form.srBonus170 },
        { minSr: 160, points: form.srBonus160 },
        { minSr: 150, points: form.srBonus150 },
        { minSr: 140, points: form.srBonus140 },
        { minSr: 120, points: form.srBonus120 },
      ],
    },
    bowling: {
      pointsPerWicket: form.pointsPerWicket,
      pointsPerMaiden: form.pointsPerMaiden,
      threeWicketBonus: form.threeWicketBonus,
      fiveWicketBonus: form.fiveWicketBonus,
      economyBonus: [
        { maxEconomy: 3.99, points: form.economyUnder4 },
        { maxEconomy: 4.99, points: form.economyUnder5 },
        { maxEconomy: 5.99, points: form.economyUnder6 },
        { maxEconomy: 6.99, points: 0 },
        { maxEconomy: 7.99, points: form.economyUnder8 },
        { maxEconomy: 8.99, points: form.economyUnder8 },
        { maxEconomy: 9.99, points: form.economyOver10 },
        { maxEconomy: 999, points: form.economyOver10 },
      ],
    },
    fielding: {
      catch: form.catch,
      stumping: form.stumping,
      runOutDirect: form.runOutDirect,
      runOutIndirect: form.runOutIndirect,
    },
    manOfMatchBonus: form.manOfMatchBonus,
    captainMultiplier: form.captainMultiplier,
  });
}

export function defaultScoringForm() {
  return configToForm(cloneDefaults());
}
