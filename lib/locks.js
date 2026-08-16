import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';

/**
 * Returns lock info for a player franchise, or null if unlocked / unknown.
 */
export async function getPlayerLockStatus(playerId, leagueId = DEFAULT_LEAGUE_ID, now = new Date()) {
  if (!playerId) return { locked: false };

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT p.franchise_external_id, p.franchise_name, lt.locks_at
     FROM players p
     LEFT JOIN lock_times lt ON lt.league_id = p.league_id
       AND lt.franchise_external_id = p.franchise_external_id
     WHERE p.id = $1 AND p.league_id = $2`,
    [playerId, leagueId]
  );

  const row = rows[0];
  if (!row?.locks_at) {
    return { locked: false, franchiseName: row?.franchise_name ?? null };
  }

  const locksAt = new Date(row.locks_at);
  return {
    locked: locksAt <= now,
    locksAt: locksAt.toISOString(),
    franchiseName: row.franchise_name,
  };
}

export async function assertPlayersUnlocked(playerIds, leagueId = DEFAULT_LEAGUE_ID) {
  const ids = [...new Set(playerIds.filter(Boolean))];
  for (const id of ids) {
    const status = await getPlayerLockStatus(id, leagueId);
    if (status.locked) {
      const label = status.franchiseName || 'Franchise';
      throw new Error(`${label} is locked until match starts`);
    }
  }
}

/**
 * Lock-to-lock window: open after the most recent passed lock until the next upcoming lock.
 * If no lock_times exist, the window is always open.
 */
export async function getTransferWindowBounds(leagueId = DEFAULT_LEAGUE_ID, now = new Date()) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT locks_at FROM lock_times
     WHERE league_id = $1
     ORDER BY locks_at ASC`,
    [leagueId]
  );

  if (rows.length === 0) {
    return { open: true, reason: 'no_lock_times', nextLockAt: null, lastLockAt: null };
  }

  const times = rows.map((r) => new Date(r.locks_at));
  const passed = times.filter((t) => t <= now);
  const upcoming = times.find((t) => t > now);

  if (!upcoming) {
    return {
      open: true,
      reason: 'after_all_locks',
      nextLockAt: null,
      lastLockAt: passed[passed.length - 1]?.toISOString() ?? null,
    };
  }

  if (passed.length === 0) {
    return {
      open: true,
      reason: 'before_first_lock',
      nextLockAt: upcoming.toISOString(),
      lastLockAt: null,
    };
  }

  const lastPassed = passed[passed.length - 1];
  return {
    open: now > lastPassed && now < upcoming,
    reason: 'lock_to_lock',
    nextLockAt: upcoming.toISOString(),
    lastLockAt: lastPassed.toISOString(),
  };
}

export async function listUpcomingLocks(leagueId = DEFAULT_LEAGUE_ID, limit = 5) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT franchise_name, locks_at
     FROM lock_times
     WHERE league_id = $1 AND locks_at > NOW()
     ORDER BY locks_at ASC
     LIMIT $2`,
    [leagueId, limit]
  );
  return rows.map((r) => ({
    franchiseName: r.franchise_name,
    locksAt: r.locks_at,
  }));
}

export async function getLockedPlayerIds(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT p.id
     FROM players p
     JOIN lock_times lt ON lt.franchise_external_id = p.franchise_external_id
       AND lt.league_id = p.league_id
     WHERE p.league_id = $1 AND lt.locks_at <= NOW()`,
    [leagueId]
  );
  return rows.map((r) => r.id);
}
