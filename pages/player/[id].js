import Head from 'next/head';
import PlayerProfile from '../../components/PlayerProfile';
import { pageTitle } from '../../lib/branding';

export default function PlayerPage() {
  return (
    <>
      <Head>
        <title>{pageTitle('Player')}</title>
      </Head>
      <PlayerProfile />
    </>
  );
}
