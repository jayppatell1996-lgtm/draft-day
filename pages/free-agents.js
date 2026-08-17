import Head from 'next/head';
import FreeAgents from '../components/FreeAgents';
import { pageTitle } from '../lib/branding';

export default function FreeAgentsPage() {
  return (
    <>
      <Head>
        <title>{pageTitle('Free agents')}</title>
      </Head>
      <FreeAgents />
    </>
  );
}
