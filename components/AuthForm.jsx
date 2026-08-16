import { useState } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import { APP_NAME } from '../lib/branding';
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

  const tabClass = (active) =>
    active
      ? 'border-b-2 border-accent-500 text-white'
      : 'border-b-2 border-transparent text-zinc-500 hover:text-zinc-300';

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">{APP_NAME}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          {mode === 'login' ? 'Sign in' : 'Create your team'}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {mode === 'login'
            ? 'Access your squad, transfers, and league standings.'
            : 'First manager becomes league admin automatically.'}
        </p>
      </div>

      {authError && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {authError}
        </div>
      )}

      <div className="mb-6 flex gap-6 border-b border-white/10">
        <button type="button" onClick={() => setMode('login')} className={`pb-3 text-sm font-medium ${tabClass(mode === 'login')}`}>
          Login
        </button>
        <button type="button" onClick={() => setMode('signup')} className={`pb-3 text-sm font-medium ${tabClass(mode === 'signup')}`}>
          Sign up
        </button>
      </div>

      <div key={mode} className="fade-transition space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">Team name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={30}
              placeholder="2–30 characters"
              className="input-dark"
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-dark" />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            placeholder={mode === 'signup' ? 'Minimum 8 characters' : undefined}
            className="input-dark"
          />
        </div>

        <button
          type="button"
          onClick={mode === 'login' ? handleLogin : handleSignUp}
          disabled={loading}
          className="btn-primary mt-2 w-full"
        >
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </div>
    </div>
  );
}
