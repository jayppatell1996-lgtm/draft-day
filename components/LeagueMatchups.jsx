import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { resultLabel } from './LeagueStandings';

export default function LeagueMatchups() {
  const router = useRouter();
  const { data: session } = useSession();
  const [rounds, setRounds] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [league, setLeague] = useState(null);
  const [selectedRound, setSelectedRound] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opponentPreview, setOpponentPreview] = useState(null);
  const [opponentLoading, setOpponentLoading] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    const roundFromQuery = parseInt(String(router.query.round || '1'), 10);
    setSelectedRound(Number.isNaN(roundFromQuery) ? 1 : roundFromQuery);
  }, [router.isReady, router.query.round]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(
          `/api/league/rounds?round=${selectedRound}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load matchups');
        setRounds(data.rounds || []);
        setMatchups(data.matchups || []);
        setLeague(data.league);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (selectedRound >= 1) load();
  }, [selectedRound]);

  function handleRoundChange(e) {
    const round = parseInt(e.target.value, 10);
    setSelectedRound(round);
    router.push({ pathname: '/matchups', query: { round } }, undefined, { shallow: true });
  }

  async function loadOpponentSquad(matchupId) {
    setOpponentLoading(true);
    setOpponentPreview(null);
    try {
      const res = await fetch(`/api/league/opponent-squad?matchupId=${matchupId}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load opponent');
      setOpponentPreview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setOpponentLoading(false);
    }
  }

  const myTeamId = session?.user?.teamId;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!league?.hasSchedule ? (
        <div className="surface-card p-6 text-sm text-zinc-400">
          No H2H schedule yet.{' '}
          <Link href="/standings" className="text-accent-400 hover:text-accent-300">
            Go to standings
          </Link>{' '}
          to generate one (admin).
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <label htmlFor="round-select" className="text-xs uppercase tracking-wide text-zinc-500">
                Round
              </label>
              <select
                id="round-select"
                value={selectedRound}
                onChange={handleRoundChange}
                className="input-dark mt-1 w-auto min-w-[160px]"
              >
                {rounds.map((r) => (
                  <option key={r.id} value={r.roundNumber}>
                    {r.name || `Round ${r.roundNumber}`}
                  </option>
                ))}
              </select>
            </div>
            <Link href="/standings" className="btn-ghost text-sm">
              League standings →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matchups.map((m) => {
              const involvesMe = m.home.id === myTeamId || m.away.id === myTeamId;
              return (
                <div
                  key={m.id}
                  className={`surface-card p-4 ${
                    involvesMe ? 'ring-1 ring-accent-500/30' : ''
                  }`}
                >
                  <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">
                    {m.roundName}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 text-center">
                      <p
                        className={`truncate font-medium ${
                          m.home.id === myTeamId ? 'text-accent-300' : 'text-zinc-100'
                        }`}
                      >
                        {m.home.name}
                      </p>
                      {m.home.points != null && (
                        <p className="text-xs text-zinc-500">{m.home.points} pts</p>
                      )}
                    </div>
                    <span className="text-xs font-medium text-zinc-500">vs</span>
                    <div className="min-w-0 flex-1 text-center">
                      <p
                        className={`truncate font-medium ${
                          m.away.id === myTeamId ? 'text-accent-300' : 'text-zinc-100'
                        }`}
                      >
                        {m.away.name}
                      </p>
                      {m.away.points != null && (
                        <p className="text-xs text-zinc-500">{m.away.points} pts</p>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-center text-xs text-zinc-400">{resultLabel(m)}</p>
                  {involvesMe && (
                    <button
                      type="button"
                      onClick={() => loadOpponentSquad(m.id)}
                      className="btn-ghost mt-3 w-full text-xs"
                    >
                      {opponentLoading ? 'Loading…' : 'View opponent squad'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {opponentPreview && (
            <div className="surface-card mt-6 p-4">
              <h3 className="text-sm font-semibold text-white">
                {opponentPreview.opponent?.teamName}
              </h3>
              {opponentPreview.hidden ? (
                <p className="mt-2 text-sm text-zinc-400">{opponentPreview.message}</p>
              ) : (
                <ul className="mt-3 space-y-1 text-sm text-zinc-300">
                  {opponentPreview.opponent?.slots
                    ?.filter((s) => s.player)
                    .map((s) => (
                      <li key={`${s.slot_type}-${s.slot_index}`}>
                        {s.player.full_name} · {s.player.role} · {s.slot_type}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
