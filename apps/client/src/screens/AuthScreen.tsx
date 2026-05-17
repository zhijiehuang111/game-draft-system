import { credentialsSchema } from '@app/shared';
import { useState } from 'react';
import { AuthApiError, login, register } from '../api/auth.js';
import { useAuthStore } from '../stores/auth.js';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

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
      if (err instanceof AuthApiError) {
        setFormError(err.error.message);
      } else {
        setFormError('Network error. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white p-8 rounded-lg shadow space-y-5"
        noValidate
      >
        <h1 className="text-2xl font-semibold text-slate-900">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h1>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            disabled={submitting}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
          />
          {fieldErrors.username && (
            <span className="block mt-1 text-xs text-red-600">{fieldErrors.username}</span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            disabled={submitting}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
          />
          {fieldErrors.password && (
            <span className="block mt-1 text-xs text-red-600">{fieldErrors.password}</span>
          )}
        </label>

        {formError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
        >
          {submitting ? '...' : mode === 'login' ? 'Sign in' : 'Register'}
        </button>

        <button
          type="button"
          onClick={toggleMode}
          disabled={submitting}
          className="w-full text-sm text-slate-600 hover:text-slate-900"
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
