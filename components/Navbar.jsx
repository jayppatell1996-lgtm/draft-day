import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { APP_NAME } from '../lib/branding';

const NAV_ITEMS = [
  { href: '/squad', label: 'My Squad' },
  { href: '/trades', label: 'Trades' },
  { href: '/standings', label: 'Standings' },
  { href: '/playoffs', label: 'Playoffs' },
  { href: '/matchups', label: 'Matchups' },
  { href: '/matches', label: 'Matches' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/rules', label: 'Rules' },
];

const ADMIN_NAV = { href: '/admin', label: 'Admin' };

export default function Navbar() {
  const router = useRouter();
  const { data: session } = useSession();
  const teamName = session?.user?.teamName;
  const isAdmin = session?.user?.isAdmin;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const isLoginPage = router.pathname === '/login';

  useEffect(() => {
    const handleRouteChange = () => setIsMenuOpen(false);
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router]);

  const navLinkClass = (path) =>
    router.pathname === path ? 'nav-link-active' : 'nav-link';

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await signOut({ callbackUrl: '/login' });
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const res = await fetch('/api/delete-account', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete account');
      }
      await signOut({ callbackUrl: '/login' });
    } catch (error) {
      alert('Error deleting account: ' + (error.message || error));
    } finally {
      setDeletingAccount(false);
      setShowLogoutModal(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-surface-950/90 backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href={isLoginPage ? '/login' : '/matches'} className="flex items-center gap-3">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg ring-1 ring-white/10">
              <Image src="/images/logo.png" alt={APP_NAME} fill className="object-contain p-0.5" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold tracking-tight text-zinc-100">{APP_NAME}</p>
              <p className="text-[11px] text-zinc-500">Salary cap league</p>
            </div>
          </Link>

          {!isLoginPage && (
            <>
              <div className="hidden items-center gap-1 md:flex">
                {NAV_ITEMS.map(({ href, label }) => (
                  <Link key={href} href={href} className={navLinkClass(href)}>
                    {label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link href={ADMIN_NAV.href} className={navLinkClass(ADMIN_NAV.href)}>
                    {ADMIN_NAV.label}
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-3">
                {teamName && (
                  <div className="hidden items-center gap-2 md:flex">
                    <span className="max-w-[10rem] truncate text-sm text-zinc-300">{teamName}</span>
                    {isAdmin && (
                      <span className="rounded-full border border-accent-500/30 bg-accent-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-400">
                        Admin
                      </span>
                    )}
                  </div>
                )}
                <button type="button" onClick={() => setShowLogoutModal(true)} className="btn-ghost hidden md:inline-flex">
                  Account
                </button>
                <button
                  type="button"
                  className="btn-ghost md:hidden"
                  onClick={() => setIsMenuOpen((open) => !open)}
                  aria-label="Toggle menu"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </nav>

        {!isLoginPage && isMenuOpen && (
          <div className="border-t border-white/10 bg-surface-900 md:hidden">
            <div className="space-y-1 px-4 py-3">
              {teamName && (
                <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
                  <span className="truncate text-sm text-zinc-300">{teamName}</span>
                  {isAdmin && (
                    <span className="rounded-full border border-accent-500/30 bg-accent-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-400">
                      Admin
                    </span>
                  )}
                </div>
              )}
              {NAV_ITEMS.map(({ href, label }) => (
                <Link key={href} href={href} className={`block ${navLinkClass(href)}`}>
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link href={ADMIN_NAV.href} className={`block ${navLinkClass(ADMIN_NAV.href)}`}>
                  {ADMIN_NAV.label}
                </Link>
              )}
              <button type="button" onClick={() => setShowLogoutModal(true)} className="btn-ghost w-full justify-start">
                Account
              </button>
            </div>
          </div>
        )}
      </header>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="surface-card w-full max-w-sm p-6 shadow-glow">
            <h2 className="text-lg font-semibold text-zinc-100">Account</h2>
            <p className="mt-2 text-sm text-zinc-400">Log out or permanently delete your account.</p>
            <div className="mt-6 space-y-2">
              <button type="button" onClick={handleLogout} disabled={deletingAccount} className="btn-primary w-full">
                Log out
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                {deletingAccount ? 'Deleting…' : 'Delete account'}
              </button>
              <button type="button" onClick={() => setShowLogoutModal(false)} disabled={deletingAccount} className="btn-ghost w-full">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
