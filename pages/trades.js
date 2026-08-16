import Head from 'next/head';
import TradeHistory from '../components/TradeHistory';
import { pageTitle } from '../lib/branding';

export default function TradesPage() {
  return (
    <>
      <Head>
        <title>{pageTitle('Trade history')}</title>
      </Head>
      <TradeHistory />
    </>
  );
}
