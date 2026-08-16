import Head from 'next/head';
import TradeHistory from '../components/TradeHistory';

export default function TradesPage() {
  return (
    <>
      <Head>
        <title>Trade history — Cric Fantasy League</title>
      </Head>
      <TradeHistory />
    </>
  );
}
