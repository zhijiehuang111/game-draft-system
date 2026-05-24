import { AllyRail } from '../components/AllyRail.js';
import { AngledPanel } from '../components/AngledPanel.js';
import { CornerBracket, Ornament } from '../components/Ornament.js';
import { PhaseHeader } from '../components/PhaseHeader.js';
import { useAppStore } from '../stores/index.js';

export function BenchTradeScreen() {
  const room = useAppStore((s) => s.currentRoom);
  const user = useAppStore((s) => s.user);
  const socket = useAppStore((s) => s.socket);
  const champions = useAppStore((s) => s.champions);
  const outgoing = useAppStore((s) => s.pendingTradeOutgoing);
  const incoming = useAppStore((s) => s.pendingTradeIncoming);

  if (!room || !user) return null;
  const me = room.players.find((p) => p.userId === user.id);
  if (!me) return null;

  const lockedUserIds = new Set<string>();
  for (const t of room.pendingTrades) {
    lockedUserIds.add(t.fromUserId);
    lockedUserIds.add(t.toUserId);
  }

  const meHasPending = lockedUserIds.has(user.id);

  function pickBench(championId: string) {
    if (!socket || meHasPending) return;
    socket.emit('pick:bench', { championId });
  }

  function requestTrade(targetUserId: string) {
    if (!socket || !me?.currentChampion) return;
    const target = room?.players.find((p) => p.userId === targetUserId);
    if (!target?.currentChampion) return;
    socket.emit('trade:request', {
      targetUserId,
      offerChampionId: me.currentChampion,
      wantChampionId: target.currentChampion,
    });
  }

  function respondTrade(tradeId: string, accept: boolean) {
    if (!socket) return;
    socket.emit('trade:respond', { tradeId, accept });
  }

  function cancelTrade(tradeId: string) {
    if (!socket) return;
    socket.emit('trade:cancel', { tradeId });
  }

  const myChamp = me.currentChampion ? champions[me.currentChampion] : null;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-8 pt-6 pb-3">
        <PhaseHeader
          phaseEndsAt={room.phaseEndsAt}
          tone="hex"
        />
      </div>

      <div className="flex-1 grid grid-cols-[280px_1fr_280px] gap-6 px-8 pb-10 min-h-0">
        {/* ============== LEFT — ally rail ============== */}
        <aside className="slide-in-left relative z-30">
          <AllyRail
            players={room.players}
            meUserId={user.id}
            disconnected={room.disconnected}
            trade={{
              canStart: !!me.currentChampion && !meHasPending,
              lockedUserIds,
              outgoing,
              incoming,
              onRequest: requestTrade,
              onRespond: respondTrade,
              onCancel: cancelTrade,
            }}
          />
        </aside>

        {/* ============== CENTER — featured champion ============== */}
        <section className="flex flex-col items-center justify-start gap-6 fade-up pt-4">
          {/* ornate hex showcase */}
          <div className="relative">
            <div
              className="absolute -inset-10 opacity-50 blur-3xl pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle, #0AC8B9 0%, transparent 65%)',
              }}
            />
            {/* rotating hex ring */}
            <div
              className="absolute -inset-6 pointer-events-none"
              style={{
                background:
                  'conic-gradient(from 0deg, transparent, rgba(10, 200, 185,0.35), transparent 35%, transparent 50%, rgba(200, 170, 110,0.35), transparent 85%)',
                clipPath:
                  'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
                animation: 'lol-pulse 4s ease-in-out infinite',
              }}
            />

            <div
              className="relative hex-shape"
              style={{
                width: 240,
                height: 240,
                background:
                  'conic-gradient(from 200deg, #C8AA6E, #F0E6D2 25%, #C8AA6E 50%, #785A28 75%, #C8AA6E)',
                padding: 3,
              }}
            >
              <div
                className="w-full h-full hex-shape overflow-hidden"
                style={{ background: '#0A1428' }}
              >
                {myChamp?.imageUrl ? (
                  <img
                    src={myChamp.imageUrl}
                    alt={myChamp.name}
                    className="w-full h-full object-cover scale-110"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone/60">
                    —
                  </div>
                )}
              </div>
            </div>

          </div>

          <div
            className="text-parchment text-[18px] mt-6"
            style={{
              fontFamily: "'Marcellus', serif",
              letterSpacing: '0.18em',
            }}
          >
            {myChamp?.name ?? 'Not Picked'}
          </div>

          <Ornament width={300} className="mt-2" />
        </section>

        {/* ============== RIGHT — bench ============== */}
        <aside className="slide-in-right">
          <AngledPanel
            variant="bronze"
            className="h-full"
            inner="linear-gradient(180deg, rgba(10, 20, 40,0.85) 0%, rgba(1, 10, 19,0.95) 100%)"
          >
            <div className="p-4 flex flex-col gap-4 h-full">
              <div className="flex items-center gap-2">
                <span className="h-label">Bench</span>
                <span className="flex-1 h-px gold-divider-soft" />
                <span className="h-label numeric text-gold/80">
                  {room.bench.length}
                </span>
              </div>

              {room.bench.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-stone/60 text-[12px] tracking-[0.2em] text-center px-4">
                  No bench<br />champions
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {room.bench.map((id, i) => {
                    const champ = champions[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => pickBench(id)}
                        disabled={meHasPending}
                        className={`group relative transition-transform ${meHasPending ? 'opacity-40 cursor-not-allowed' : 'hover:translate-y-[-2px] cursor-pointer'}`}
                        style={{ animation: `fade-up 0.4s ease-out ${i * 80}ms both` }}
                      >
                        <AngledPanel
                          variant="bronze"
                          notch={10}
                          inner="#010A13"
                          className={meHasPending ? '' : 'group-hover:[&]:!bg-gold'}
                        >
                          <div className="relative aspect-square overflow-hidden">
                            {champ?.imageUrl ? (
                              <img
                                src={champ.imageUrl}
                                alt={champ.name}
                                className={`absolute inset-0 w-full h-full object-cover scale-110 transition-transform duration-300 ${meHasPending ? '' : 'group-hover:scale-125'}`}
                                draggable={false}
                              />
                            ) : (
                              <div className="absolute inset-0 bg-void-2" />
                            )}
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                background:
                                  'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.85))',
                              }}
                            />
                            <div className="absolute top-1 left-1 pointer-events-none">
                              <CornerBracket size={10} color="#C8AA6E" />
                            </div>
                            <div className="absolute bottom-0 inset-x-0 px-2 pb-1.5 pt-3">
                              <div
                                className="text-center text-[11px] truncate"
                                style={{
                                  fontFamily: "'Marcellus', serif",
                                  color: '#F0E6D2',
                                  letterSpacing: '0.08em',
                                }}
                              >
                                {champ?.name ?? id}
                              </div>
                            </div>
                          </div>
                        </AngledPanel>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </AngledPanel>
        </aside>
      </div>
    </div>
  );
}
