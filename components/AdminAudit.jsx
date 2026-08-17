import { useEffect, useState } from 'react';

export default function AdminAudit({ disabled, onMessage, onError }) {
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAudit();
  }, []);

  async function loadAudit() {
    setLoading(true);
    onError('');
    try {
      const res = await fetch('/api/admin/audit', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load audit data');
      setAudit(data);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="surface-card mt-6 p-4 text-sm text-zinc-400">Loading audit data…</div>
    );
  }

  const { teams = [], recentTransfers = [], recentLog = [] } = audit || {};

  return (
    <div className="surface-card mt-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Audit</h2>
          <p className="mt-2 text-sm text-zinc-400">Teams, squads, transfers, and trade log activity.</p>
        </div>
        <button type="button" disabled={disabled || loading} onClick={loadAudit} className="btn-ghost text-sm">
          Refresh
        </button>
      </div>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500">Teams</h3>
      <div className="mt-2 overflow-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2 text-center">Squad</th>
              <th className="px-3 py-2 text-center">Budget left</th>
              <th className="px-3 py-2 text-center">Banked</th>
              <th className="px-3 py-2 text-center">Transfers</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-t border-white/5">
                <td className="px-3 py-2 text-zinc-200">{team.name}</td>
                <td className="px-3 py-2 text-center text-zinc-400">{team.squadPlayers}/16</td>
                <td className="px-3 py-2 text-center text-zinc-400">
                  {team.budgetRemaining != null ? team.budgetRemaining.toFixed(1) : '—'}
                </td>
                <td className="px-3 py-2 text-center text-zinc-400">{team.freeTradesBanked}</td>
                <td className="px-3 py-2 text-center text-zinc-400">{team.transferCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500">Recent transfers</h3>
      <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-surface-900 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2">Change</th>
              <th className="px-3 py-2">Round</th>
            </tr>
          </thead>
          <tbody>
            {recentTransfers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-zinc-500">
                  No transfers yet.
                </td>
              </tr>
            ) : (
              recentTransfers.map((row) => (
                <tr key={row.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-zinc-500">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">{row.teamName}</td>
                  <td className="px-3 py-2 text-zinc-400">
                    {row.playerOutName} → {row.playerInName}
                    {row.usedFreeTrade && (
                      <span className="ml-1 text-xs text-accent-400">free</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">
                    {row.roundNumber ? `R${row.roundNumber}` : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500">Trade log</h3>
      <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-white/10">
        <ul className="divide-y divide-white/5 text-sm">
          {recentLog.length === 0 ? (
            <li className="px-3 py-4 text-zinc-500">No trade log entries.</li>
          ) : (
            recentLog.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span className="text-zinc-300">
                  {row.teamName} · <span className="text-zinc-500">{row.action}</span>
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(row.createdAt).toLocaleString()}
                  {row.roundNumber ? ` · R${row.roundNumber}` : ''}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
