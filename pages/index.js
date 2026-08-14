import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const teamName = session?.user?.teamName;

  useEffect(() => {
    if (status !== 'authenticated') return;
    const timer = setTimeout(() => router.replace('/matches'), 1200);
    return () => clearTimeout(timer);
  }, [status, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="app-shell flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="surface-card px-8 py-10 text-center shadow-glow">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">Welcome back</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">{teamName || 'Manager'}</h1>
        <p className="mt-3 text-sm text-zinc-400">Opening your dashboard…</p>
        <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent-500" />
      </div>
    </div>
  );
}
