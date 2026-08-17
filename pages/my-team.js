import Head from 'next/head';
import MyTeam from '../components/MyTeam';
import { pageTitle } from '../lib/branding';

export default function MyTeamPage() {
  return (
    <>
      <Head>
        <title>{pageTitle('My team')}</title>
      </Head>
      <MyTeam />
    </>
  );
}
