/**
 * Draft squad validation (Phase 13).
 */

export function calculateDraftSpent(slots) {
  return slots.reduce((total, slot) => total + (slot.player?.price ?? 0), 0);
}

export function validateDraftSquad(slots, { salaryCap, requiredCount = 16 } = {}) {
  const filled = slots.filter((s) => s.player_id).length;
  const spent = calculateDraftSpent(slots);

  if (filled < requiredCount) {
    return {
      ok: false,
      error: `Pick ${requiredCount - filled} more player${requiredCount - filled === 1 ? '' : 's'} (including bench) before saving.`,
      filled,
      spent,
    };
  }

  if (salaryCap != null && spent > salaryCap) {
    return {
      ok: false,
      error: `Squad exceeds salary cap (${spent.toFixed(1)} / ${salaryCap}).`,
      filled,
      spent,
    };
  }

  return { ok: true, filled, spent };
}

export function assignPlayerToDraftSlot(slots, slotId, player) {
  return slots.map((slot) => {
    if (slot.id === slotId) {
      return {
        ...slot,
        player_id: player.id,
        player: {
          id: player.id,
          full_name: player.fullName || player.full_name,
          role: player.role,
          franchise_name: player.franchiseName || player.franchise_name,
          is_overseas: player.isOverseas ?? player.is_overseas,
          image_url: player.imageUrl || player.image_url,
          price: player.price,
        },
      };
    }
    if (slot.player_id === player.id) {
      return { ...slot, player_id: null, player: null };
    }
    return slot;
  });
}

export function clearDraftSlot(slots, slotId) {
  return slots.map((slot) =>
    slot.id === slotId ? { ...slot, player_id: null, player: null } : slot
  );
}

export function draftIsDirty(serverSlots, draftSlots, serverCaptain, draftCaptain, serverVice, draftVice) {
  if (serverCaptain !== draftCaptain || serverVice !== draftVice) return true;
  return draftSlots.some((slot, index) => {
    const server = serverSlots[index];
    return slot.player_id !== server?.player_id;
  });
}
