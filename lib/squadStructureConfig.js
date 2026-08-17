import { getPool } from './db';
import { DEFAULT_LEAGUE_ID } from './constants';

const ALLOWED_SLOT_TYPES = ['WK', 'BAT', 'BOWL', 'FLEX', 'BENCH'];
const EXPECTED_PLAYING_TOTAL = 12;
const EXPECTED_BENCH_TOTAL = 4;

export async function getSquadStructureAdmin(leagueId = DEFAULT_LEAGUE_ID) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT slot_type, required_count, is_playing
     FROM squad_structure_config
     WHERE league_id = $1
     ORDER BY is_playing DESC, slot_type`,
    [leagueId]
  );

  return rows.map((row) => ({
    slotType: row.slot_type,
    requiredCount: row.required_count,
    isPlaying: row.is_playing,
  }));
}

function normalizeSlotsInput(slots) {
  if (!Array.isArray(slots) || slots.length === 0) {
    throw new Error('Squad structure slots are required');
  }

  const normalized = slots.map((slot) => ({
    slotType: String(slot.slotType ?? slot.slot_type ?? '').toUpperCase(),
    requiredCount: Number(slot.requiredCount ?? slot.required_count),
    isPlaying: Boolean(slot.isPlaying ?? slot.is_playing),
  }));

  for (const slot of normalized) {
    if (!ALLOWED_SLOT_TYPES.includes(slot.slotType)) {
      throw new Error(`Invalid slot type: ${slot.slotType}`);
    }
    if (!Number.isInteger(slot.requiredCount) || slot.requiredCount < 0) {
      throw new Error(`Invalid count for ${slot.slotType}`);
    }
  }

  const playingTotal = normalized
    .filter((s) => s.isPlaying)
    .reduce((sum, s) => sum + s.requiredCount, 0);
  const benchTotal = normalized
    .filter((s) => !s.isPlaying)
    .reduce((sum, s) => sum + s.requiredCount, 0);

  if (playingTotal !== EXPECTED_PLAYING_TOTAL) {
    throw new Error(`Playing slots must total ${EXPECTED_PLAYING_TOTAL} (got ${playingTotal})`);
  }
  if (benchTotal !== EXPECTED_BENCH_TOTAL) {
    throw new Error(`Bench slots must total ${EXPECTED_BENCH_TOTAL} (got ${benchTotal})`);
  }

  return normalized;
}

export async function updateSquadStructureConfig(slots, leagueId = DEFAULT_LEAGUE_ID) {
  const normalized = normalizeSlotsInput(slots);
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const slot of normalized) {
      await client.query(
        `UPDATE squad_structure_config
         SET required_count = $1
         WHERE league_id = $2 AND slot_type = $3 AND is_playing = $4`,
        [slot.requiredCount, leagueId, slot.slotType, slot.isPlaying]
      );
    }

    await client.query('COMMIT');
    return getSquadStructureAdmin(leagueId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
