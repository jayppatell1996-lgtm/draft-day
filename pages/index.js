import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const teamName = session?.user?.teamName;

  useEffect(() => {
    if (status !== 'authenticated') return;
    const timer = setTimeout(() => router.replace('/matches'), 2000);
    return () => clearTimeout(timer);
  }, [status, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-900 via-green-700 to-green-900">
      <div className="bg-white/10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl flex flex-col items-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Welcome back{teamName ? `, ${teamName}` : ''}!
        </h1>
        <div className="flex flex-col items-center">
          <svg
            className="animate-spin h-8 w-8 text-green-200 mb-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-lg text-green-100">Redirecting to your matches...</p>
        </div>
      </div>
    </div>
  );
}
