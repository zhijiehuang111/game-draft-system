import { credentialsSchema } from '@app/shared';
import { useState } from 'react';
import { login, register } from '../api/auth.js';
import { ApiRequestError } from '../api/http.js';
import { AngledPanel } from '../components/AngledPanel.js';
import { Button } from '../components/Button.js';
import { Ornament } from '../components/Ornament.js';
import { useAppStore } from '../stores/index.js';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const setUser = useAppStore((s) => s.setUser);

  function toggleMode() {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setFieldErrors({});
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = credentialsSchema.safeParse({ username, password });
    if (!parsed.success) {
      const next: typeof fieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'username' || key === 'password') {
          next[key] = issue.message;
        }
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const fn = mode === 'login' ? login : register;
      const { user } = await fn(parsed.data);
      setUser(user);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setFormError(err.error.message);
      } else {
        setFormError('Network error. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md flex flex-col items-center gap-5 fade-up">
        <div className="flex flex-col items-center gap-2">
          <Ornament width={280} />
          <div
            className="h-display"
            style={{
              color: '#F0E6D2',
              letterSpacing: '0.36em',
              fontSize: 20,
            }}
          >
            {mode === 'login' ? 'SIGN IN' : 'REGISTER'}
          </div>
          <Ornament width={280} flip />
        </div>

        <AngledPanel
          variant="bronze"
          className="w-full"
          inner="linear-gradient(180deg, rgba(10, 20, 40,0.92) 0%, rgba(1, 10, 19,0.96) 100%)"
        >
          <form
            onSubmit={handleSubmit}
            className="px-6 py-7 flex flex-col gap-5"
            noValidate
          >
            <label className="block">
              <span className="h-label block mb-2">Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={submitting}
                className="lol-input w-full"
              />
              {fieldErrors.username && (
                <span className="block mt-1 text-[11px] text-crimson tracking-[0.1em]">
                  {fieldErrors.username}
                </span>
              )}
            </label>

            <label className="block">
              <span className="h-label block mb-2">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                disabled={submitting}
                className="lol-input w-full"
              />
              {fieldErrors.password && (
                <span className="block mt-1 text-[11px] text-crimson tracking-[0.1em]">
                  {fieldErrors.password}
                </span>
              )}
            </label>

            {formError && (
              <div
                className="text-[12px] text-crimson tracking-[0.06em] px-3 py-2"
                style={{
                  background: 'rgba(200, 64, 75,0.08)',
                  borderLeft: '2px solid #C8404B',
                }}
              >
                {formError}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" disabled={submitting}>
              {submitting ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>

            <button
              type="button"
              onClick={toggleMode}
              disabled={submitting}
              className="h-label text-stone hover:text-gold-light transition-colors"
            >
              {mode === 'login' ? 'No account? Register' : 'Have an account? Sign in'}
            </button>
          </form>
        </AngledPanel>
      </div>
    </div>
  );
}
