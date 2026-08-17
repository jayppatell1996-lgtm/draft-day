/**
 * League trade rules — defaults in tradeRulesDefaults.js; DB overrides via tradeRulesConfig.js
 */
import { DEFAULT_LEAGUE_ID } from './constants';
import { getTradeRulesConfig } from './tradeRulesConfig';
import { DEFAULT_TRADE_RULES } from './tradeRulesDefaults';

export { DEFAULT_TRADE_RULES as TRADE_RULES } from './tradeRulesDefaults';

export async function getTradeRules(leagueId = DEFAULT_LEAGUE_ID) {
  const { rules } = await getTradeRulesConfig(leagueId);
  return rules;
}
