import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';
import {
  mergeScoringConfig,
  normalizeScoringConfigInput,
  configToForm,
  formToConfig,
  DEFAULT_SCORING_CONFIG,
} from './scoringDefaults';

export {
  mergeScoringConfig,
  normalizeScoringConfigInput,
  configToForm,
  formToConfig,
  DEFAULT_SCORING_CONFIG,
} from './scoringDefaults';

export async function getScoringConfig(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT scoring_config FROM leagues WHERE id = $1',
    [leagueId]
  );

  const stored = rows[0]?.scoring_config;
  const overrides =
    stored && typeof stored === 'object' && Object.keys(stored).length > 0
      ? stored
      : {};

  return {
    config: mergeScoringConfig(overrides),
    overrides,
    isDefault: Object.keys(overrides).length === 0,
  };
}

export async function updateScoringConfig(input, leagueId = DEFAULT_LEAGUE_ID) {
  const config = normalizeScoringConfigInput(input);
  const pool = getPool();

  await pool.query(
    `UPDATE leagues SET scoring_config = $1, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(config), leagueId]
  );

  return { config, isDefault: false };
}

export async function resetScoringConfig(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  await pool.query(
    `UPDATE leagues SET scoring_config = '{}'::jsonb, updated_at = NOW() WHERE id = $1`,
    [leagueId]
  );
  return { config: mergeScoringConfig({}), isDefault: true };
}
