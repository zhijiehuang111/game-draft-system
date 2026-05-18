import { logout as logoutApi } from '../api/auth.js';
import { Button } from '../components/Button.js';
import { Card } from '../components/Card.js';
import { disconnectSocket } from '../socket/setup.js';
import { useAppStore } from '../stores/index.js';

export function LobbyScreen() {
  const user = useAppStore((s) => s.user);
  const queueSize = useAppStore((s) => s.queueSize);
  const inQueue = useAppStore((s) => s.inQueue);
  const socket = useAppStore((s) => s.socket);
  const socketConnected = useAppStore((s) => s.socketConnected);
  const setQueue = useAppStore((s) => s.setQueue);
  const logout = useAppStore((s) => s.logout);

  function handleJoin() {
    if (!socket) return;
    socket.emit('queue:join');
    setQueue({ size: queueSize, inQueue: true });
  }

  function handleLeave() {
    if (!socket) return;
    socket.emit('queue:leave');
    setQueue({ size: queueSize, inQueue: false });
  }

  async function handleLogout() {
    await logoutApi().catch(() => undefined);
    disconnectSocket();
    logout();
  }

  return (
    <div className="min-h-screen p-6 text-slate-100">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold">Lobby</h1>
          <p className="text-xs text-slate-400">
            {user?.username} · socket {socketConnected ? 'connected' : 'disconnected'}
          </p>
        </div>
        <Button variant="secondary" onClick={handleLogout}>
          Logout
        </Button>
      </header>

      <Card className="max-w-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400">Queue</div>
            <div className="text-2xl font-semibold">{queueSize} / 5</div>
          </div>
          {inQueue ? (
            <Button variant="danger" onClick={handleLeave}>
              Leave queue
            </Button>
          ) : (
            <Button onClick={handleJoin} disabled={!socketConnected}>
              Join queue
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
