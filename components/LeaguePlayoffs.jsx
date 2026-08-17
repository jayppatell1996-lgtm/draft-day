import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

function resultLabel(matchup) {
  if (!matchup?.result) return 'Scheduled';
  switch (matchup.result) {
    case 'home_win':
      return `${matchup.homeName} won`;
    case 'away_win':
      return `${matchup.awayName} won`;
    case 'draw':
      return 'Draw';
    case 'no_result':
      return 'No result';
    default:
      return matchup.status;
  }
}

function MatchupCard({ matchup, highlight }) {
  if (!matchup) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 bg-surface-950/50 p-4 text-sm text-zinc-500">
        Waiting for prior results…
      </div>
    );
  }

  const decided = matchup.result && matchup.result !== 'no_result';

  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight
          ? 'border-accent-500/40 bg-accent-500/5'
          : 'border-white/10 bg-surface-950/50'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">{matchup.homeName}</p>
          {decided && (
            <p className="text-xs text-zinc-500">{matchup.homePoints ?? 0} pts</p>
          )}
        </div>
        <span className="text-xs text-zinc-500">vs</span>
        <div className="min-w-0 flex-1 text-right">
          <p className="truncate font-medium text-white">{matchup.awayName}</p>
          {decided && (
            <p className="text-xs text-zinc-500">{matchup.awayPoints ?? 0} pts</p>
          )}
        </div>
      </div>
      {decided && (
        <p className="mt-3 text-center text-xs font-medium text-accent-300">
          {resultLabel(matchup.result)}
        </p>
      )}
      {!decided && (
        <p className="mt-3 text-center text-xs text-zinc-500 capitalize">{matchup.status}</p>
      )}
    </div>
  );
}

export default function LeaguePlayoffs() {
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/league/playoffs', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load playoffs');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function startPlayoffs() {
    if (!window.confirm('Start IPL playoffs from current top-6 standings?')) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/league/init-playoffs', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to start playoffs');
      setMessage(json.message || 'Playoffs started.');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent-500" />
      </div>
    );
  }

  const { status, league, bracket } = data || {};
  const isAdmin = session?.user?.isAdmin;
  const byStage = bracket?.byStage || {};

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">
            Playoffs
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">IPL bracket</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Top 6 from the regular season → Q1, Eliminator, Q2, Final.
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

      {status && !status.hasPlayoffs && (
        <div className="surface-card p-4">
          <h2 className="text-sm font-semibold text-white">Regular season</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Completed matchups: {status.regularSeasonProgress?.completedMatchups ?? 0} /{' '}
            {status.regularSeasonProgress?.totalMatchups ?? 0}
          </p>
          {status.needsMoreTeams && (
            <p className="mt-2 text-sm text-amber-300">
              Need at least {status.minPlayoffTeams} teams for IPL playoffs (
              {status.teamCount} registered).
            </p>
          )}
          {isAdmin && status.canStartPlayoffs && (
            <button
              type="button"
              disabled={busy}
              onClick={startPlayoffs}
              className="btn-primary mt-4"
            >
              {busy ? 'Starting…' : 'Start playoffs'}
            </button>
          )}
          {isAdmin && !status.canStartPlayoffs && !status.needsMoreTeams && (
            <p className="mt-3 text-xs text-zinc-500">
              Finish all regular-season H2H rounds before starting playoffs.
            </p>
          )}
        </div>
      )}

      {bracket && (
        <>
          {bracket.champion && (
            <div className="surface-card mb-6 border border-accent-500/30 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-accent-400">Champion</p>
              <p className="mt-2 text-xl font-semibold text-white">{bracket.champion.teamName}</p>
            </div>
          )}

          <div className="surface-card mb-6 p-4">
            <h2 className="text-sm font-semibold text-white">Seeds (top 6)</h2>
            <ol className="mt-3 space-y-1 text-sm text-zinc-300">
              {bracket.seeds?.map((s) => (
                <li key={s.teamId}>
                  #{s.seed} {s.teamName}
                  <span className="text-zinc-500"> · {s.points} pts</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Qualifier 1 · #1 vs #2
              </h3>
              <MatchupCard matchup={byStage.qualifier1} />
              <p className="mt-2 text-xs text-zinc-500">Winner → Final · Loser → Q2</p>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Eliminator · #3 vs #4
              </h3>
              <MatchupCard matchup={byStage.eliminator} />
              <p className="mt-2 text-xs text-zinc-500">Winner → Q2 · Loser out</p>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Qualifier 2
              </h3>
              <MatchupCard matchup={byStage.qualifier2} />
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Final
              </h3>
              <MatchupCard matchup={byStage.final} highlight />
            </div>
          </div>

          {league?.status === 'completed' && (
            <p className="mt-6 text-center text-sm text-zinc-400">Season complete.</p>
          )}
        </>
      )}
    </div>
  );
}
