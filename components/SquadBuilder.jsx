import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LockCountdown, { FormBadge, OverseasBadge } from './PlayerPoolBadges';
import {
  assignPlayerToDraftSlot,
  calculateDraftSpent,
  clearDraftSlot,
  draftIsDirty,
  validateDraftSquad,
} from '../lib/squadDraft';

const SLOT_LABELS = {
  WK: 'Wicketkeeper',
  BAT: 'Batsman',
  BOWL: 'Bowler',
  FLEX: 'Flex',
  BENCH: 'Bench',
};

function slotLabel(slot) {
  const base = SLOT_LABELS[slot.slot_type] || slot.slot_type;
  if (slot.slot_type === 'BENCH') return `${base} ${slot.slot_index + 1}`;
  if (['BAT', 'BOWL'].includes(slot.slot_type) && slot.slot_index > 0) {
    return `${base} ${slot.slot_index + 1}`;
  }
  return base;
}

function cloneSlots(slots) {
  return JSON.parse(JSON.stringify(slots));
}

export default function SquadBuilder() {
  const [squadData, setSquadData] = useState(null);
  const [draftSlots, setDraftSlots] = useState([]);
  const [draftCaptainId, setDraftCaptainId] = useState(null);
  const [draftViceId, setDraftViceId] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [franchiseFilter, setFranchiseFilter] = useState('');
  const [poolSort, setPoolSort] = useState('price_desc');
  const [search, setSearch] = useState('');

  const syncDraft = useCallback((data) => {
    setDraftSlots(cloneSlots(data.slots));
    setDraftCaptainId(data.squad.captainPlayerId);
    setDraftViceId(data.squad.viceCaptainPlayerId);
  }, []);

  const loadSquad = useCallback(async () => {
    const res = await fetch('/api/my-squad');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load squad');
    setSquadData(data);
    syncDraft(data);
    return data;
  }, [syncDraft]);

  const loadPlayers = useCallback(async () => {
    const res = await fetch('/api/league-players', { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load players');
    const pool = data.players || [];
    setAllPlayers(pool);
    setFranchises(
      [...new Map(
        pool
          .filter((p) => p.franchiseExternalId)
          .map((p) => [p.franchiseExternalId, { id: p.franchiseExternalId, name: p.franchiseName }])
      ).values()].sort((a, b) => a.name.localeCompare(b.name))
    );
  }, []);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError('');
        const squad = await loadSquad();
        if (squad.playerPoolSize === 0) {
          setError('Player pool is empty. Run: node --env-file=.env.local scripts/seed-players.js');
        }
        await loadPlayers();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [loadSquad, loadPlayers]);

  const players = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = allPlayers.filter((player) => {
      if (roleFilter && player.role !== roleFilter) return false;
      if (franchiseFilter && String(player.franchiseExternalId) !== String(franchiseFilter)) {
        return false;
      }
      if (q && !player.fullName.toLowerCase().includes(q)) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (poolSort) {
        case 'price_asc':
          return (a.price ?? 0) - (b.price ?? 0);
        case 'points_desc':
          return (b.seasonPoints ?? 0) - (a.seasonPoints ?? 0);
        case 'form_desc':
          return (
            (b.formScore ?? 0) - (a.formScore ?? 0) ||
            (b.seasonPoints ?? 0) - (a.seasonPoints ?? 0)
          );
        case 'name':
          return a.fullName.localeCompare(b.fullName);
        default:
          return (b.price ?? 0) - (a.price ?? 0);
      }
    });

    return list;
  }, [allPlayers, roleFilter, franchiseFilter, search, poolSort]);

  const selectedSlot = useMemo(
    () => draftSlots.find((s) => s.id === selectedSlotId) ?? null,
    [draftSlots, selectedSlotId]
  );

  const ownedIds = useMemo(
    () => new Set(draftSlots.filter((s) => s.player_id).map((s) => s.player_id)),
    [draftSlots]
  );

  const isDirty = useMemo(() => {
    if (!squadData || draftSlots.length === 0) return false;
    return draftIsDirty(
      squadData.slots,
      draftSlots,
      squadData.squad.captainPlayerId,
      draftCaptainId,
      squadData.squad.viceCaptainPlayerId,
      draftViceId
    );
  }, [squadData, draftSlots, draftCaptainId, draftViceId]);

  const draftSpent = useMemo(() => calculateDraftSpent(draftSlots), [draftSlots]);
  const draftFilled = useMemo(() => draftSlots.filter((s) => s.player_id).length, [draftSlots]);

  function handleDraftAssign(player) {
    if (!selectedSlotId) return;
    setDraftSlots((prev) => assignPlayerToDraftSlot(prev, selectedSlotId, player));
    setSaveMessage('');
    setActionError('');
  }

  function handleDraftClear(slotId) {
    setDraftSlots((prev) => {
      const removedId = prev.find((s) => s.id === slotId)?.player_id;
      if (removedId) {
        setDraftCaptainId((c) => (c === removedId ? null : c));
        setDraftViceId((v) => (v === removedId ? null : v));
      }
      return clearDraftSlot(prev, slotId);
    });
    setSaveMessage('');
  }

  function handleDraftCaptain(playerId, role) {
    if (role === 'captain') {
      setDraftCaptainId(playerId);
      if (draftViceId === playerId) setDraftViceId(null);
    } else {
      setDraftViceId(playerId);
      if (draftCaptainId === playerId) setDraftCaptainId(null);
    }
    setSaveMessage('');
  }

  function handleDiscard() {
    if (!squadData) return;
    syncDraft(squadData);
    setActionError('');
    setSaveMessage('');
  }

  async function handleSave() {
    if (!squadData) return;
    const { squad, requiredCount, transferWindow } = squadData;

    if (transferWindow?.mode === 'initial_build') {
      const fullValidation = validateDraftSquad(draftSlots, {
        salaryCap: squad.salaryCap,
        requiredCount,
      });
      if (!fullValidation.ok) {
        setActionError(fullValidation.error);
        return;
      }
    } else if (draftSpent > squad.salaryCap) {
      setActionError(`Squad exceeds salary cap (${draftSpent.toFixed(1)} / ${squad.salaryCap}).`);
      return;
    }

    setSaving(true);
    setActionError('');
    setSaveMessage('');
    try {
      let latest = squadData;

      for (const draftSlot of draftSlots) {
        const serverSlot = latest.slots.find((s) => s.id === draftSlot.id);
        if (serverSlot?.player_id === draftSlot.player_id) continue;

        if (draftSlot.player_id) {
          const res = await fetch('/api/my-squad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'assign',
              slotId: draftSlot.id,
              playerId: draftSlot.player_id,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to save squad change');
          latest = data;
        } else if (serverSlot?.player_id) {
          const res = await fetch('/api/my-squad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear', slotId: draftSlot.id }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to clear slot');
          latest = data;
        }
      }

      if (draftCaptainId !== latest.squad.captainPlayerId && draftCaptainId) {
        const res = await fetch('/api/my-squad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'captain', playerId: draftCaptainId, captainRole: 'captain' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to set captain');
        latest = data;
      }

      if (draftViceId !== latest.squad.viceCaptainPlayerId && draftViceId) {
        const res = await fetch('/api/my-squad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'captain', playerId: draftViceId, captainRole: 'vice' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to set vice-captain');
        latest = data;
      }

      setSquadData(latest);
      syncDraft(latest);
      setSaveMessage('Squad saved.');
    } catch (err) {
      setActionError(err.message);
      await loadSquad();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent-500" />
      </div>
    );
  }

  if (error && !squadData) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error}
      </div>
    );
  }

  const { squad, requiredCount, transferWindow } = squadData;
  const budgetRemaining = Number((squad.salaryCap - draftSpent).toFixed(2));

  const windowLabel = (() => {
    if (!transferWindow) return 'Loading…';
    if (transferWindow.mode === 'initial_build') return 'Initial squad build — save when all 16 picked';
    if (!transferWindow.windowOpen) return 'Transfer window closed';
    if (transferWindow.mode === 'playoffs') {
      return `${transferWindow.tradesRemainingThisRound ?? 0} playoff trades left (0 free)`;
    }
    return `${transferWindow.freeTradesAvailable ?? 0} free trades available`;
  })();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {error && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </div>
      )}

      {isDirty && (
        <div className="surface-card mb-4 flex flex-wrap items-center justify-between gap-3 border border-accent-500/30 p-4">
          <p className="text-sm text-zinc-300">Unsaved squad changes</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={saving} onClick={handleDiscard} className="btn-ghost text-sm">
              Discard
            </button>
            <button type="button" disabled={saving} onClick={handleSave} className="btn-primary text-sm">
              {saving ? 'Saving…' : 'Save squad'}
            </button>
          </div>
        </div>
      )}

      {saveMessage && (
        <div className="mb-4 rounded-lg border border-accent-500/30 bg-accent-500/10 px-4 py-3 text-sm text-accent-200">
          {saveMessage}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Budget</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {draftSpent.toFixed(1)} / {squad.salaryCap}
          </p>
          <p className={`mt-1 text-sm ${budgetRemaining < 0 ? 'text-red-400' : 'text-accent-400'}`}>
            {budgetRemaining.toFixed(1)} remaining
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Squad</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {draftFilled} / {requiredCount}
          </p>
          <p className="mt-1 text-sm text-zinc-400">12 playing + 4 bench</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Transfers</p>
          <p className="mt-1 text-sm font-medium text-zinc-100">{windowLabel}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Selection</p>
          <p className="mt-1 text-sm text-zinc-300">
            {selectedSlot ? `Pick for ${slotLabel(selectedSlot)}` : 'Click a slot, then pick from pool'}
          </p>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {actionError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="surface-card p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">Your squad</h2>
          <div className="space-y-2">
            {draftSlots.map((slot) => {
              const isSelected = selectedSlotId === slot.id;
              const isCaptain = draftCaptainId === slot.player_id;
              const isVice = draftViceId === slot.player_id;
              return (
                <div
                  key={slot.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    isSelected
                      ? 'border-accent-500/50 bg-accent-500/10'
                      : 'border-white/10 bg-surface-950 hover:border-white/20'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-surface-900 text-xs font-semibold text-zinc-400">
                      {slot.slot_type}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-zinc-500">{slotLabel(slot)}</p>
                      {slot.player ? (
                        <>
                          <p className="truncate font-medium text-zinc-100">{slot.player.full_name}</p>
                          <p className="text-xs text-zinc-400">
                            {slot.player.role} · {slot.player.price} cr
                            {isCaptain && ' · C'}
                            {isVice && ' · VC'}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-zinc-500">Empty slot</p>
                      )}
                    </div>
                  </button>
                  {slot.player && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleDraftCaptain(slot.player_id, 'captain')}
                        className="btn-ghost text-xs"
                      >
                        Captain
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleDraftCaptain(slot.player_id, 'vice')}
                        className="btn-ghost text-xs"
                      >
                        Vice
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleDraftClear(slot.id)}
                        className="btn-ghost text-xs text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="surface-card p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Player pool</h2>
            <Link href="/free-agents" className="text-xs text-accent-400 hover:underline">
              Full pool →
            </Link>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              type="search"
              placeholder="Search players…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-dark max-w-xs flex-1"
            />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-dark w-auto">
              <option value="">All roles</option>
              <option value="WK">WK</option>
              <option value="BAT">BAT</option>
              <option value="BOWL">BOWL</option>
              <option value="AR">AR</option>
            </select>
            <select
              value={franchiseFilter}
              onChange={(e) => setFranchiseFilter(e.target.value)}
              className="input-dark w-auto"
            >
              <option value="">All teams</option>
              {franchises.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <select value={poolSort} onChange={(e) => setPoolSort(e.target.value)} className="input-dark w-auto">
              <option value="price_desc">Price ↓</option>
              <option value="price_asc">Price ↑</option>
              <option value="points_desc">Points ↓</option>
              <option value="form_desc">Form ↓</option>
              <option value="name">Name</option>
            </select>
          </div>

          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {players.map((player) => {
              const owned = ownedIds.has(player.id);
              const locked = player.locked;
              const overBudget =
                selectedSlot &&
                budgetRemaining + (selectedSlot.player?.price ?? 0) < player.price;
              const canPick =
                Boolean(selectedSlotId) &&
                !owned &&
                !overBudget &&
                !locked &&
                !saving &&
                (transferWindow?.canTransfer !== false ||
                  transferWindow?.mode === 'initial_build' ||
                  !selectedSlot?.player_id);

              const content = (
                <>
                  <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-surface-900">
                    {player.imageUrl ? (
                      <img src={player.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate font-medium text-zinc-100">{player.fullName}</p>
                      <FormBadge form={player.form} label={player.formLabel} />
                      <OverseasBadge isOverseas={player.isOverseas} />
                    </div>
                    <p className="text-xs text-zinc-400">
                      {player.role} · {player.franchiseName || '—'} · {player.price} cr
                      {player.matchesPlayed > 0 && (
                        <span> · {player.seasonPoints} pts ({player.matchesPlayed}m)</span>
                      )}
                    </p>
                    <LockCountdown lock={player.lock} className="mt-0.5 block" />
                  </div>
                  {owned && <span className="text-xs text-zinc-500">In squad</span>}
                  {locked && !owned && <span className="text-xs text-red-400/80">Locked</span>}
                  {selectedSlotId && overBudget && !owned && (
                    <span className="text-xs text-amber-400/80">Over budget</span>
                  )}
                </>
              );

              const rowClass = canPick
                ? 'border-white/10 bg-surface-950 hover:border-accent-500/30 hover:bg-accent-500/5 cursor-pointer'
                : 'border-white/5 bg-surface-950/50';

              if (canPick) {
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => handleDraftAssign(player)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${rowClass}`}
                  >
                    {content}
                  </button>
                );
              }

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${rowClass} ${
                    owned || overBudget || locked ? 'opacity-60' : ''
                  }`}
                >
                  {content}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
