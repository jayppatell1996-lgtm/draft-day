import '../styles/globals.css';
import '../components/fade-transition.css';
import 'aos/dist/aos.css';
import '../components/datepicker-overrides.css';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"
import { useEffect } from 'react';
import AOS from 'aos';
import Navbar from '../components/Navbar';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: false,
      mirror: true,
      easing: 'ease-out-cubic'
    });
  }, []);

  return (
    <>
      <Navbar />
      <Component {...pageProps} />
      <SpeedInsights />
      <Analytics />
    </>
  )
}

export default MyApp