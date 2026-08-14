import Head from 'next/head';
import AuthForm from '../components/AuthForm';

export default function Login() {
  return (
    <>
      <Head>
        <title>Cric Fantasy League — Sign in</title>
        <meta name="description" content="Sign in to your fantasy cricket league" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="app-shell flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-accent-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-blue-500/5 blur-3xl" />
        </div>

        <div className="surface-card w-full max-w-md p-8 shadow-glow">
          <AuthForm />
        </div>
      </div>
    </>
  );
}
