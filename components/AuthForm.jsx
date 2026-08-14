import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function AuthForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Validate email format
  const validateEmail = (emailValue) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      setAuthError('Please enter a valid email address');
      return false;
    }
    setAuthError('');
    return true;
  };

  const handleLogin = async () => {
    setAuthError('');
    if (!email || !password) {
      setAuthError('Please enter both email and password');
      return;
    }
    if (!validateEmail(email)) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log('[AuthForm] Client-side login result:', data, error);
      if (error) throw error;
      // Optionally, you can log the login event via API route here
      router.push('/matches');
    } catch (error) {
      setAuthError(error.message || 'Error logging in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setAuthError('');
    if (!fullName || !email || !password) {
      alert('Please fill in all required fields');
      return;
    }
    if (!validateEmail(email)) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      console.log('[AuthForm] Client-side signup result:', data, error);
      if (error) throw error;
      // No need to call API to create user profile, trigger will handle it
      router.push('/matches');
    } catch (error) {
      setAuthError(error.message || 'Error signing up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // TODO: For OAuth, use Supabase client directly
  const handleOAuth = async (provider) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
      // The user will be redirected by Supabase
    } catch (error) {
      setAuthError(error.message || 'OAuth error');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="w-full max-w-md bg-navy-100/10 backdrop-blur-md p-8 rounded-xl shadow-2xl">
      {authError && (
        <div className="mb-4 p-3 bg-navy-500/20 border border-navy-500 rounded-lg">
          <p className="text-navy-200 text-sm">{authError}</p>
        </div>
      )}
      <div>
        {/* Form Type Selector */}
        <div className="flex justify-center space-x-8 mb-8">
          <button
            onClick={() => setMode('login')}
            className={`text-lg font-bold relative ${
              mode === 'login'
                ? 'text-navy-300 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-navy-600'
                : 'text-white/70 hover:text-white/90'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`text-lg font-bold relative ${
              mode === 'signup'
                ? 'text-navy-300 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-navy-600'
                : 'text-white/70 hover:text-white/90'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Smooth fade transition between Login and Sign Up forms */}
        <div className="w-full">
          <div key={mode} className="fade-transition">
            {mode === 'signup' ? (
              <div>
                {/* Sign Up Form */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Full Name*</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-navy-100/20 border border-navy-200/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-navy-200/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Email*</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-navy-100/20 border border-navy-200/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-navy-200/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Password*</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-navy-100/20 border border-navy-200/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-navy-200/50"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSignUp}
                  disabled={loading}
                  className="mt-8 w-full py-3 px-4 bg-navy-400 hover:bg-navy-400 text-white font-bold rounded-lg transform transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-600 disabled:opacity-50"
                >
                  {loading ? 'Signing Up...' : 'Sign Up'}
                </button>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-navy-100/20 border border-navy-200/30 rounded-lg text-white hover:bg-navy-100/30"
                    onClick={() => handleOAuth('google')}
                  >
                    <img src="/images/google.svg" alt="Google" className="w-5 h-5" />
                    Sign up with Google
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Login Form */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Email*</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-navy-100/20 border border-navy-200/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-navy-200/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Password*</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-navy-100/20 border border-navy-200/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-navy-200/50"
                    />
                  </div>
                </div>
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="mt-8 w-full py-3 px-4 bg-navy-400 hover:bg-navy-400 text-white font-bold rounded-lg transform transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-600 disabled:opacity-50"
                >
                  {loading ? 'Logging In...' : 'Login'}
                </button>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-navy-100/20 border border-navy-200/30 rounded-lg text-white hover:bg-navy-100/30"
                    onClick={() => handleOAuth('google')}
                  >
                    <img src="/images/google.svg" alt="Google" className="w-5 h-5" />
                    Log in with Google
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
