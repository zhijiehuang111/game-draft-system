import { AngledPanel } from '../components/AngledPanel.js';
import { CircleFrame } from '../components/CircleFrame.js';
import { CornerFrame, Ornament } from '../components/Ornament.js';
import { PhaseHeader } from '../components/PhaseHeader.js';
import { useAppStore } from '../stores/index.js';

export function LockInScreen() {
  const room = useAppStore((s) => s.currentRoom);
  const user = useAppStore((s) => s.user);
  const champions = useAppStore((s) => s.champions);
  if (!room) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-8 pt-6 pb-3">
        <PhaseHeader
          title="Lock In"
          phaseEndsAt={room.phaseEndsAt}
          tone="gold"
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-12 gap-8 fade-up">
        <Ornament width={420} />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 w-full max-w-5xl">
          {room.players.map((p, i) => {
            const isMe = p.userId === user?.id;
            const champ = p.currentChampion ? champions[p.currentChampion] : null;
            return (
              <div
                key={p.userId}
                style={{ animation: `fade-up 0.5s ease-out ${i * 120}ms both` }}
              >
                <AngledPanel
                  variant={isMe ? 'hex' : 'gold'}
                  borderWidth={isMe ? 2 : 1}
                  inner="#010A13"
                  className={isMe ? 'glow-hex' : ''}
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    {champ?.imageUrl ? (
                      <img
                        src={champ.imageUrl}
                        alt={champ.name}
                        className="absolute inset-0 w-full h-full object-cover scale-110"
                        draggable={false}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-void-2 flex items-center justify-center">
                        <CircleFrame size={60} tone="dim">
                          <div className="w-full h-full" />
                        </CircleFrame>
                      </div>
                    )}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.9) 100%)',
                      }}
                    />
                    <CornerFrame size={14} inset={8} color={isMe ? '#0AC8B9' : '#C8AA6E'} />

                    <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-6">
                      <div
                        className="text-center h-display text-[12px] mb-1"
                        style={{
                          color: isMe ? '#0AC8B9' : '#C8AA6E',
                          letterSpacing: '0.32em',
                        }}
                      >
                        {p.username}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex-1 h-px gold-divider" />
                        <svg width="5" height="5" viewBox="0 0 6 6">
                          <path d="M3 0 L6 3 L3 6 L0 3 Z" fill={isMe ? '#0AC8B9' : '#C8AA6E'} />
                        </svg>
                        <span className="flex-1 h-px gold-divider" />
                      </div>
                      <div
                        className="text-center h-display text-[15px] mt-1"
                        style={{
                          color: '#F0E6D2',
                          letterSpacing: '0.2em',
                        }}
                      >
                        {champ?.name ?? '—'}
                      </div>
                    </div>
                  </div>
                </AngledPanel>
              </div>
            );
          })}
        </div>

        <Ornament width={420} flip />

        <div className="text-stone/80 text-[12px] tracking-[0.34em]">
          · Match starting ·
        </div>
      </main>
    </div>
  );
}
