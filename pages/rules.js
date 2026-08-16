import Head from 'next/head';
import { pageTitle } from '../lib/branding';

export default function Rules() {
  return (
    <>
      <Head>
        <title>{pageTitle('Rules')}</title>
        <meta name="description" content="Rules and scoring system" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="app-shell min-h-[calc(100vh-3.5rem)]">
        <div className="border-b border-white/10 bg-surface-900/50">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">League guide</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Rules & scoring</h1>
          </div>
        </div>

        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="surface-card p-8">
            <section className="mb-10">
              <h2 className="text-lg font-semibold text-white">Getting started</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
                <li>Select players before each match starts.</li>
                <li>Selections lock when the match begins.</li>
                <li>Pick 4 players from each team (8 total).</li>
                <li>Submit your lineup before lock — changes after that do not count.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Current scoring (upstream)</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
                <li>Batting: 30 pts for 30 runs, 60 for 50, 150 for 100. 5 pts per six.</li>
                <li>Bowling: 30 pts per wicket.</li>
                <li>Full CPL rules will replace this in a later phase.</li>
              </ul>
            </section>
          </div>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Salary-cap squad rules, transfers, and H2H format are coming in upcoming releases.
          </p>
        </main>
      </div>
    </>
  );
}
