/**
 * Auto-substitution engine (Phase 7).
 * Pure functions — no DB or network. Callers supply featured XI and per-player base points.
 *
 * Rule: if a playing squad member does not feature in the real match XI,
 * the highest-scoring bench player who did play auto-fills (each bench player used once).
 * Captain cascade: if captain is not in the effective XI, vice-captain gets 2× if playing.
 */

export const PLAYING_XI_SIZE = 12;
export const CAPTAIN_MULTIPLIER = 2;

/**
 * @typedef {object} SquadSlot
 * @property {string} [id]
 * @property {string} slot_type
 * @property {number} slot_index
 * @property {string|null} player_id
 * @property {boolean} [is_playing]
 */

/**
 * @typedef {object} AutoSubChange
 * @property {'sub'|'empty'|'no_bench'} type
 * @property {string|null} outPlayerId
 * @property {string|null} inPlayerId
 * @property {string} slotType
 */

/**
 * @typedef {object} EffectiveStarter
 * @property {string} slotType
 * @property {number} slotIndex
 * @property {string|null} intendedPlayerId
 * @property {string|null} effectivePlayerId
 * @property {number} basePoints
 * @property {number} multiplier
 * @property {number} fantasyPoints
 * @property {boolean} autoSub
 */

/**
 * @typedef {object} EffectiveLineupResult
 * @property {EffectiveStarter[]} starters
 * @property {AutoSubChange[]} changes
 * @property {string|null} effectiveCaptainId
 * @property {string|null} captainMultiplierPlayerId
 * @property {number} totalPoints
 */

function toFeaturedSet(featuredPlayerIds) {
  if (featuredPlayerIds instanceof Set) return featuredPlayerIds;
  if (Array.isArray(featuredPlayerIds)) return new Set(featuredPlayerIds);
  return new Set(
    Object.entries(featuredPlayerIds || {})
      .filter(([, featured]) => Boolean(featured))
      .map(([id]) => id)
  );
}

function getBasePoints(playerPoints, playerId) {
  if (!playerId) return 0;
  return Number(playerPoints?.[playerId] ?? 0);
}

/**
 * @param {object} params
 * @param {SquadSlot[]} params.playingSlots
 * @param {SquadSlot[]} params.benchSlots
 * @param {string|null} params.captainPlayerId
 * @param {string|null} params.viceCaptainPlayerId
 * @param {Set<string>|string[]|Record<string, boolean>} params.featuredPlayerIds
 * @param {Record<string, number>} params.playerPoints
 * @returns {EffectiveLineupResult}
 */
export function computeEffectiveLineup({
  playingSlots,
  benchSlots,
  captainPlayerId = null,
  viceCaptainPlayerId = null,
  featuredPlayerIds,
  playerPoints = {},
  captainMultiplier = CAPTAIN_MULTIPLIER,
}) {
  const featured = toFeaturedSet(featuredPlayerIds);
  const usedBench = new Set();
  const changes = [];
  const starters = [];

  const sortedPlaying = [...(playingSlots || [])].sort(compareSlotOrder);
  const bench = [...(benchSlots || [])];

  for (const slot of sortedPlaying) {
    const intendedId = slot.player_id ?? null;
    const slotType = slot.slot_type;
    const slotIndex = slot.slot_index ?? 0;

    if (!intendedId) {
      starters.push(makeStarter(slotType, slotIndex, null, null, 0, 1, false));
      changes.push({ type: 'empty', outPlayerId: null, inPlayerId: null, slotType });
      continue;
    }

    if (featured.has(intendedId)) {
      const base = getBasePoints(playerPoints, intendedId);
      starters.push(makeStarter(slotType, slotIndex, intendedId, intendedId, base, 1, false));
      continue;
    }

    const sub = pickBestBenchSub(bench, featured, usedBench, playerPoints);
    if (sub) {
      usedBench.add(sub.player_id);
      const base = getBasePoints(playerPoints, sub.player_id);
      starters.push(
        makeStarter(slotType, slotIndex, intendedId, sub.player_id, base, 1, true)
      );
      changes.push({
        type: 'sub',
        outPlayerId: intendedId,
        inPlayerId: sub.player_id,
        slotType,
      });
    } else {
      starters.push(makeStarter(slotType, slotIndex, intendedId, null, 0, 1, false));
      changes.push({
        type: 'no_bench',
        outPlayerId: intendedId,
        inPlayerId: null,
        slotType,
      });
    }
  }

  const effectiveIds = starters
    .map((s) => s.effectivePlayerId)
    .filter(Boolean);

  let captainMultiplierPlayerId = null;
  let effectiveCaptainId = captainPlayerId;

  if (captainPlayerId && effectiveIds.includes(captainPlayerId)) {
    captainMultiplierPlayerId = captainPlayerId;
  } else if (viceCaptainPlayerId && effectiveIds.includes(viceCaptainPlayerId)) {
    captainMultiplierPlayerId = viceCaptainPlayerId;
    effectiveCaptainId = viceCaptainPlayerId;
  }

  let totalPoints = 0;
  const capMult = Number(captainMultiplier) >= 1 ? Number(captainMultiplier) : CAPTAIN_MULTIPLIER;
  for (const starter of starters) {
    if (!starter.effectivePlayerId) continue;
    const multiplier =
      starter.effectivePlayerId === captainMultiplierPlayerId ? capMult : 1;
    starter.multiplier = multiplier;
    starter.fantasyPoints = starter.basePoints * multiplier;
    totalPoints += starter.fantasyPoints;
  }

  return {
    starters,
    changes,
    effectiveCaptainId,
    captainMultiplierPlayerId,
    totalPoints,
  };
}

function makeStarter(
  slotType,
  slotIndex,
  intendedPlayerId,
  effectivePlayerId,
  basePoints,
  multiplier,
  autoSub
) {
  return {
    slotType,
    slotIndex,
    intendedPlayerId,
    effectivePlayerId,
    basePoints,
    multiplier,
    fantasyPoints: basePoints * multiplier,
    autoSub,
  };
}

function pickBestBenchSub(benchSlots, featured, usedBench, playerPoints) {
  return benchSlots
    .filter(
      (slot) =>
        slot.player_id &&
        featured.has(slot.player_id) &&
        !usedBench.has(slot.player_id)
    )
    .sort(
      (a, b) =>
        getBasePoints(playerPoints, b.player_id) -
        getBasePoints(playerPoints, a.player_id)
    )[0];
}

function compareSlotOrder(a, b) {
  const order = { WK: 1, BAT: 2, BOWL: 3, FLEX: 4, BENCH: 5 };
  const typeDiff = (order[a.slot_type] ?? 99) - (order[b.slot_type] ?? 99);
  if (typeDiff !== 0) return typeDiff;
  return (a.slot_index ?? 0) - (b.slot_index ?? 0);
}

/**
 * Split squad slots into playing XI and bench arrays.
 * @param {SquadSlot[]} slots
 */
export function splitSquadSlots(slots) {
  const playingSlots = [];
  const benchSlots = [];
  for (const slot of slots || []) {
    if (slot.is_playing === false || slot.slot_type === 'BENCH') {
      benchSlots.push(slot);
    } else {
      playingSlots.push(slot);
    }
  }
  return { playingSlots, benchSlots };
}
