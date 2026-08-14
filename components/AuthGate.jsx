import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const PUBLIC_PATHS = ['/login'];

export default function AuthGate({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(router.pathname);

  useEffect(() => {
    if (status === 'loading') return;

    if (!isPublic && status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (isPublic && status === 'authenticated') {
      router.replace('/matches');
    }
  }, [status, isPublic, router]);

  if (status === 'loading') {
    if (isPublic) {
      return children;
    }
    return (
      <div className="app-shell flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent-500" />
      </div>
    );
  }

  if (!isPublic && status === 'unauthenticated') {
    return null;
  }

  if (isPublic && status === 'authenticated') {
    return null;
  }

  return children;
}

export function useAuthSession() {
  return useSession();
}
