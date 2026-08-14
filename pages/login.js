import Head from 'next/head';
import Image from 'next/image';
import AuthForm from '../components/AuthForm';
import AOS from 'aos';
import 'aos/dist/aos.css';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/matches');
      }
    }
    checkSession();
  }, [router]);

  return (
    <>
      <Head>
        <title>Fantasy Cricket League</title>
        <meta name="description" content="Welcome to Your Organization's Fantasy Cricket League!" />
        <link rel="icon" href="/favicon.ico" />
        <style jsx global>{`
          @media (max-width: 768px) {
            .bg-image-position {
              object-position: 80% center !important;
            }
          }
        `}</style>
      </Head>
      <div className="relative">
        <div className="fixed inset-0 z-0">
          {/* Desktop Background */}
          <div className="hidden md:block w-full h-full">
            <Image
              src="/images/game-banner.png"
              alt="Cricket Background"
              layout="fill"
              objectFit="cover"
              objectPosition="right center"
              quality={100}
              priority
              className="bg-image-position"
            />
          </div>
          
          {/* Mobile/Tablet Background */}
          <div className="block md:hidden w-full h-full">
            <Image
              src="/images/game-banner.png"
              alt="Cricket Background Mobile"
              layout="fill"
              objectFit="cover"
              objectPosition="center"
              quality={100}
              priority
            />
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-b from-[#1E4620]/80 via-transparent to-[#1E4620]/80" />
        </div>

        <section className="relative z-10 min-h-screen h-auto">
          <div className="flex justify-center items-start md:items-center min-h-screen px-4 sm:px-6 lg:px-8 pt-[20vh] md:pt-0" data-aos="fade-up">
            <div className="w-full max-w-md bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 shadow-xl">
              <AuthForm />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
