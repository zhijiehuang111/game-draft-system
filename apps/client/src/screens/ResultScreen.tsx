import { AngledPanel } from "../components/AngledPanel.js";
import { Button } from "../components/Button.js";
import { ChampionAvatar } from "../components/ChampionAvatar.js";
import { Ornament } from "../components/Ornament.js";
import { useAppStore } from "../stores/index.js";

export function ResultScreen() {
  const results = useAppStore((s) => s.draftResult);
  const clearRoom = useAppStore((s) => s.clearRoom);
  if (!results) return null;

  return (
    <div className="min-h-screen flex flex-col px-4 sm:px-6 lg:px-8 py-8">
      <header className="flex flex-col items-center gap-3 mb-6 lg:grid lg:grid-cols-3 lg:items-center lg:gap-0">
        <div className="self-start lg:self-auto lg:justify-self-start">
          <Button variant="ghost" size="sm" onClick={clearRoom}>
            ← Back to Lobby
          </Button>
        </div>
        <div className="lg:justify-self-center flex flex-col items-center gap-1">
          <Ornament width={280} />
          <div
            className="h-display text-[18px]"
            style={{ color: "#F0E6D2", letterSpacing: "0.36em" }}
          >
            DRAFT COMPLETE
          </div>
          <Ornament width={280} flip />
        </div>
        <div className="hidden lg:block" />
      </header>

      <main className="flex-1 flex items-center justify-center fade-up">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 w-full max-w-5xl">
          {results.map((r, i) => (
            <div
              key={r.userId}
              style={{ animation: `fade-up 0.5s ease-out ${i * 100}ms both` }}
            >
              <AngledPanel variant="gold" inner="#010A13">
                <div className="p-5 flex flex-col items-center gap-3">
                  <ChampionAvatar
                    championId={r.finalChampionId}
                    size={92}
                    showName
                    tone="gold"
                    glow
                  />
                  <div className="h-label numeric">{r.userId.slice(0, 8)}</div>
                </div>
              </AngledPanel>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
