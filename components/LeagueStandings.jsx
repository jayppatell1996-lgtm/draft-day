import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

function resultLabel(matchup) {
  if (!matchup.result) return 'Scheduled';
  switch (matchup.result) {
    case 'home_win':
      return `${matchup.home.name} won`;
    case 'away_win':
      return `${matchup.away.name} won`;
    case 'draw':
      return 'Draw';
    case 'no_result':
      return 'No result';
    default:
      return matchup.status;
  }
}

export default function LeagueStandings() {
  const { data: session } = useSession();
  const [standings, setStandings] = useState([]);
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [initMessage, setInitMessage] = useState('');
  const [initializing, setInitializing] = useState(false);
  const [playoffBusy, setPlayoffBusy] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/league/standings', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load standings');
        setStandings(data.standings || []);
        setLeague(data.league);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleStartPlayoffs() {
    if (!window.confirm('Start IPL playoffs from current top-6 standings?')) return;
    setPlayoffBusy(true);
    setInitMessage('');
    setError('');
    try {
      const res = await fetch('/api/league/init-playoffs', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start playoffs');
      setInitMessage(data.message || 'Playoffs started.');
      const refresh = await fetch('/api/league/standings', { cache: 'no-store' });
      const refreshed = await refresh.json();
      setStandings(refreshed.standings || []);
      setLeague(refreshed.league);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlayoffBusy(false);
    }
  }

  async function handleInitSchedule() {
    setInitializing(true);
    setInitMessage('');
    setError('');
    try {
      const res = await fetch('/api/league/init-schedule', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create schedule');
      setInitMessage(`Schedule created: ${data.rounds} rounds, ${data.matchups} matchups.`);
      const refresh = await fetch('/api/league/standings', { cache: 'no-store' });
      const refreshed = await refresh.json();
      setStandings(refreshed.standings || []);
      setLeague(refreshed.league);
    } catch (err) {
      setError(err.message);
    } finally {
      setInitializing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent-500" />
      </div>
    );
  }

  const myTeamId = session?.user?.teamId;
  const playoffStatus = league?.playoffStatus;
  const showPlayoffLine =
    league?.hasSchedule && standings.length >= 6 && !playoffStatus?.hasPlayoffs;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {league && (
        <div className="mb-6 surface-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-400">{league.seasonLabel}</p>
              <p className="text-lg font-semibold text-white">{league.name}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {league.teamCount} team{league.teamCount === 1 ? '' : 's'} registered
                {league.hasSchedule
                  ? ' · Schedule live'
                  : league.schedulePlan
                    ? ` · ${league.schedulePlan.rounds} rounds, ${league.schedulePlan.totalMatchups} matchups`
                    : ' · No schedule yet'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {league.hasSchedule && (
                <>
                  <Link href="/matchups" className="btn-primary">
                    View matchups
                  </Link>
                  {(playoffStatus?.hasPlayoffs || playoffStatus?.canStartPlayoffs) && (
                    <Link href="/playoffs" className="btn-ghost text-sm">
                      Playoffs
                    </Link>
                  )}
                </>
              )}
              {session?.user?.isAdmin && playoffStatus?.canStartPlayoffs && (
                <button
                  type="button"
                  onClick={handleStartPlayoffs}
                  disabled={playoffBusy}
                  className="btn-primary"
                >
                  {playoffBusy ? 'Starting…' : 'Start playoffs'}
                </button>
              )}
              {session?.user?.isAdmin && !league.hasSchedule && (
                <button
                  type="button"
                  onClick={handleInitSchedule}
                  disabled={initializing || !league.canGenerateSchedule}
                  className="btn-primary"
                >
                  {initializing ? 'Creating…' : 'Generate schedule'}
                </button>
              )}
              {session?.user?.isAdmin && (
                <Link href="/admin" className="btn-ghost text-sm">
                  Admin
                </Link>
              )}
            </div>
          </div>
          {initMessage && (
            <p className="mt-3 text-sm text-accent-400">{initMessage}</p>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!league?.hasSchedule ? (
        <div className="surface-card p-6 text-sm text-zinc-400">
          {league?.teamCount < league?.minTeams
            ? `Need at least ${league.minTeams} teams before the admin can generate the round-robin schedule.`
            : league?.teamCount > league?.maxTeamsSupported
              ? `Too many teams (${league.teamCount}). H2H supports ${league.minTeams}–${league.maxTeamsSupported} teams.`
              : league?.schedulePlan
                ? `Each team plays every other team once — ${league.schedulePlan.rounds} rounds, ${league.schedulePlan.matchupsPerRound} matchups per round (${league.schedulePlan.totalMatchups} total). An admin can generate fixtures from this page.`
                : 'Schedule not generated yet. An admin can create the round-robin fixtures from this page.'}
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-center">P</th>
                <th className="px-4 py-3 text-center">W</th>
                <th className="px-4 py-3 text-center">D</th>
                <th className="px-4 py-3 text-center">L</th>
                <th className="px-4 py-3 text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, index) => (
                <tr
                  key={row.teamId}
                  className={`border-b border-white/5 ${
                    row.teamId === myTeamId ? 'bg-accent-500/10' : ''
                  } ${showPlayoffLine && index === 5 ? 'border-b-2 border-accent-500/40' : ''}`}
                >
                  <td className="px-4 py-3 text-zinc-500">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-zinc-100">
                    {row.teamName}
                    {row.teamId === myTeamId && (
                      <span className="ml-2 text-xs text-accent-400">You</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-300">{row.played}</td>
                  <td className="px-4 py-3 text-center text-zinc-300">{row.wins}</td>
                  <td className="px-4 py-3 text-center text-zinc-300">{row.draws}</td>
                  <td className="px-4 py-3 text-center text-zinc-300">{row.losses}</td>
                  <td className="px-4 py-3 text-center font-semibold text-white">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-zinc-500">
            Points: Win 2 · Draw 1 · Loss 0. Fantasy points drive H2H results (Phase 8).
            {showPlayoffLine && (
              <span className="text-accent-400"> Top 6 qualify for IPL playoffs.</span>
            )}
            {playoffStatus?.hasPlayoffs && (
              <span className="text-accent-400">
                {' '}
                <Link href="/playoffs" className="underline hover:text-accent-300">
                  View bracket →
                </Link>
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export { resultLabel };
