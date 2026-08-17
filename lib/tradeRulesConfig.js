import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';
import {
  mergeTradeRules,
  normalizeTradeRulesInput,
  rulesToForm,
  DEFAULT_TRADE_RULES,
} from './tradeRulesDefaults';

export {
  mergeTradeRules,
  normalizeTradeRulesInput,
  rulesToForm,
  formToRules,
  defaultTradeRulesForm,
  DEFAULT_TRADE_RULES,
} from './tradeRulesDefaults';

export async function getTradeRulesConfig(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT trade_rules FROM leagues WHERE id = $1',
    [leagueId]
  );

  const stored = rows[0]?.trade_rules;
  const overrides =
    stored && typeof stored === 'object' && Object.keys(stored).length > 0 ? stored : {};

  const rules = mergeTradeRules(overrides);

  return {
    rules,
    overrides,
    isDefault: Object.keys(overrides).length === 0,
  };
}

export async function updateTradeRulesConfig(input, leagueId = DEFAULT_LEAGUE_ID) {
  const rules = normalizeTradeRulesInput(input);
  const pool = getPool();

  await pool.query(
    `UPDATE leagues SET trade_rules = $1, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(rules), leagueId]
  );

  return { rules, isDefault: false };
}

export async function resetTradeRulesConfig(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  await pool.query(
    `UPDATE leagues SET trade_rules = '{}'::jsonb, updated_at = NOW() WHERE id = $1`,
    [leagueId]
  );
  return { rules: mergeTradeRules({}), isDefault: true };
}
