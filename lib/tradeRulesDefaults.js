export const DEFAULT_TRADE_RULES = {
  freeTradesPerRound: 3,
  maxBankedFreeTrades: 10,
  playoffTradeAllowance: 8,
  playoffFreeTrades: 0,
};

export function mergeTradeRules(overrides = {}) {
  return {
    freeTradesPerRound:
      overrides.freeTradesPerRound ?? DEFAULT_TRADE_RULES.freeTradesPerRound,
    maxBankedFreeTrades:
      overrides.maxBankedFreeTrades ?? DEFAULT_TRADE_RULES.maxBankedFreeTrades,
    playoffTradeAllowance:
      overrides.playoffTradeAllowance ?? DEFAULT_TRADE_RULES.playoffTradeAllowance,
    playoffFreeTrades:
      overrides.playoffFreeTrades ?? DEFAULT_TRADE_RULES.playoffFreeTrades,
  };
}

export function rulesToForm(rules) {
  return {
    freeTradesPerRound: rules.freeTradesPerRound,
    maxBankedFreeTrades: rules.maxBankedFreeTrades,
    playoffTradeAllowance: rules.playoffTradeAllowance,
    playoffFreeTrades: rules.playoffFreeTrades,
  };
}

export function formToRules(form) {
  return normalizeTradeRulesInput(form);
}

export function normalizeTradeRulesInput(input) {
  const parsed = {
    freeTradesPerRound: Number(input.freeTradesPerRound),
    maxBankedFreeTrades: Number(input.maxBankedFreeTrades),
    playoffTradeAllowance: Number(input.playoffTradeAllowance),
    playoffFreeTrades: Number(input.playoffFreeTrades),
  };

  for (const [key, value] of Object.entries(parsed)) {
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      throw new Error(`Invalid trade rule: ${key}`);
    }
  }

  if (parsed.playoffFreeTrades > parsed.playoffTradeAllowance) {
    throw new Error('Playoff free trades cannot exceed playoff trade allowance');
  }

  return parsed;
}

export function defaultTradeRulesForm() {
  return rulesToForm(DEFAULT_TRADE_RULES);
}
