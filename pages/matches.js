import Matches from '../components/Matches';

export default function MatchesPage() {
  return (
    <div className="app-shell min-h-[calc(100vh-3.5rem)]">
      <div className="border-b border-white/10 bg-surface-900/50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">Fixtures</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Matches</h1>
          <p className="mt-2 text-sm text-zinc-400">Pick players for today&apos;s games before lock.</p>
        </div>
      </div>
      <Matches />
    </div>
  );
}
