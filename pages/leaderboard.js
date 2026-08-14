import Leaderboard from '../components/Leaderboard';

export default function LeaderboardPage() {
  return (
    <div className="app-shell min-h-[calc(100vh-3.5rem)]">
      <div className="border-b border-white/10 bg-surface-900/50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">Standings</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Leaderboard</h1>
        </div>
      </div>
      <Leaderboard />
    </div>
  );
}
