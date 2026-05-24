import type { PlayerState, TradeRequest } from '@app/shared';
import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/index.js';
import { AngledPanel } from './AngledPanel.js';
import { ChampionAvatar } from './ChampionAvatar.js';
import { CircleFrame } from './CircleFrame.js';

interface TradeUi {
  /** True when I can initiate a new trade (bench-trade phase, I have a champion, no pending of mine). */
  canStart: boolean;
  /** UserIds currently involved in any pending trade — used to disable targets. */
  lockedUserIds: Set<string>;
  outgoing: TradeRequest | null;
  incoming: TradeRequest | null;
  onRequest(targetUserId: string): void;
  onRespond(tradeId: string, accept: boolean): void;
  onCancel(tradeId: string): void;
}

interface Props {
  players: PlayerState[];
  meUserId: string;
  disconnected: Record<string, number>;
  /** When provided, render trade icons + pending bubbles. */
  trade?: TradeUi;
}

export function AllyRail({ players, meUserId, disconnected, trade }: Props) {
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

        const outgoingForRow =
          trade?.outgoing && trade.outgoing.toUserId === p.userId ? trade.outgoing : null;
        const incomingForRow =
          trade?.incoming && trade.incoming.fromUserId === p.userId ? trade.incoming : null;

        const showTradeButton =
          !!trade &&
          !isMe &&
          !offline &&
          hasPick &&
          !outgoingForRow &&
          !incomingForRow;

        const canPressTrade =
          !!trade &&
          trade.canStart &&
          !trade.lockedUserIds.has(p.userId);

        return (
          <div
            key={p.userId}
            className="slide-in-left relative"
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
              <div className="relative">
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

                {showTradeButton && (
                  <TradeIconButton
                    disabled={!canPressTrade}
                    onClick={() => trade!.onRequest(p.userId)}
                  />
                )}
              </div>

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

            {outgoingForRow && trade && (
              <TradeBubble
                kind="outgoing"
                trade={outgoingForRow}
                onCancel={() => trade.onCancel(outgoingForRow.tradeId)}
              />
            )}
            {incomingForRow && trade && (
              <TradeBubble
                kind="incoming"
                trade={incomingForRow}
                onAccept={() => trade.onRespond(incomingForRow.tradeId, true)}
                onDecline={() => trade.onRespond(incomingForRow.tradeId, false)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface IconBtnProps {
  disabled: boolean;
  onClick(): void;
}

function TradeIconButton({ disabled, onClick }: IconBtnProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={disabled ? 'Trade unavailable' : 'Request trade'}
      className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center transition-transform ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-110 active:scale-95 cursor-pointer'}`}
      style={{
        background:
          'radial-gradient(circle at 30% 30%, #1E2328 0%, #010A13 75%)',
        border: '1.5px solid #C8AA6E',
        boxShadow: disabled ? 'none' : '0 0 8px rgba(200,170,110,0.45)',
      }}
    >
      <SwapIcon />
    </button>
  );
}

function SwapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M4.5 2.5v9M4.5 11.5l-2-2M4.5 11.5l2-2M11.5 13.5v-9M11.5 4.5l-2 2M11.5 4.5l2 2"
        stroke="#C8AA6E"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface BubbleBase {
  trade: TradeRequest;
}

type BubbleProps =
  | (BubbleBase & { kind: 'outgoing'; onCancel(): void })
  | (BubbleBase & { kind: 'incoming'; onAccept(): void; onDecline(): void });

function TradeBubble(props: BubbleProps) {
  const champions = useAppStore((s) => s.champions);
  const offset = useAppStore((s) => s.serverOffsetMs);
  const remaining = useRemainingSeconds(props.trade.expiresAt, offset);
  const offerName = champions[props.trade.offerChampionId]?.name ?? '—';
  const wantName = champions[props.trade.wantChampionId]?.name ?? '—';
  const accent = props.kind === 'incoming' ? '#0AC8B9' : '#C8AA6E';

  return (
    <div
      className="absolute z-10 top-1/2 -translate-y-1/2 fade-up"
      style={{ left: 'calc(100% + 12px)', width: 280 }}
    >
      <AngledPanel
        variant={props.kind === 'incoming' ? 'hex' : 'gold'}
        notch={10}
        inner="linear-gradient(180deg, rgba(10,20,40,0.97) 0%, rgba(1,10,19,0.97) 100%)"
      >
        <div className="px-3.5 py-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[10px] tracking-[0.24em] uppercase"
              style={{ color: accent, fontFamily: "'Marcellus', serif" }}
            >
              {props.kind === 'incoming' ? 'Trade Request' : 'Awaiting Reply'}
            </span>
            <span
              className="numeric text-[11px] tabular-nums"
              style={{ color: accent }}
            >
              {remaining}s
            </span>
          </div>

          <div className="text-[12px] text-parchment leading-snug tracking-[0.04em]">
            {props.kind === 'incoming' ? (
              <>
                Offers <span className="text-gold">{offerName}</span> for your{' '}
                <span className="text-gold">{wantName}</span>
              </>
            ) : (
              <>
                Offering <span className="text-gold">{offerName}</span> for{' '}
                <span className="text-gold">{wantName}</span>
              </>
            )}
          </div>

          <div className="flex gap-2 mt-0.5">
            {props.kind === 'incoming' ? (
              <>
                <BubbleButton variant="accept" onClick={props.onAccept}>
                  Accept
                </BubbleButton>
                <BubbleButton variant="decline" onClick={props.onDecline}>
                  Decline
                </BubbleButton>
              </>
            ) : (
              <BubbleButton variant="decline" onClick={props.onCancel}>
                <span className="inline-flex items-center gap-1.5">
                  <svg width="9" height="9" viewBox="0 0 10 10">
                    <path
                      d="M1 1 L9 9 M9 1 L1 9"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  Cancel
                </span>
              </BubbleButton>
            )}
          </div>
        </div>
      </AngledPanel>
    </div>
  );
}

function BubbleButton({
  variant,
  onClick,
  children,
}: {
  variant: 'accept' | 'decline';
  onClick(): void;
  children: React.ReactNode;
}) {
  const isAccept = variant === 'accept';
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 px-2 py-1.5 text-[11px] tracking-[0.18em] uppercase transition-colors cursor-pointer"
      style={{
        fontFamily: "'Marcellus', serif",
        background: isAccept
          ? 'linear-gradient(180deg, rgba(10,200,185,0.18), rgba(10,200,185,0.04))'
          : 'linear-gradient(180deg, rgba(120,90,40,0.25), rgba(70,55,20,0.05))',
        border: `1px solid ${isAccept ? '#0AC8B9' : '#785A28'}`,
        color: isAccept ? '#0AC8B9' : '#C8AA6E',
        clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
      }}
    >
      {children}
    </button>
  );
}

function useRemainingSeconds(expiresAt: number, offset: number): number {
  const compute = () =>
    Math.ceil(Math.max(0, expiresAt - (Date.now() + offset)) / 1000);
  const [s, setS] = useState(compute);
  useEffect(() => {
    const tick = () => {
      const next = Math.ceil(Math.max(0, expiresAt - (Date.now() + offset)) / 1000);
      setS((prev) => (prev === next ? prev : next));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [expiresAt, offset]);
  return s;
}
