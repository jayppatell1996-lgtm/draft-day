import { useState } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import { validateEmail, validatePassword, validateTeamName } from '../lib/authValidation';

export default function AuthForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login');

  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = async () => {
    setAuthError('');
    const emailResult = validateEmail(email);
    if (!emailResult.ok) {
      setAuthError(emailResult.error);
      return;
    }
    if (!password) {
      setAuthError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: emailResult.value,
        password,
        redirect: false,
      });
      if (result?.error) {
        setAuthError('Invalid email or password');
        return;
      }
      router.push('/matches');
    } catch {
      setAuthError('Error logging in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setAuthError('');

    const teamResult = validateTeamName(teamName);
    if (!teamResult.ok) {
      setAuthError(teamResult.error);
      return;
    }

    const emailResult = validateEmail(email);
    if (!emailResult.ok) {
      setAuthError(emailResult.error);
      return;
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.ok) {
      setAuthError(passwordResult.error);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: teamResult.value,
          email: emailResult.value,
          password: passwordResult.value,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.message || 'Could not create account');
        return;
      }

      const login = await signIn('credentials', {
        email: emailResult.value,
        password: passwordResult.value,
        redirect: false,
      });
      if (login?.error) {
        setAuthError('Account created but login failed. Please sign in.');
        setMode('login');
        return;
      }
      router.push('/matches');
    } catch {
      setAuthError('Error signing up. Please try again.');
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

        <div className="w-full">
          <div key={mode} className="fade-transition">
            {mode === 'signup' ? (
              <div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Team Name*</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      maxLength={30}
                      required
                      placeholder="2–30 characters"
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
                      minLength={8}
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
              </div>
            ) : (
              <div>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
