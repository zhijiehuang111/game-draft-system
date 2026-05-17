import { useEffect } from 'react';
import { AuthApiError, getMe, logout } from './api/auth.js';
import { AuthScreen } from './screens/AuthScreen.js';
import { useAuthStore } from './stores/auth.js';

function App() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then(({ user }) => {
        if (!cancelled) setUser(user);
      })
      .catch((err) => {
        if (cancelled) return;
        setUser(null);
        if (!(err instanceof AuthApiError && err.status === 401)) {
          console.error('getMe failed', err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Welcome, {user.username}</h1>
        <button
          type="button"
          onClick={async () => {
            await logout().catch(() => undefined);
            setUser(null);
          }}
          className="px-3 py-1.5 text-sm bg-slate-200 hover:bg-slate-300 rounded"
        >
          Logout
        </button>
      </header>
      <p className="text-slate-600">Lobby / Room screens coming next.</p>
    </div>
  );
}

export default App;
