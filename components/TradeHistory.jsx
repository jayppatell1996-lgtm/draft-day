import { useEffect, useState } from 'react';
import Link from 'next/link';

function formatAction(entry) {
  if (entry.action === 'transfer' && entry.transfer) {
    const free = entry.transfer.usedFreeTrade ? ' (free)' : '';
    return `Swapped ${entry.transfer.playerOut.name} → ${entry.transfer.playerIn.name}${free}`;
  }
  if (entry.action === 'squad_pick') {
    return `Added ${entry.payload?.playerIn || 'player'}`;
  }
  if (entry.action === 'round_banking') {
    return `Banked ${entry.payload?.unusedBanked ?? 0} unused free trades (total ${entry.payload?.bankedTotal ?? '—'})`;
  }
  return entry.action.replace(/_/g, ' ');
}

export default function TradeHistory() {
  const [entries, setEntries] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [roundFilter, setRoundFilter] = useState('');
  const [transferWindow, setTransferWindow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadMeta() {
      try {
        const [roundsRes, windowRes] = await Promise.all([
          fetch('/api/league/rounds?all=1', { cache: 'no-store' }),
          fetch('/api/transfer-window', { cache: 'no-store' }),
        ]);
        const roundsData = await roundsRes.json();
        const windowData = await windowRes.json();
        if (roundsRes.ok) setRounds(roundsData.rounds || []);
        if (windowRes.ok) setTransferWindow(windowData);
      } catch {
        /* optional meta */
      }
    }
    loadMeta();
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        const params = roundFilter ? `?round=${roundFilter}` : '';
        const res = await fetch(`/api/trade-log${params}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load trade log');
        setEntries(data.entries || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [roundFilter]);

  if (loading && entries.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent-500" />
      </div>
    );
  }

  const windowLabel = (() => {
    if (!transferWindow) return null;
    if (transferWindow.mode === 'initial_build') return 'Initial squad build';
    if (!transferWindow.windowOpen) return 'Transfer window closed';
    if (transferWindow.mode === 'playoffs') {
      return `${transferWindow.tradesRemainingThisRound ?? 0} playoff trades left`;
    }
    return `${transferWindow.freeTradesAvailable ?? 0} free trades · ${transferWindow.bankedFreeTrades ?? 0} banked`;
  })();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">Activity</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Trade history</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Transfers, squad picks, and free-trade banking by round.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/my-team" className="btn-ghost text-sm">
            My team
          </Link>
          <Link href="/squad" className="btn-primary text-sm">
            Edit squad
          </Link>
        </div>
      </div>

      {windowLabel && (
        <div className="surface-card mb-4 p-4 text-sm text-zinc-300">
          <span className="text-zinc-500">Current window · </span>
          {windowLabel}
          {transferWindow?.currentRound?.name && (
            <span className="text-zinc-500"> · {transferWindow.currentRound.name}</span>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="text-sm text-zinc-400">
          Round
          <select
            value={roundFilter}
            onChange={(e) => setRoundFilter(e.target.value)}
            className="ml-2 rounded-lg border border-white/10 bg-surface-950 px-3 py-1.5 text-sm text-zinc-200"
          >
            <option value="">All rounds</option>
            {rounds.map((r) => (
              <option key={r.id} value={r.roundNumber}>
                {r.name || `Round ${r.roundNumber}`}
                {r.isPlayoff ? ' (playoff)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="surface-card p-6 text-sm text-zinc-400">
          No trades recorded{roundFilter ? ' for this round' : ''} yet. Changes during initial squad
          build and transfers appear here.
        </div>
      ) : (
        <div className="surface-card divide-y divide-white/5">
          {entries.map((entry) => (
            <div key={entry.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-zinc-100">{formatAction(entry)}</p>
                <time className="text-xs text-zinc-500">
                  {new Date(entry.createdAt).toLocaleString()}
                </time>
              </div>
              {(entry.roundName || entry.roundNumber) && (
                <p className="mt-1 text-xs text-zinc-500">
                  {entry.roundName || `Round ${entry.roundNumber}`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
