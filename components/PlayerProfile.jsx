import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import LockCountdown, { FormBadge, OverseasBadge } from './PlayerPoolBadges';

export default function PlayerProfile({ playerId }) {
  const router = useRouter();
  const id = playerId || router.query.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/player-stats?playerId=${id}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load player');
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading || !id) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent-500" />
      </div>
    );
  }

  if (error || !data?.stats) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error || 'Player not found'}
        </div>
        <Link href="/free-agents" className="btn-ghost mt-4 inline-flex text-sm">
          ← Free agents
        </Link>
      </div>
    );
  }

  const { stats, history, price, lock } = data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/free-agents" className="btn-ghost mb-6 inline-flex text-sm">
        ← Free agents
      </Link>

      <div className="surface-card p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-surface-900">
            {stats.imageUrl ? (
              <img src={stats.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-white">{stats.fullName}</h1>
              <FormBadge form={stats.form} label={stats.formLabel} />
              <OverseasBadge isOverseas={stats.isOverseas} />
              {!stats.active && (
                <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">Inactive</span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              {stats.role} · {stats.franchiseName || '—'}
              {price != null && ` · ${price} cr`}
            </p>
            <LockCountdown lock={lock} className="mt-2 block" />
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Season pts" value={stats.totalPoints.toFixed(1)} />
          <Stat label="Matches" value={stats.matches} />
          <Stat label="Average" value={stats.averagePoints.toFixed(1)} />
          <Stat label="Runs / Wkts" value={`${stats.runs} / ${stats.wickets}`} />
        </dl>
      </div>

      <section className="surface-card mt-6 p-4">
        <h2 className="text-sm font-semibold text-white">Match history</h2>
        {history.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No scored fixtures yet. Points appear after admin submits fixture scores.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-white/5">
            {history.map((row, index) => (
              <div key={`${row.playedAt}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm text-zinc-200">{row.fixtureLabel}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(row.playedAt).toLocaleDateString()}
                    {row.featuredInXi && ' · XI'}
                    {row.isManOfMatch && ' · MoM'}
                  </p>
                </div>
                <p className="text-sm font-semibold text-accent-300">{row.points.toFixed(1)} pts</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-white">{value}</dd>
    </div>
  );
}
