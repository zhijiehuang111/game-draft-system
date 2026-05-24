import type { PlayerState } from '@app/shared';
import { ChampionAvatar } from './ChampionAvatar.js';
import { CircleFrame } from './CircleFrame.js';

interface Props {
  players: PlayerState[];
  meUserId: string;
  disconnected: Record<string, number>;
  /** When set, draw a glow on this user's row (e.g. their turn). */
  highlightUserId?: string;
}

export function AllyRail({ players, meUserId, disconnected }: Props) {
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center gap-2 px-1">
        <span className="h-label">Allies</span>
        <span className="flex-1 h-px gold-divider-soft" />
        <span className="h-label text-gold/60 numeric">{players.length}</span>
      </div>

      {players.map((p, i) => {
        const isMe = p.userId === meUserId;
        const offline = p.userId in disconnected;
        const hasPick = !!p.currentChampion;
        const tone = offline ? 'dim' : isMe ? 'hex' : hasPick ? 'gold' : 'dim';

        return (
          <div
            key={p.userId}
            className="slide-in-left"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div
              className={`relative flex items-center gap-3 px-2 py-2 border-l-2 ${isMe ? 'bg-hex/5 border-hex' : hasPick ? 'border-gold' : 'border-bronze-dark'}`}
              style={{
                opacity: offline ? 0.45 : 1,
                filter: offline ? 'grayscale(0.8)' : undefined,
              }}
            >
              {/* portrait */}
              {hasPick ? (
                <ChampionAvatar
                  championId={p.currentChampion!}
                  size={52}
                  showName={false}
                  tone={tone}
                  glow={isMe}
                />
              ) : (
                <CircleFrame size={52} tone={tone}>
                  <div className="w-full h-full flex items-center justify-center bg-void-2">
                    <span
                      className="h-display text-stone/60"
                      style={{ fontSize: 18 }}
                    >
                      {p.slot}
                    </span>
                  </div>
                </CircleFrame>
              )}

              <div className="flex-1 min-w-0">
                <div
                  className={`font-label text-[13px] tracking-[0.08em] truncate ${isMe ? 'text-hex' : 'text-parchment'}`}
                >
                  {p.username}
                  {isMe && (
                    <span className="ml-1 text-[10px] text-hex/80 tracking-[0.2em]">
                      · YOU
                    </span>
                  )}
                </div>
                <div
                  className={`text-[11px] mt-0.5 truncate tracking-[0.06em] ${hasPick ? 'text-gold' : 'text-stone-dim'}`}
                >
                  {offline
                    ? 'Offline'
                    : hasPick
                      ? 'Selected'
                      : 'Picking…'}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
