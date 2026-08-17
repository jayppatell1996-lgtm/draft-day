import Head from 'next/head';
import AdminPanel from '../components/AdminPanel';
import { pageTitle } from '../lib/branding';

export default function AdminPage() {
  return (
    <>
      <Head>
        <title>{pageTitle('Admin')}</title>
      </Head>
      <AdminPanel />
    </>
  );
}
