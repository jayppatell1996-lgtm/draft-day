import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient'; // Make sure to import supabase instance

export default function Home() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [welcomeProfile, setWelcomeProfile] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showPersonalizedWelcome, setShowPersonalizedWelcome] = useState(false);
  const [hasRenderedPersonalizedWelcome, setHasRenderedPersonalizedWelcome] = useState(false);

  useEffect(() => {
    // Check if a session exists and show welcome if it does
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Home] Session fetched:', session);
      if (session) {
        setShowWelcome(true); // Show welcome UI immediately
        setLoadingProfile(true);
        // Fetch user and profile directly from Supabase
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.log('[Home] No user found:', userError);
          router.replace('/matches');
          return;
        }
        // Now fetch the profile from users table
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single();
        setLoadingProfile(false);
        console.log('[Home] Profile fetched:', profile, 'Profile error:', profileError);
        if (profile && profile.full_name) {
          setWelcomeProfile(profile);
          setShowPersonalizedWelcome(true);
          console.log('[Home] Personalized welcome set:', profile.full_name);
          // Do not redirect here; let a separate effect handle it
        } else {
          router.replace('/matches');
        }
        return;
      }
      setCheckingSession(false);
    }
    checkSession();
  }, [router]);

  // When the personalized welcome is shown, set hasRenderedPersonalizedWelcome to true (after DOM update)
  useEffect(() => {
    if (showPersonalizedWelcome) {
      // Wait for the DOM to actually render the personalized message
      requestAnimationFrame(() => {
        setHasRenderedPersonalizedWelcome(true);
        console.log('[Home] DOM rendered personalized welcome');
      });
    } else {
      setHasRenderedPersonalizedWelcome(false);
    }
  }, [showPersonalizedWelcome]);

  // Only start redirect timer after the personalized message is rendered
  useEffect(() => {
    if (hasRenderedPersonalizedWelcome) {
      console.log('[Home] Starting 2s redirect timer after personalized welcome is rendered');
      const timer = setTimeout(() => {
        console.log('[Home] Redirecting to /matches');
        router.replace('/matches');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasRenderedPersonalizedWelcome, router]);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!checkingSession && !showWelcome) {
      router.replace('/login');
    }
  }, [checkingSession, showWelcome, router]);

  // All other hooks are already above

  // If still checking session, render nothing
  if (checkingSession) return null;

  // Render welcome message if showWelcome is true
  if (showWelcome) {
    console.log('[Home] Render:', {
      showWelcome,
      showPersonalizedWelcome,
      hasRenderedPersonalizedWelcome,
      loadingProfile,
      welcomeProfile,
    });
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-900 via-green-700 to-green-900">
        <div className="bg-white/10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl flex flex-col items-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {showPersonalizedWelcome && welcomeProfile ? (
              <>Welcome back {welcomeProfile.full_name}!</>
            ) : (
              <>Welcome back!</>
            )}
          </h1>
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-green-200 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <p className="text-lg text-green-100">
              {showPersonalizedWelcome ? 'Redirecting to your matches...' : 'Loading your profile...'}
            </p>
          </div>
        </div>
      </div>
    );
  }
}