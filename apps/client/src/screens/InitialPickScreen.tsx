import { Card } from '../components/Card.js';
import { ChampionAvatar } from '../components/ChampionAvatar.js';
import { Countdown } from '../components/Countdown.js';
import { useAppStore } from '../stores/index.js';

export function InitialPickScreen() {
  const room = useAppStore((s) => s.currentRoom);
  const user = useAppStore((s) => s.user);
  const socket = useAppStore((s) => s.socket);
  if (!room || !user) return null;

  const me = room.players.find((p) => p.userId === user.id);

  function pick(championId: string) {
    if (!socket || !me || me.currentChampion !== null) return;
    socket.emit('pick:initial', { championId });
  }

  return (
    <div className="min-h-screen p-6 text-slate-100 space-y-6">
      <header className="flex justify-between items-baseline">
        <div>
          <h1 className="text-xl font-semibold">Initial Pick</h1>
          <p className="text-xs text-slate-400">Pick one from your allocated champions</p>
        </div>
        <div className="text-2xl font-mono">
          <Countdown phaseEndsAt={room.phaseEndsAt} />
        </div>
      </header>

      <section>
        <h2 className="text-sm font-semibold text-slate-300 mb-2">Your champions</h2>
        <div className="flex flex-wrap gap-3">
          {me?.allocated.map((id) => {
            const picked = me.currentChampion === id;
            const disabled = me.currentChampion !== null && !picked;
            return (
              <button
                key={id}
                type="button"
                onClick={() => pick(id)}
                disabled={disabled || picked}
                className={`p-2 rounded border transition-colors ${
                  picked
                    ? 'border-blue-500 bg-blue-900/30'
                    : disabled
                      ? 'border-slate-700 opacity-40 cursor-not-allowed'
                      : 'border-slate-700 hover:border-blue-500'
                }`}
              >
                <ChampionAvatar championId={id} size={72} />
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-300 mb-2">Players</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {room.players.map((p) => {
            const offline = p.userId in room.disconnected;
            return (
              <Card key={p.userId} className={offline ? 'opacity-50 grayscale' : undefined}>
                <div className="text-sm font-semibold">
                  {p.username} <span className="text-slate-500">· slot {p.slot}</span>
                  {offline && <span className="ml-2 text-xs text-red-400">offline</span>}
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  {p.currentChampion ? 'picked' : 'choosing…'}
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
