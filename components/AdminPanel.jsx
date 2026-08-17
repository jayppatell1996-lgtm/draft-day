import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function AdminPanel() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [clearTransfers, setClearTransfers] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.isAdmin) {
      router.replace('/matches');
    }
  }, [session, status, router]);

  async function loadOverview() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load admin data');
      setOverview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.user?.isAdmin) {
      loadOverview();
    }
  }, [session?.user?.isAdmin]);

  async function runAction(action) {
    const labels = {
      reset: 'Reset tournament',
      regenerate: 'Regenerate schedule',
    };
    const confirmText =
      action === 'reset'
        ? clearTransfers
          ? 'Reset the H2H schedule AND delete all trade history? Squads are kept.'
          : 'Reset the H2H schedule? Squads and trade logs are kept (round links cleared).'
        : clearTransfers
          ? 'Regenerate schedule and clear all trade history?'
          : 'Regenerate the H2H schedule from current teams?';

    if (!window.confirm(confirmText)) return;

    setBusy(action);
    setError('');
    setMessage('');
    try {
      const endpoint =
        action === 'reset' ? '/api/admin/reset-tournament' : '/api/admin/regenerate-schedule';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearTransfers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `${labels[action]} failed`);
      setMessage(data.message || 'Done.');
      await loadOverview();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent-500" />
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return null;
  }

  const { league, teams, stats } = overview || {};

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">League controls</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Reset or regenerate the H2H tournament for fresh testing.
          </p>
        </div>
        <Link href="/standings" className="btn-ghost text-sm">
          ← Standings
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-lg border border-accent-500/30 bg-accent-500/10 px-4 py-3 text-sm text-accent-200">
          {message}
        </div>
      )}

      {league && (
        <div className="surface-card mb-6 p-4">
          <h2 className="text-sm font-semibold text-white">Current state</h2>
          <dl className="mt-3 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Season</dt>
              <dd>{league.seasonLabel}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Status</dt>
              <dd className="capitalize">{league.status}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Teams</dt>
              <dd>{league.teamCount}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Schedule</dt>
              <dd>{league.hasSchedule ? 'Live' : 'Not generated'}</dd>
            </div>
            {stats && (
              <>
                <div>
                  <dt className="text-zinc-500">Rounds</dt>
                  <dd>{stats.rounds}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Matchups</dt>
                  <dd>{stats.matchups}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Transfers logged</dt>
                  <dd>{stats.transfers}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Trade log entries</dt>
                  <dd>{stats.trade_log_entries}</dd>
                </div>
              </>
            )}
          </dl>
          {teams?.length > 0 && (
            <p className="mt-4 text-xs text-zinc-500">
              Teams: {teams.map((t) => t.name).join(', ')}
            </p>
          )}
          {league.schedulePlan && !league.hasSchedule && (
            <p className="mt-3 text-xs text-zinc-400">
              Next schedule: {league.schedulePlan.rounds} rounds,{' '}
              {league.schedulePlan.totalMatchups} matchups ({league.teamCount} teams).
            </p>
          )}
        </div>
      )}

      <div className="surface-card p-4">
        <h2 className="text-sm font-semibold text-white">Tournament</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Use <strong className="font-medium text-zinc-300">Reset</strong> to clear the current
          H2H schedule so you can test signup → generate again. Squads are never deleted.
        </p>

        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={clearTransfers}
            onChange={(e) => setClearTransfers(e.target.checked)}
            className="mt-1 rounded border-white/20 bg-surface-950"
          />
          <span>
            Also clear transfer history and reset free-trade banking on all squads
          </span>
        </label>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={Boolean(busy) || !league?.hasSchedule}
            onClick={() => runAction('reset')}
            className="btn-ghost border border-red-500/30 text-red-200 hover:bg-red-500/10"
          >
            {busy === 'reset' ? 'Resetting…' : 'Reset tournament'}
          </button>
          <button
            type="button"
            disabled={Boolean(busy) || (!league?.canGenerateSchedule && !league?.hasSchedule)}
            onClick={() => runAction('regenerate')}
            className="btn-primary"
          >
            {busy === 'regenerate' ? 'Working…' : 'Regenerate schedule'}
          </button>
        </div>

        <ul className="mt-4 list-inside list-disc space-y-1 text-xs text-zinc-500">
          <li>Reset — deletes rounds and matchups; league status returns to draft.</li>
          <li>Regenerate — reset (if needed) then builds a new round-robin from current teams.</li>
          <li>Does not delete fantasy teams, accounts, or squad players.</li>
        </ul>
      </div>
    </div>
  );
}
