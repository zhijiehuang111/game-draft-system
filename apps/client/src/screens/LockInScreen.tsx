import { Card } from '../components/Card.js';
import { ChampionAvatar } from '../components/ChampionAvatar.js';
import { Countdown } from '../components/Countdown.js';
import { useAppStore } from '../stores/index.js';

export function LockInScreen() {
  const room = useAppStore((s) => s.currentRoom);
  if (!room) return null;

  return (
    <div className="min-h-screen p-6 text-slate-100 flex flex-col items-center justify-center space-y-6">
      <h1 className="text-3xl font-semibold">Locking in…</h1>
      <div className="text-5xl font-mono">
        <Countdown phaseEndsAt={room.phaseEndsAt} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full max-w-5xl">
        {room.players.map((p) => (
          <Card key={p.userId} className="flex flex-col items-center">
            <div className="text-sm font-semibold mb-2">{p.username}</div>
            {p.currentChampion ? (
              <ChampionAvatar championId={p.currentChampion} size={72} />
            ) : (
              <div className="text-xs text-slate-500">—</div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
