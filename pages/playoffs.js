import Head from 'next/head';
import LeaguePlayoffs from '../components/LeaguePlayoffs';
import { pageTitle } from '../lib/branding';

export default function PlayoffsPage() {
  return (
    <>
      <Head>
        <title>{pageTitle('Playoffs')}</title>
      </Head>
      <LeaguePlayoffs />
    </>
  );
}
