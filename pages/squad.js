import SquadBuilder from '../components/SquadBuilder';
import Head from 'next/head';
import { pageTitle } from '../lib/branding';

export default function SquadPage() {
  return (
    <>
      <Head>
        <title>{pageTitle('My Squad')}</title>
      </Head>
      <div className="app-shell min-h-[calc(100vh-3.5rem)]">
        <div className="border-b border-white/10 bg-surface-900/50">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">Squad builder</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Edit squad</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Build your 16-player squad within the salary cap. View{' '}
              <a href="/my-team" className="text-accent-400 hover:underline">My team</a>
              {' '}or browse the{' '}
              <a href="/free-agents" className="text-accent-400 hover:underline">free agent pool</a>.
            </p>
          </div>
        </div>
        <SquadBuilder />
      </div>
    </>
  );
}
