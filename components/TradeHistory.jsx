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
    return `Banked ${entry.payload?.unusedBanked ?? 0} unused free trades`;
  }
  return entry.action;
}

export default function TradeHistory() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/trade-log', { cache: 'no-store' });
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
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Trade history</h1>
          <p className="mt-1 text-sm text-zinc-400">Transfers and squad changes per round</p>
        </div>
        <Link href="/squad" className="btn-ghost text-sm">
          ← My squad
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="surface-card p-6 text-sm text-zinc-400">
          No trades recorded yet. Changes during initial squad build and transfers appear here.
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
              {entry.roundName && (
                <p className="mt-1 text-xs text-zinc-500">{entry.roundName}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
