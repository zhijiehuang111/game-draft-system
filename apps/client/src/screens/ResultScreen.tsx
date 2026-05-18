import { Button } from '../components/Button.js';
import { Card } from '../components/Card.js';
import { ChampionAvatar } from '../components/ChampionAvatar.js';
import { useAppStore } from '../stores/index.js';

export function ResultScreen() {
  const results = useAppStore((s) => s.draftResult);
  const clearRoom = useAppStore((s) => s.clearRoom);
  if (!results) return null;

  return (
    <div className="min-h-screen p-6 text-slate-100 space-y-4">
      <header className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Draft result</h1>
        <Button variant="secondary" onClick={clearRoom}>
          Back to lobby
        </Button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {results.map((r) => (
          <Card key={r.userId} className="flex flex-col items-center">
            <ChampionAvatar championId={r.finalChampionId} size={80} />
            <div className="mt-2 text-xs text-slate-400">{r.userId.slice(0, 8)}</div>
          </Card>
        ))}
      </section>
    </div>
  );
}
