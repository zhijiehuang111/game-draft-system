import { Card } from '../components/Card.js';
import { ChampionAvatar } from '../components/ChampionAvatar.js';
import { Countdown } from '../components/Countdown.js';
import { useAppStore } from '../stores/index.js';

export function BenchTradeScreen() {
  const room = useAppStore((s) => s.currentRoom);
  const user = useAppStore((s) => s.user);
  const socket = useAppStore((s) => s.socket);
  if (!room || !user) return null;

  function pickBench(championId: string) {
    if (!socket) return;
    socket.emit('pick:bench', { championId });
  }

  return (
    <div className="min-h-screen p-6 text-slate-100 space-y-6">
      <header className="flex justify-between items-baseline">
        <div>
          <h1 className="text-xl font-semibold">Bench & Trade</h1>
          <p className="text-xs text-slate-400">
            Swap with the bench, or trade with another player
          </p>
        </div>
        <div className="text-2xl font-mono">
          <Countdown phaseEndsAt={room.phaseEndsAt} />
        </div>
      </header>

      <section>
        <h2 className="text-sm font-semibold text-slate-300 mb-2">Players</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {room.players.map((p) => {
            const isMe = p.userId === user.id;
            return (
              <Card
                key={p.userId}
                className={isMe ? 'border-blue-500' : undefined}
              >
                <div className="text-sm font-semibold">
                  {p.username} {isMe && <span className="text-blue-400">(you)</span>}
                </div>
                <div className="text-xs text-slate-500 mb-2">slot {p.slot}</div>
                {p.currentChampion ? (
                  <ChampionAvatar championId={p.currentChampion} size={64} />
                ) : (
                  <div className="text-xs text-slate-500">no champion</div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-300 mb-2">
          Bench ({room.bench.length})
        </h2>
        {room.bench.length === 0 ? (
          <div className="text-xs text-slate-500">bench is empty</div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {room.bench.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => pickBench(id)}
                className="p-2 rounded border border-slate-700 hover:border-blue-500 transition-colors"
              >
                <ChampionAvatar championId={id} size={64} />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
