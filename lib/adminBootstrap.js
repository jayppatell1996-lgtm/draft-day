import { DEFAULT_LEAGUE_ID } from './constants';
import { getAdminOverview, getLeagueAudit } from './adminLeague';
import { listAdminFixtures, listAdminLockTimes } from './adminLocks';
import { listAdminPlayers } from './adminPlayers';
import { getLeagueSettings } from './leagueSettings';
import { configToForm } from './scoringDefaults';
import { getScoringConfig } from './scoringConfig';
import { getSquadStructureAdmin } from './squadStructureConfig';
import { rulesToForm } from './tradeRulesDefaults';
import { getTradeRulesConfig } from './tradeRulesConfig';

/**
 * Load all admin panel read data in one request (sequential queries to limit DB connections).
 */
export async function getAdminBootstrap(leagueId = DEFAULT_LEAGUE_ID) {
  const overview = await getAdminOverview(leagueId);
  const audit = await getLeagueAudit(leagueId);
  const leagueSettings = await getLeagueSettings(leagueId);
  const tradeRulesResult = await getTradeRulesConfig(leagueId);
  const slots = await getSquadStructureAdmin(leagueId);
  const scoringResult = await getScoringConfig(leagueId);
  const lockTimes = await listAdminLockTimes(leagueId);
  const fixtures = await listAdminFixtures(leagueId);
  const players = await listAdminPlayers({ includeInactive: true });

  return {
    ...overview,
    audit,
    leagueSettings,
    tradeRules: {
      rules: tradeRulesResult.rules,
      form: rulesToForm(tradeRulesResult.rules),
      isDefault: tradeRulesResult.isDefault,
    },
    squadStructure: { slots },
    scoringConfig: {
      config: scoringResult.config,
      form: configToForm(scoringResult.config),
      isDefault: scoringResult.isDefault,
    },
    lockTimes: { lockTimes, fixtures },
    players: { players },
  };
}
