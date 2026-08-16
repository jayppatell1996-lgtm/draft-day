/**
 * Default league rules (Phase 11 admin panel will override via DB).
 */
export const TRADE_RULES = {
  freeTradesPerRound: 3,
  maxBankedFreeTrades: 10,
  playoffTradeAllowance: 8,
  playoffFreeTrades: 0,
};

export function getTradeRules() {
  return { ...TRADE_RULES };
}
