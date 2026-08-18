import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LockCountdown, { FormBadge, OverseasBadge } from './PlayerPoolBadges';

const SORT_LABELS = {
  price_desc: 'Price ↓',
  price_asc: 'Price ↑',
  name: 'Name',
  role: 'Role',
  franchise: 'Franchise',
  points_desc: 'Points ↓',
  form_desc: 'Form ↓',
};

export default function FreeAgents() {
  const [players, setPlayers] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [transferWindow, setTransferWindow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [franchiseFilter, setFranchiseFilter] = useState('');
  const [overseasFilter, setOverseasFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('price_desc');

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ sort });
      if (roleFilter) params.set('role', roleFilter);
      if (franchiseFilter) params.set('franchise', franchiseFilter);
      if (overseasFilter) params.set('overseas', overseasFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/free-agents?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load players');
      setPlayers(data.players || []);
      setFranchises(data.franchises || []);
      setTransferWindow(data.transferWindow);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, franchiseFilter, overseasFilter, search, sort]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  const windowLabel = useMemo(() => {
    if (!transferWindow) return null;
    if (transferWindow.mode === 'initial_build') return 'Initial squad build — transfers unrestricted';
    if (!transferWindow.windowOpen) return 'Transfer window closed';
    if (transferWindow.mode === 'playoffs') {
      return `${transferWindow.tradesRemainingThisRound ?? 0} playoff trades left`;
    }
    return `${transferWindow.freeTradesAvailable ?? 0} free trades available`;
  }, [transferWindow]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">Pool</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Free agents</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Browse the full player pool with filters, sort, and lock countdowns.
          </p>
        </div>
        <Link href="/squad" className="btn-primary text-sm">
          Edit squad →
        </Link>
      </div>

      {windowLabel && (
        <div className="surface-card mb-4 p-4 text-sm text-zinc-300">
          <span className="text-zinc-500">Transfer window · </span>
          {windowLabel}
          {transferWindow?.currentRound?.name && (
            <span className="text-zinc-500"> · {transferWindow.currentRound.name}</span>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="surface-card p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            type="search"
            placeholder="Search players…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark min-w-[10rem] flex-1"
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
            <option value="">All franchises</option>
            {franchises.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            value={overseasFilter}
            onChange={(e) => setOverseasFilter(e.target.value)}
            className="input-dark w-auto"
          >
            <option value="">All players</option>
            <option value="true">Overseas only</option>
            <option value="false">Local only</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-dark w-auto">
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                Sort: {label}
              </option>
            ))}
          </select>
          <button type="button" onClick={loadPlayers} className="btn-ghost text-sm">
            Apply
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent-500" />
          </div>
        ) : players.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">No players match your filters.</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-zinc-500">{players.length} players</p>
            <div className="divide-y divide-white/5">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-surface-900">
                    {player.imageUrl ? (
                      <img src={player.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/player/${player.id}`}
                        className="font-medium text-zinc-100 hover:text-accent-300"
                      >
                        {player.fullName}
                      </Link>
                      <FormBadge form={player.form} label={player.formLabel} />
                      <OverseasBadge isOverseas={player.isOverseas} />
                      {player.owned && (
                        <span className="rounded bg-accent-500/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-300">
                          Your squad
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">
                      {player.role} · {player.franchiseName || '—'} · {player.price ?? '—'} cr
                      {player.matchesPlayed > 0 && (
                        <span> · {player.seasonPoints} pts ({player.matchesPlayed} m)</span>
                      )}
                    </p>
                    <LockCountdown lock={player.lock} className="mt-1 block" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
