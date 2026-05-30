import { useState } from "react";
import { AllyRail } from "../components/AllyRail.js";
import { AngledPanel } from "../components/AngledPanel.js";
import { ChampionAvatar } from "../components/ChampionAvatar.js";
import { CornerFrame, Ornament } from "../components/Ornament.js";
import { PhaseHeader } from "../components/PhaseHeader.js";
import { useAppStore } from "../stores/index.js";

export function InitialPickScreen() {
  const room = useAppStore((s) => s.currentRoom);
  const user = useAppStore((s) => s.user);
  const socket = useAppStore((s) => s.socket);
  const champions = useAppStore((s) => s.champions);
  const [hovered, setHovered] = useState<string | null>(null);

  if (!room || !user) return null;
  const me = room.players.find((p) => p.userId === user.id);
  if (!me) return null;

  function pick(championId: string) {
    if (!socket || !me || me.currentChampion !== null) return;
    socket.emit("pick:initial", { championId });
  }

  const featureId = hovered ?? me.currentChampion ?? me.allocated[0];
  const featureChamp = featureId ? champions[featureId] : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-4 sm:px-6 lg:px-8 pt-5 lg:pt-6 pb-3">
        <PhaseHeader
          title="Choose Your Champion"
          phaseEndsAt={room.phaseEndsAt}
        />
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6 px-4 sm:px-6 lg:px-8 pb-10 min-h-0">
        {/* ============== LEFT — ally rail ============== */}
        <aside className="slide-in-left order-3 lg:order-none">
          <AllyRail
            players={room.players}
            meUserId={user.id}
            disconnected={room.disconnected}
          />
        </aside>

        {/* ============== CENTER — your allocated cards ============== */}
        <section className="flex flex-col items-center justify-start gap-5 fade-up pt-4 order-1 lg:order-none">
          <div
            className="grid grid-cols-2 lg:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))] gap-5 w-full"
            style={
              {
                "--cols": me.allocated.length,
                maxWidth: me.allocated.length === 2 ? 520 : 760,
              } as React.CSSProperties
            }
          >
            {me.allocated.map((id, i) => {
              const picked = me.currentChampion === id;
              const locked = me.currentChampion !== null;
              const disabled = locked && !picked;
              const champ = champions[id];
              const tone = picked ? "hex" : disabled ? "inset" : "gold";
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => pick(id)}
                  onMouseEnter={() => setHovered(id)}
                  onMouseLeave={() => setHovered(null)}
                  disabled={disabled || picked}
                  className={`group relative transition-all duration-200 ${
                    picked
                      ? "translate-y-[-2px]"
                      : disabled
                        ? "opacity-30"
                        : "hover:translate-y-[-3px] cursor-pointer"
                  }`}
                  style={{
                    animation: `fade-up 0.5s ease-out ${i * 120}ms both`,
                  }}
                >
                  <AngledPanel
                    variant={tone}
                    borderWidth={picked ? 2 : 1}
                    inner="#010A13"
                    className={picked ? "glow-hex" : ""}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      {/* portrait stretched as splash */}
                      {champ?.imageUrl ? (
                        <img
                          src={champ.imageUrl}
                          alt={champ.name}
                          className="absolute inset-0 w-full h-full object-cover scale-110 group-hover:scale-[1.18] transition-transform duration-500"
                          style={{
                            filter: picked
                              ? "saturate(1.15)"
                              : "saturate(0.95)",
                          }}
                          draggable={false}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-void-2" />
                      )}

                      {/* sheen */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.85) 100%)",
                        }}
                      />

                      <CornerFrame
                        size={16}
                        inset={8}
                        color={picked ? "#0AC8B9" : "#C8AA6E"}
                      />

                      {/* name banner */}
                      <div className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-6">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="flex-1 h-px gold-divider" />
                          <svg width="6" height="6" viewBox="0 0 6 6">
                            <path d="M3 0 L6 3 L3 6 L0 3 Z" fill="#C8AA6E" />
                          </svg>
                          <span className="flex-1 h-px gold-divider" />
                        </div>
                        <div
                          className="text-center h-display text-[15px]"
                          style={{
                            color: picked ? "#0AC8B9" : "#F0E6D2",
                            letterSpacing: "0.18em",
                          }}
                        >
                          {champ?.name ?? id}
                        </div>
                      </div>

                      {picked && (
                        <div
                          className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] tracking-[0.32em]"
                          style={{
                            background:
                              "linear-gradient(180deg, #0AC8B9 0%, #005A82 100%)",
                            color: "#010A13",
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 700,
                            clipPath:
                              "polygon(8px 0, calc(100% - 8px) 0, 100% 100%, 0 100%)",
                          }}
                        >
                          Selected
                        </div>
                      )}
                    </div>
                  </AngledPanel>
                </button>
              );
            })}
          </div>
        </section>

        {/* ============== RIGHT — champion detail / composition ============== */}
        <aside className="slide-in-right order-2 lg:order-none">
          <AngledPanel
            variant="bronze"
            className="h-full"
            inner="linear-gradient(180deg, rgba(10, 20, 40,0.85) 0%, rgba(1, 10, 19,0.95) 100%)"
          >
            <div className="p-4 flex flex-col gap-4 h-full">
              <div className="flex items-center gap-2">
                <span className="h-label">Champion Details</span>
                <span className="flex-1 h-px gold-divider-soft" />
              </div>

              {featureChamp ? (
                <>
                  <div className="flex justify-center">
                    <ChampionAvatar
                      championId={featureId!}
                      size={120}
                      showName={false}
                      tone="gold"
                      glow
                      ring={3}
                    />
                  </div>
                  <div className="text-center">
                    <div
                      className="h-display text-[18px]"
                      style={{ color: "#F0E6D2", letterSpacing: "0.22em" }}
                    >
                      {featureChamp.name}
                    </div>
                    <div className="numeric text-[11px] text-stone mt-1 tracking-[0.18em]">
                      ID · {featureId}
                    </div>
                  </div>

                  <Ornament width={220} className="self-center" />

                  <div className="space-y-3">
                    <DetailRow label="Class" value="TBD" />
                    <DetailRow label="Difficulty" value="★ ★ ☆" />
                    <DetailRow label="Role" value="—" />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-stone/70 text-[12px] tracking-[0.2em] text-center px-4">
                  Hover a champion card
                  <br />
                  to view details
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-bronze-dark/60">
                <div className="h-label mb-2">Team Status</div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone">Selected</span>
                  <span className="numeric text-gold">
                    {room.players.filter((p) => p.currentChampion).length} /{" "}
                    {room.players.length}
                  </span>
                </div>
              </div>
            </div>
          </AngledPanel>
        </aside>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="h-label text-stone/80">{label}</span>
      <span
        className="text-[12px] text-parchment"
        style={{ fontFamily: "'Marcellus', serif", letterSpacing: "0.1em" }}
      >
        {value}
      </span>
    </div>
  );
}
