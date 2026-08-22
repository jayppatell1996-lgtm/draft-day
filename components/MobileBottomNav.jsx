import Link from 'next/link';
import { useRouter } from 'next/router';

const MOBILE_NAV = [
  { href: '/my-team', label: 'My Team' },
  { href: '/squad', label: 'Squad' },
  { href: '/free-agents', label: 'Agents' },
  { href: '/standings', label: 'Table' },
  { href: '/matchups', label: 'H2H' },
];

export default function MobileBottomNav() {
  const router = useRouter();
  const isLoginPage = router.pathname === '/login';

  if (isLoginPage) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-surface-950/95 backdrop-blur-md md:hidden mobile-bottom-nav"
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {MOBILE_NAV.map(({ href, label }) => {
          const active = router.pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[3rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-center transition-colors ${
                active
                  ? 'text-accent-400'
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              <span className="text-[11px] font-medium leading-tight">{label}</span>
              {active && <span className="h-0.5 w-5 rounded-full bg-accent-500" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
