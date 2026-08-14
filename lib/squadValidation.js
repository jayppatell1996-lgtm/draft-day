/**
 * Pure squad validation helpers (unit-testable).
 */

export function canPlayerFillSlot(playerRole, slotType) {
  if (slotType === 'BENCH') return true;
  if (slotType === 'FLEX') return ['WK', 'BAT', 'BOWL', 'AR'].includes(playerRole);
  if (slotType === 'WK') return playerRole === 'WK';
  if (slotType === 'BAT') return playerRole === 'BAT' || playerRole === 'AR';
  if (slotType === 'BOWL') return playerRole === 'BOWL' || playerRole === 'AR';
  return false;
}

export function sumSquadPrices(slots) {
  return slots.reduce((total, slot) => {
    const price = slot.player?.price ?? 0;
    return slot.player_id ? total + Number(price) : total;
  }, 0);
}

export function calculateBudgetRemaining(slots, salaryCap) {
  const spent = sumSquadPrices(slots);
  return Number((salaryCap - spent).toFixed(2));
}

export function validateSquadComposition(slots, structureConfig) {
  const errors = [];
  const filled = slots.filter((s) => s.player_id);

  for (const rule of structureConfig) {
    const matching = filled.filter(
      (s) => s.slot_type === rule.slot_type && s.is_playing === rule.is_playing
    );
    if (matching.length > rule.required_count) {
      errors.push(`Too many ${rule.slot_type} slots (max ${rule.required_count})`);
    }
  }

  const playerIds = filled.map((s) => s.player_id);
  const unique = new Set(playerIds);
  if (unique.size !== playerIds.length) {
    errors.push('Duplicate players in squad');
  }

  for (const slot of filled) {
    const role = slot.player?.role;
    if (role && !canPlayerFillSlot(role, slot.slot_type)) {
      errors.push(`${slot.player.full_name} cannot fill ${slot.slot_type} slot`);
    }
  }

  return errors;
}

export function validateSwap({ slots, slotId, player, salaryCap }) {
  const targetSlot = slots.find((s) => s.id === slotId);
  if (!targetSlot) {
    return { ok: false, error: 'Slot not found' };
  }

  if (!canPlayerFillSlot(player.role, targetSlot.slot_type)) {
    return { ok: false, error: `${player.full_name} cannot fill ${targetSlot.slot_type} slot` };
  }

  const duplicate = slots.some(
    (s) => s.id !== slotId && s.player_id === player.id
  );
  if (duplicate) {
    return { ok: false, error: 'Player already in squad' };
  }

  const oldPrice = targetSlot.player?.price ?? 0;
  const newSpent =
    sumSquadPrices(slots) - Number(oldPrice) + Number(player.price);

  if (newSpent > salaryCap) {
    return {
      ok: false,
      error: `Exceeds salary cap (${newSpent.toFixed(1)} / ${salaryCap})`,
    };
  }

  return { ok: true, budgetRemaining: Number((salaryCap - newSpent).toFixed(2)) };
}
