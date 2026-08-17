import { useCallback, useEffect, useMemo, useState } from 'react';

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

export default function SquadBuilder() {
  const [squadData, setSquadData] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [franchiseFilter, setFranchiseFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadSquad = useCallback(async () => {
    const res = await fetch('/api/my-squad');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load squad');
    setSquadData(data);
    return data;
  }, []);

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
    return allPlayers.filter((player) => {
      if (roleFilter && player.role !== roleFilter) return false;
      if (franchiseFilter && String(player.franchiseExternalId) !== String(franchiseFilter)) {
        return false;
      }
      if (q && !player.fullName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allPlayers, roleFilter, franchiseFilter, search]);

  const selectedSlot = useMemo(
    () => squadData?.slots?.find((s) => s.id === selectedSlotId) ?? null,
    [squadData, selectedSlotId]
  );

  const ownedIds = useMemo(
    () => new Set(squadData?.slots?.filter((s) => s.player_id).map((s) => s.player_id) ?? []),
    [squadData]
  );

  const spent = useMemo(() => {
    if (!squadData?.slots) return 0;
    return squadData.slots.reduce((t, s) => t + (s.player?.price ?? 0), 0);
  }, [squadData]);

  async function handleAssign(playerId) {
    if (!selectedSlotId) return;
    setSaving(true);
    setActionError('');
    try {
      const res = await fetch('/api/my-squad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', slotId: selectedSlotId, playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assign failed');
      setSquadData(data);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleClear(slotId) {
    setSaving(true);
    setActionError('');
    try {
      const res = await fetch('/api/my-squad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear', slotId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Clear failed');
      setSquadData(data);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCaptain(playerId, captainRole) {
    setSaving(true);
    setActionError('');
    try {
      const res = await fetch('/api/my-squad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'captain', playerId, captainRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Captain update failed');
      setSquadData(data);
    } catch (err) {
      setActionError(err.message);
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

  const { squad, slots, filledCount, requiredCount, transferWindow } = squadData;

  const windowLabel = (() => {
    if (!transferWindow) return 'Loading…';
    if (transferWindow.mode === 'initial_build') return 'Initial squad build — no trade limits';
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Budget</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {spent.toFixed(1)} / {squad.salaryCap}
          </p>
          <p className="mt-1 text-sm text-accent-400">{squad.budgetRemaining.toFixed(1)} remaining</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Squad</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {filledCount} / {requiredCount}
          </p>
          <p className="mt-1 text-sm text-zinc-400">12 playing + 4 bench</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Transfers</p>
          <p className="mt-1 text-sm font-medium text-zinc-100">{windowLabel}</p>
          {transferWindow?.mode !== 'initial_build' && transferWindow?.currentRound && (
            <p className="mt-1 text-xs text-zinc-500">
              {transferWindow.currentRound.name || `Round ${transferWindow.currentRound.roundNumber}`}
              {transferWindow.bankedFreeTrades > 0 && ` · ${transferWindow.bankedFreeTrades} banked`}
            </p>
          )}
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Selection</p>
          <p className="mt-1 text-sm text-zinc-300">
            {selectedSlot
              ? `Pick for ${slotLabel(selectedSlot)}`
              : 'Click a slot to assign a player'}
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
            {slots.map((slot) => {
              const isSelected = selectedSlotId === slot.id;
              const isCaptain = squad.captainPlayerId === slot.player_id;
              const isVice = squad.viceCaptainPlayerId === slot.player_id;
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
                        onClick={() => handleCaptain(slot.player_id, 'captain')}
                        className="btn-ghost text-xs"
                      >
                        Captain
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleCaptain(slot.player_id, 'vice')}
                        className="btn-ghost text-xs"
                      >
                        Vice
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleClear(slot.id)}
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
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">Player pool</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              type="search"
              placeholder="Search players…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-dark max-w-xs flex-1"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-dark w-auto"
            >
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
          </div>

          {!selectedSlotId && (
            <p className="mb-3 text-sm text-zinc-500">
              Browse and filter the pool below. Select a squad slot on the left to assign a player.
            </p>
          )}

          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {players.length === 0 ? (
              <p className="text-sm text-zinc-500">No players match your filters.</p>
            ) : (
              <>
                <p className="mb-2 text-xs text-zinc-500">
                  Showing {players.length} of {allPlayers.length} players
                </p>
                {players.map((player) => {
                  const owned = ownedIds.has(player.id);
                  const locked = player.locked;
                  const overBudget =
                    selectedSlot &&
                    squad.budgetRemaining + (selectedSlot.player?.price ?? 0) < player.price;
                  const canAssign = Boolean(selectedSlotId) && !owned && !overBudget && !locked && !saving && (transferWindow?.canTransfer !== false || transferWindow?.mode === 'initial_build' || !selectedSlot?.player_id);
                  const rowClass = canAssign
                    ? 'border-white/10 bg-surface-950 hover:border-accent-500/30 hover:bg-accent-500/5 cursor-pointer'
                    : 'border-white/5 bg-surface-950/50';

                  const content = (
                    <>
                      <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-surface-900">
                        {player.imageUrl ? (
                          <img src={player.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-100">{player.fullName}</p>
                        <p className="text-xs text-zinc-400">
                          {player.role} · {player.franchiseName || '—'} · {player.price} cr
                          {player.isOverseas ? ' · ' : ''}
                          {player.isOverseas ? (
                            <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1 text-[10px] text-sky-300">
                              OS
                            </span>
                          ) : null}
                        </p>
                      </div>
                      {owned && <span className="text-xs text-zinc-500">In squad</span>}
                      {locked && !owned && <span className="text-xs text-red-400/80">Locked</span>}
                      {selectedSlotId && overBudget && !owned && (
                        <span className="text-xs text-amber-400/80">Over budget</span>
                      )}
                    </>
                  );

                  if (canAssign) {
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => handleAssign(player.id)}
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
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
