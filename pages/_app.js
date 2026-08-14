import '../styles/globals.css';
import '../components/fade-transition.css';
import 'aos/dist/aos.css';
import '../components/datepicker-overrides.css';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';
import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import AOS from 'aos';
import Navbar from '../components/Navbar';
import AuthGate from '../components/AuthGate';

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
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
        <Component {...pageProps} />
      </AuthGate>
      <SpeedInsights />
      <Analytics />
    </SessionProvider>
  );
}

export default MyApp;
