import '../styles/globals.css';
import '../components/fade-transition.css';
import 'aos/dist/aos.css';
import '../components/datepicker-overrides.css';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';
import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AOS from 'aos';
import Navbar from '../components/Navbar';
import MobileBottomNav from '../components/MobileBottomNav';
import AuthGate from '../components/AuthGate';

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter();
  const isLoginPage = router.pathname === '/login';

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: false,
      mirror: true,
      easing: 'ease-out-cubic',
    });
  }, []);

  return (
    <SessionProvider session={session}>
      <Navbar />
      <AuthGate>
        <div className={`page-main${isLoginPage ? '' : ' mobile-safe-bottom'}`}>
          <Component {...pageProps} />
        </div>
      </AuthGate>
      <MobileBottomNav />
      <SpeedInsights />
      <Analytics />
    </SessionProvider>
  );
}

export default MyApp;
