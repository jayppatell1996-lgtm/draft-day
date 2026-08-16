import Head from 'next/head';
import LeagueMatchups from '../components/LeagueMatchups';

export default function MatchupsPage() {
  return (
    <>
      <Head>
        <title>Matchups | Cric Fantasy League</title>
      </Head>
      <div className="app-shell min-h-[calc(100vh-3.5rem)]">
        <div className="border-b border-white/10 bg-surface-900/50">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">Head-to-head</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Round Matchups</h1>
            <p className="mt-2 text-sm text-zinc-400">See who plays who each round.</p>
          </div>
        </div>
        <LeagueMatchups />
      </div>
    </>
  );
}
