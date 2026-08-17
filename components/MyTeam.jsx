import { useEffect, useState } from 'react';
import Link from 'next/link';
import { OverseasBadge } from './PlayerPoolBadges';

export default function MyTeam() {
  const [squadData, setSquadData] = useState(null);
  const [points, setPoints] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [squadRes, pointsRes] = await Promise.all([
          fetch('/api/my-squad', { cache: 'no-store' }),
          fetch('/api/player-stats?squad=1', { cache: 'no-store' }),
        ]);
        const squadJson = await squadRes.json();
        const pointsJson = await pointsRes.json();
        if (!squadRes.ok) throw new Error(squadJson.error || 'Failed to load squad');
        if (!pointsRes.ok) throw new Error(pointsJson.error || 'Failed to load points');
        setSquadData(squadJson);
        setPoints(pointsJson);
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

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      </div>
    );
  }

  const { squad, slots, filledCount, requiredCount, transferWindow } = squadData;
  const pointsByPlayer = new Map(
    (points?.players || []).map((p) => [p.playerId, p.seasonPoints])
  );

  const playing = slots.filter((s) => s.is_playing);
  const bench = slots.filter((s) => !s.is_playing);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">Team</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">My team</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Your lineup, captain picks, and season fantasy points (base scoring — C/VC multipliers apply in H2H).
          </p>
        </div>
        <Link href="/squad" className="btn-primary text-sm">
          Edit squad →
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Squad</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {filledCount} / {requiredCount}
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Season points</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {(points?.totalPoints ?? 0).toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Sum of player base points</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Budget left</p>
          <p className="mt-1 text-2xl font-semibold text-accent-400">
            {squad.budgetRemaining.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">of {squad.salaryCap} cr</p>
        </div>
      </div>

      {transferWindow && (
        <div className="surface-card mb-6 p-4 text-sm text-zinc-300">
          <span className="text-zinc-500">Transfers · </span>
          {transferWindow.mode === 'initial_build'
            ? 'Initial build'
            : transferWindow.windowOpen
              ? `${transferWindow.freeTradesAvailable ?? 0} free available`
              : 'Window closed'}
        </div>
      )}

      <section className="surface-card mb-6 p-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Playing XI
        </h2>
        <div className="space-y-2">
          {playing.map((slot) => (
            <PlayerRow
              key={slot.id}
              slot={slot}
              squad={squad}
              seasonPoints={slot.player_id ? pointsByPlayer.get(slot.player_id) ?? 0 : 0}
            />
          ))}
        </div>
      </section>

      <section className="surface-card p-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">Bench</h2>
        <div className="space-y-2">
          {bench.map((slot) => (
            <PlayerRow
              key={slot.id}
              slot={slot}
              squad={squad}
              seasonPoints={slot.player_id ? pointsByPlayer.get(slot.player_id) ?? 0 : 0}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function PlayerRow({ slot, squad, seasonPoints }) {
  const isCaptain = squad.captainPlayerId === slot.player_id;
  const isVice = squad.viceCaptainPlayerId === slot.player_id;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-surface-950/50 px-3 py-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-surface-900 text-[10px] font-semibold text-zinc-500">
        {slot.slot_type}
      </div>
      {slot.player ? (
        <>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/player/${slot.player_id}`}
                className="truncate font-medium text-zinc-100 hover:text-accent-300"
              >
                {slot.player.full_name}
              </Link>
              <OverseasBadge isOverseas={slot.player.is_overseas} />
              {isCaptain && (
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                  C
                </span>
              )}
              {isVice && (
                <span className="rounded bg-zinc-600/40 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
                  VC
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              {slot.player.role} · {slot.player.franchise_name || '—'} · {slot.player.price} cr
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{seasonPoints.toFixed(1)}</p>
            <p className="text-[10px] text-zinc-500">pts</p>
          </div>
        </>
      ) : (
        <p className="text-sm text-zinc-500">Empty · {slot.slot_type}</p>
      )}
    </div>
  );
}
