import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';

/**
 * Per-franchise lock state for player pool UI.
 */
export async function getFranchiseLockInfoMap(leagueId = DEFAULT_LEAGUE_ID, now = new Date()) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
       franchise_external_id,
       franchise_name,
       BOOL_OR(locks_at <= $2) AS is_locked,
       MIN(locks_at) FILTER (WHERE locks_at > $2) AS next_lock_at
     FROM lock_times
     WHERE league_id = $1
     GROUP BY franchise_external_id, franchise_name`,
    [leagueId, now]
  );

  const map = new Map();
  for (const row of rows) {
    const nextLockAt = row.next_lock_at ? new Date(row.next_lock_at) : null;
    map.set(Number(row.franchise_external_id), {
      franchiseName: row.franchise_name,
      locked: Boolean(row.is_locked),
      nextLockAt: nextLockAt?.toISOString() ?? null,
      msUntilLock: nextLockAt ? nextLockAt.getTime() - now.getTime() : null,
    });
  }
  return map;
}

export function attachLockInfoToPlayer(player, lockMap) {
  if (!player.franchiseExternalId) {
    return { ...player, lock: null };
  }
  const lock = lockMap.get(Number(player.franchiseExternalId)) ?? null;
  return {
    ...player,
    lock,
    locked: lock?.locked ?? false,
  };
}
