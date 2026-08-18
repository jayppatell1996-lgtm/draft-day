import { useEffect, useState } from 'react';

export default function AdminPlayers({ disabled, onMessage, onError, initialPlayers }) {
  const [players, setPlayers] = useState(initialPlayers ?? []);
  const [search, setSearch] = useState('');
  const [bulkPercent, setBulkPercent] = useState('5');
  const [bulkRole, setBulkRole] = useState('');
  const [loading, setLoading] = useState(!initialPlayers);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (initialPlayers) {
      setPlayers(initialPlayers);
      setLoading(false);
      return;
    }
    loadPlayers();
  }, [initialPlayers]);

  async function loadPlayers(query = search) {
    setLoading(true);
    onError('');
    try {
      const params = new URLSearchParams({ includeInactive: 'true' });
      if (query) params.set('search', query);
      const res = await fetch(`/api/admin/players?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load players');
      setPlayers(data.players || []);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateLocalPrice(playerId, price) {
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, price: price === '' ? '' : Number(price) } : p))
    );
  }

  async function savePrice(playerId, price) {
    setBusy(`price-${playerId}`);
    onError('');
    onMessage('');
    try {
      const res = await fetch('/api/admin/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, price }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update price');
      onMessage(data.message || 'Price updated.');
      await loadPlayers();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function toggleActive(player) {
    setBusy(`active-${player.id}`);
    onError('');
    onMessage('');
    try {
      const res = await fetch('/api/admin/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, active: !player.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update player');
      onMessage(data.message || 'Player updated.');
      await loadPlayers();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function applyBulkAdjust() {
    if (!window.confirm(`Adjust all active player prices by ${bulkPercent}%?`)) return;
    setBusy('bulk');
    onError('');
    onMessage('');
    try {
      const res = await fetch('/api/admin/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulkAdjust: {
            percentDelta: Number(bulkPercent),
            role: bulkRole || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk adjust failed');
      onMessage(data.message || 'Bulk price adjust complete.');
      await loadPlayers();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="surface-card mt-6 p-4">
      <h2 className="text-sm font-semibold text-white">Player pool</h2>
      <p className="mt-2 text-sm text-zinc-400">Adjust prices and activate/deactivate pool entries.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players…"
          className="min-w-[12rem] flex-1 rounded-lg border border-white/10 bg-surface-950 px-3 py-2 text-sm"
        />
        <button type="button" disabled={disabled || loading} onClick={() => loadPlayers()} className="btn-ghost text-sm">
          Search
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-surface-950/50 p-3">
        <label className="text-sm text-zinc-300">
          Bulk % change
          <input
            type="number"
            value={bulkPercent}
            onChange={(e) => setBulkPercent(e.target.value)}
            className="mt-1 w-24 rounded-lg border border-white/10 bg-surface-950 px-2 py-1 text-sm"
          />
        </label>
        <label className="text-sm text-zinc-300">
          Role filter
          <select
            value={bulkRole}
            onChange={(e) => setBulkRole(e.target.value)}
            className="mt-1 rounded-lg border border-white/10 bg-surface-950 px-2 py-1 text-sm"
          >
            <option value="">All roles</option>
            <option value="WK">WK</option>
            <option value="BAT">BAT</option>
            <option value="BOWL">BOWL</option>
            <option value="AR">AR</option>
          </select>
        </label>
        <button type="button" disabled={disabled || busy === 'bulk'} onClick={applyBulkAdjust} className="btn-ghost text-sm">
          {busy === 'bulk' ? 'Applying…' : 'Apply bulk adjust'}
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-400">Loading players…</p>
      ) : (
        <div className="mt-4 max-h-96 overflow-auto rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface-900 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-zinc-200">
                    {player.fullName}
                    {player.franchiseName && (
                      <span className="ml-1 text-xs text-zinc-500">· {player.franchiseName}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{player.role}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min={0.5}
                        value={player.price ?? ''}
                        onChange={(e) => updateLocalPrice(player.id, e.target.value)}
                        className="w-20 rounded border border-white/10 bg-surface-950 px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        disabled={disabled || busy === `price-${player.id}`}
                        onClick={() => savePrice(player.id, player.price)}
                        className="text-xs text-accent-400 hover:text-accent-300"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={disabled || busy === `active-${player.id}`}
                      onClick={() => toggleActive(player)}
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        player.active
                          ? 'bg-accent-500/10 text-accent-300'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {player.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
