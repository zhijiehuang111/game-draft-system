import { Card } from '../components/Card.js';
import { ChampionAvatar } from '../components/ChampionAvatar.js';
import { useAppStore } from '../stores/index.js';

export function RoomScreen() {
  const room = useAppStore((s) => s.currentRoom);
  if (!room) return null;

  return (
    <div className="min-h-screen p-6 text-slate-100 space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Room {room.roomId.slice(0, 8)}</h1>
        <p className="text-xs text-slate-400">
          phase: {room.phase} · ends at {new Date(room.phaseEndsAt).toLocaleTimeString()}
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {room.players.map((p) => (
          <Card key={p.userId}>
            <div className="text-sm font-semibold mb-2">
              {p.username} (slot {p.slot})
            </div>
            <div className="flex flex-wrap gap-2">
              {p.allocated.map((id) => (
                <ChampionAvatar key={id} championId={id} size={48} showName={false} />
              ))}
            </div>
            {p.currentChampion && (
              <div className="mt-2 text-xs text-slate-400">
                current: {p.currentChampion}
              </div>
            )}
          </Card>
        ))}
      </section>

      {room.bench.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-2">Bench</h2>
          <div className="flex flex-wrap gap-2">
            {room.bench.map((id) => (
              <ChampionAvatar key={id} championId={id} size={48} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
